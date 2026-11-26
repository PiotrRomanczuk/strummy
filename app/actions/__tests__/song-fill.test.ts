/**
 * fillSongFromRecording (SNG-14): admin only, the value recomputed from the database, only an empty field written.
 *
 * @see app/actions/song-fill.ts
 */

import { fillSongFromRecording } from '../song-fill';

const mockRevalidatePath = jest.fn();
jest.mock('next/cache', () => ({ revalidatePath: (path: string) => mockRevalidatePath(path) }));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

let mockIsAdmin = true;
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => Promise.resolve({ isAdmin: mockIsAdmin }),
}));

type Row = Record<string, unknown> | null;
let mockSong: Row;
let mockAnalysis: Row;
let mockUpdateError: { code: string } | null;
const mockUpdate = jest.fn();

/** A query builder whose filters chain and whose `maybeSingle` resolves to the table's row. */
function table(name: string) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    maybeSingle: () =>
      Promise.resolve({ data: name === 'songs' ? mockSong : mockAnalysis, error: null }),
    update: (change: unknown) => {
      mockUpdate(change);
      return { eq: () => Promise.resolve({ error: mockUpdateError }) };
    },
  };
  return chain;
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ from: (name: string) => table(name) }),
}));

const SONG_ID = '550e8400-e29b-41d4-a716-446655440000';

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAdmin = true;
  mockUpdateError = null;
  mockSong = { tempo: null, key: null, chords: null, lyrics_with_chords: null, capo_fret: 0 };
  mockAnalysis = { bpm: '86.6', key: 'Ebm', chords: ['Ebm', 'B', 'F#'], key_strength: 0.9 };
});

describe('fillSongFromRecording', () => {
  it('writes the tempo the recording measured and refreshes the pages', async () => {
    await expect(fillSongFromRecording({ songId: SONG_ID, field: 'tempo' })).resolves.toEqual({
      ok: true,
      value: 87,
    });
    expect(mockUpdate).toHaveBeenCalledWith({ tempo: 87 });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/dashboard/songs/${SONG_ID}`);
  });

  it("writes the key in Strummy's spelling and the chords as a list", async () => {
    await fillSongFromRecording({ songId: SONG_ID, field: 'key' });
    expect(mockUpdate).toHaveBeenCalledWith({ key: 'D#m' });
    await fillSongFromRecording({ songId: SONG_ID, field: 'chords' });
    expect(mockUpdate).toHaveBeenCalledWith({ chords: 'Ebm, B, F#' });
  });

  it('refuses anyone but an admin and malformed input, writing nothing', async () => {
    mockIsAdmin = false;
    await expect(fillSongFromRecording({ songId: SONG_ID, field: 'tempo' })).resolves.toEqual({
      ok: false,
      error: 'forbidden',
    });
    mockIsAdmin = true;
    await expect(fillSongFromRecording({ songId: 'nope', field: 'tempo' })).resolves.toEqual({
      ok: false,
      error: 'invalid',
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('writes nothing when the field was filled in the meantime or the analysis is gone', async () => {
    mockSong = { ...mockSong, tempo: 90 };
    await expect(fillSongFromRecording({ songId: SONG_ID, field: 'tempo' })).resolves.toEqual({
      ok: false,
      error: 'nothing-to-fill',
    });
    mockAnalysis = null;
    await expect(fillSongFromRecording({ songId: SONG_ID, field: 'key' })).resolves.toEqual({
      ok: false,
      error: 'not-found',
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('reports a failed update', async () => {
    mockUpdateError = { code: '42501' };
    await expect(fillSongFromRecording({ songId: SONG_ID, field: 'tempo' })).resolves.toEqual({
      ok: false,
      error: 'save-failed',
    });
  });
});
