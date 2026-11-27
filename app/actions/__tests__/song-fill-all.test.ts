/**
 * fillAllFromRecording (SNG-14): admin only, one update per song with its fields combined, failed writes counted.
 *
 * @see app/actions/song-fill.ts
 */

import { fillAllFromRecording } from '../song-fill';

const mockRevalidatePath = jest.fn();
jest.mock('next/cache', () => ({ revalidatePath: (path: string) => mockRevalidatePath(path) }));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

let mockIsAdmin = true;
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => Promise.resolve({ isAdmin: mockIsAdmin }),
}));

let mockSuggestions: Map<string, unknown[]>;
jest.mock('@/lib/services/data-quality-queries', () => ({
  getSongQualityReport: () => Promise.resolve({ suggestions: mockSuggestions }),
}));

const mockUpdate = jest.fn();
let mockFailingSongs: string[];
jest.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      from: () => ({
        update: (change: unknown) => ({
          eq: (_column: string, songId: string) => {
            mockUpdate(songId, change);
            return Promise.resolve({
              error: mockFailingSongs.includes(songId) ? { code: '42501' } : null,
            });
          },
        }),
      }),
    }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAdmin = true;
  mockFailingSongs = [];
  mockSuggestions = new Map<string, unknown[]>([
    [
      'song-1',
      [
        { field: 'tempo', value: 87 },
        { field: 'key', value: 'D#m' },
      ],
    ],
    ['song-2', [{ field: 'chords', value: 'Am, F, C, G' }]],
    ['song-3', []],
  ]);
});

describe('fillAllFromRecording', () => {
  it('refuses anyone but an admin and writes nothing', async () => {
    mockIsAdmin = false;
    await expect(fillAllFromRecording()).resolves.toEqual({ ok: false, error: 'forbidden' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('writes one update per song with its fields combined and skips songs with nothing to fill', async () => {
    await expect(fillAllFromRecording()).resolves.toEqual({ ok: true, filled: 3, failed: 0 });
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledWith('song-1', { tempo: 87, key: 'D#m' });
    expect(mockUpdate).toHaveBeenCalledWith('song-2', { chords: 'Am, F, C, G' });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/admin/repertoire-stats');
  });

  it('counts a failed write per song and keeps going', async () => {
    mockFailingSongs = ['song-1'];
    await expect(fillAllFromRecording()).resolves.toEqual({ ok: true, filled: 1, failed: 1 });
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });
});
