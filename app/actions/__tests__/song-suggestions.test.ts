/**
 * decideSuggestion / acceptConfidentSuggestions (SNG-15): admin only, an open proposal only, the bulk accept
 * limited to confident proposals.
 *
 * @see app/actions/song-suggestions.ts
 */

import { acceptConfidentSuggestions, decideSuggestion } from '../song-suggestions';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

let mockIsAdmin = true;
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => Promise.resolve({ isAdmin: mockIsAdmin, profileId: 'admin-1' }),
}));

let mockRow: Record<string, unknown> | null;
jest.mock('@/lib/supabase/server', () => {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = () => Promise.resolve({ data: mockRow, error: null });
  return { createClient: () => Promise.resolve({ from: () => chain }) };
});

const mockDecide = jest.fn();
const mockPending = jest.fn();
jest.mock('@/lib/services/song-suggestions', () => ({
  decide: (...args: unknown[]) => mockDecide(...args),
  getPendingSuggestions: () => mockPending(),
}));

const ID = '550e8400-e29b-41d4-a716-446655440000';

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAdmin = true;
  mockRow = { id: ID, song_id: 'song-1', field: 'category', value: 'Rock' };
  mockDecide.mockResolvedValue('accepted');
});

describe('decideSuggestion', () => {
  it('accepts an open proposal on behalf of the admin', async () => {
    await expect(decideSuggestion({ id: ID, accept: true })).resolves.toEqual({
      ok: true,
      decision: 'accepted',
    });
    expect(mockDecide).toHaveBeenCalledWith(
      expect.anything(),
      { id: ID, songId: 'song-1', field: 'category', value: 'Rock' },
      true,
      'admin-1'
    );
  });

  it('refuses non-admins, malformed ids and closed proposals', async () => {
    mockIsAdmin = false;
    await expect(decideSuggestion({ id: ID, accept: true })).resolves.toEqual({
      ok: false,
      error: 'forbidden',
    });
    mockIsAdmin = true;
    await expect(decideSuggestion({ id: 'x', accept: true })).resolves.toEqual({
      ok: false,
      error: 'invalid',
    });
    mockRow = null;
    await expect(decideSuggestion({ id: ID, accept: false })).resolves.toEqual({
      ok: false,
      error: 'not-found',
    });
    expect(mockDecide).not.toHaveBeenCalled();
  });

  it('reports a failed write', async () => {
    mockDecide.mockResolvedValue('failed');
    await expect(decideSuggestion({ id: ID, accept: true })).resolves.toEqual({
      ok: false,
      error: 'save-failed',
    });
  });
});

describe('acceptConfidentSuggestions', () => {
  it('accepts only the proposals at or above the confidence and counts the outcomes', async () => {
    mockPending.mockResolvedValue([
      { id: 'a', confidence: 0.95 },
      { id: 'b', confidence: 0.8 },
      { id: 'c', confidence: 0.79 },
    ]);
    mockDecide.mockResolvedValueOnce('accepted').mockResolvedValueOnce('stale');
    await expect(acceptConfidentSuggestions({ minConfidence: 0.8 })).resolves.toEqual({
      ok: true,
      accepted: 1,
      stale: 1,
      failed: 0,
    });
    expect(mockDecide).toHaveBeenCalledTimes(2);
  });

  it('refuses a confidence below one half and non-admins', async () => {
    await expect(acceptConfidentSuggestions({ minConfidence: 0.2 })).resolves.toEqual({
      ok: false,
      error: 'invalid',
    });
    mockIsAdmin = false;
    await expect(acceptConfidentSuggestions({ minConfidence: 0.8 })).resolves.toEqual({
      ok: false,
      error: 'forbidden',
    });
  });
});
