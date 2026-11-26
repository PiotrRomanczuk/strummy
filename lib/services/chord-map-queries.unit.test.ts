/**
 * chord-map-queries: what the reads keep and drop, with the Supabase client
 * replaced by canned rows (the RLS side is covered by the RLS suites).
 */

import { NO_RECORDING_CATEGORIES } from '@/schemas/SongLinkSchema';

import { getChordMapCatalogue, getKnownShapes, getNewShapes } from './chord-map-queries';

type Result = { data: unknown[] | null; error: { message: string; code?: string } | null };

const results = new Map<string, Result>();
const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

/** A chainable query that records its filters and resolves to the table's canned result. */
function query(table: string) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'is', 'neq', 'order', 'range']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ table, method, args });
      return builder;
    };
  }
  builder.then = (resolve: (r: Result) => unknown) =>
    resolve(results.get(table) ?? { data: [], error: null });
  return builder;
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({ from: (table: string) => query(table) })),
}));

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn() } }));

beforeEach(() => {
  results.clear();
  calls.length = 0;
});

describe('getChordMapCatalogue', () => {
  it('keeps songs with a readable chord list and drops non-songs and unreadable fields', async () => {
    const nonSong = Object.values(NO_RECORDING_CATEGORIES)[0];
    results.set('songs', {
      data: [
        {
          id: 's1',
          title: 'Wonderwall',
          author: 'Oasis',
          category: null,
          chords: 'Em7 G Dsus4 A7sus4',
        },
        { id: 's2', title: 'Scale drill', author: null, category: nonSong, chords: 'C G' },
        { id: 's3', title: 'Tab only', author: null, category: null, chords: 'e|--0--|\nB|--0--|' },
        { id: 's4', title: 'Empty', author: null, category: null, chords: null },
      ],
      error: null,
    });

    const songs = await getChordMapCatalogue();

    expect(songs).toEqual([
      { id: 's1', title: 'Wonderwall', author: 'Oasis', shapes: ['Em', 'G', 'D', 'A'] },
    ]);
    expect(calls).toContainEqual({ table: 'songs', method: 'is', args: ['deleted_at', null] });
    expect(calls).toContainEqual({ table: 'songs', method: 'eq', args: ['is_draft', false] });
  });

  it('throws when the read fails', async () => {
    results.set('songs', { data: null, error: { message: 'boom' } });
    await expect(getChordMapCatalogue()).rejects.toThrow('boom');
  });
});

describe('getKnownShapes', () => {
  it('counts a song once when it is both in lessons and in the repertoire', async () => {
    results.set('lesson_songs', {
      data: [
        { song_id: 'a', songs: { chords: 'Am G' } },
        { song_id: 'b', songs: [{ chords: 'C F' }] },
      ],
      error: null,
    });
    results.set('student_repertoire', {
      data: [
        { song_id: 'a', songs: { chords: 'Am G' } },
        { song_id: 'c', songs: { chords: 'D Bm' } },
      ],
      error: null,
    });

    const known = await getKnownShapes('student-1');

    expect(known.songCount).toBe(3);
    expect(known.shapes.sort()).toEqual(['Am', 'Bm', 'C', 'D', 'F', 'G']);
  });

  it('reads repertoire past "to learn" and lessons that are not deleted', async () => {
    await getKnownShapes('student-1');

    expect(calls).toContainEqual({
      table: 'student_repertoire',
      method: 'neq',
      args: ['current_status', 'to_learn'],
    });
    expect(calls).toContainEqual({
      table: 'lesson_songs',
      method: 'is',
      args: ['lessons.deleted_at', null],
    });
  });

  it('skips songs whose chord field is unreadable', async () => {
    results.set('lesson_songs', {
      data: [
        { song_id: 'a', songs: { chords: 'Various' } },
        { song_id: 'b', songs: { chords: 'E A' } },
      ],
      error: null,
    });

    expect(await getKnownShapes('student-1')).toEqual({ shapes: ['E', 'A'], songCount: 1 });
  });

  it('throws instead of reporting no songs when a read fails', async () => {
    results.set('student_repertoire', { data: null, error: { message: 'denied', code: '42501' } });
    await expect(getKnownShapes('student-1')).rejects.toThrow('denied');
  });
});

describe('getNewShapes', () => {
  const song = { id: 'current', chords: 'Am F C G' };

  it('lists the song shapes the student has not played in any other song', async () => {
    results.set('lesson_songs', {
      data: [
        { song_id: 'other', songs: { chords: 'Am G' } },
        // The song itself is on a lesson already: it must not count as known.
        { song_id: 'current', songs: { chords: 'Am F C G' } },
      ],
      error: null,
    });

    expect(await getNewShapes(song, 'student-1')).toEqual(['F', 'C']);
  });

  it('treats every shape as new for a student with no other songs', async () => {
    expect(await getNewShapes(song, 'student-1')).toEqual(['Am', 'F', 'C', 'G']);
  });

  it('is null when the song chord field does not read', async () => {
    expect(await getNewShapes({ id: 'x', chords: 'Various' }, 'student-1')).toBeNull();
    expect(await getNewShapes({ id: 'x', chords: null }, 'student-1')).toBeNull();
  });

  it('is null, not "all new", when the student songs cannot be read', async () => {
    results.set('lesson_songs', { data: null, error: { message: 'timeout' } });
    expect(await getNewShapes(song, 'student-1')).toBeNull();
  });
});
