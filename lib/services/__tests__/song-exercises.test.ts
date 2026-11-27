import { createClient } from '@/lib/supabase/server';

import {
  exerciseFromRow,
  listExercisesOfSong,
  listSongExercises,
  nameSearchPattern,
  pageRange,
} from '../song-exercises';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

/** A PostgREST builder that records every call and resolves to `result` when awaited. */
function recordingClient(result: { data: unknown; error: unknown; count?: number | null }) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  };
  for (const method of ['from', 'select', 'eq', 'is', 'ilike', 'order', 'range', 'limit']) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  // The client itself must not be thenable, or awaiting createClient() would resolve to the result.
  jest.mocked(createClient).mockResolvedValue({ from: builder.from } as never);
  return calls;
}

describe('listSongExercises', () => {
  it('filters by kind, song and name and asks for one page with the total', async () => {
    const calls = recordingClient({ data: [], error: null, count: 261 });
    const result = await listSongExercises({
      kind: 'riff',
      song: '62a9c235-aed2-4912-a78b-0f079079ac92',
      q: '50%_off',
      page: 3,
    });
    expect(result).toEqual({ exercises: [], total: 261 });
    expect(calls).toEqual(
      expect.arrayContaining([
        ['from', 'song_exercises'],
        ['is', 'songs.deleted_at', null],
        ['eq', 'kind', 'riff'],
        ['eq', 'song_id', '62a9c235-aed2-4912-a78b-0f079079ac92'],
        ['ilike', 'name', '%50\\%\\_off%'],
        ['range', 50, 74],
      ])
    );
    const select = calls.find(([method]) => method === 'select');
    expect(select?.[1]).toContain('songs!inner(');
    expect(select?.[2]).toEqual({ count: 'exact' });
  });

  it('adds no filter it was not given', async () => {
    const calls = recordingClient({ data: [], error: null, count: 0 });
    await listSongExercises({ page: 1 });
    expect(calls.filter(([method]) => method === 'eq' || method === 'ilike')).toEqual([]);
    expect(calls).toContainEqual(['range', 0, 24]);
  });

  it('gives an empty page when the query fails', async () => {
    recordingClient({ data: null, error: { message: 'boom' }, count: null });
    expect(await listSongExercises({ page: 1 })).toEqual({ exercises: [], total: 0 });
  });
});

describe('listExercisesOfSong', () => {
  it('reads the exercises of one song, without those of a deleted song', async () => {
    const calls = recordingClient({ data: [], error: null });
    await listExercisesOfSong('song-1');
    expect(calls).toEqual(
      expect.arrayContaining([
        ['eq', 'song_id', 'song-1'],
        ['is', 'songs.deleted_at', null],
      ])
    );
  });
});

describe('query helpers', () => {
  it('pages 25 at a time, inclusive at both ends', () => {
    expect(pageRange(1)).toEqual([0, 24]);
    expect(pageRange(2)).toEqual([25, 49]);
  });

  it('searches for the characters a teacher typed, not for patterns', () => {
    expect(nameSearchPattern('riff')).toBe('%riff%');
    expect(nameSearchPattern('a\\b')).toBe('%a\\\\b%');
  });
});

const ID = '62a9c235-aed2-4912-a78b-0f079079ac92';
const row = (songs: unknown) => ({
  id: ID,
  song_id: ID,
  part_n: 2,
  name: 'Riff',
  kind: 'riff',
  tempo_percent: 75,
  source: 'recording',
  note: 'slowly',
  created_at: '2026-11-26T10:00:00Z',
  songs,
});

describe('exerciseFromRow', () => {
  it('maps a row with its song', () => {
    expect(
      exerciseFromRow(row({ title: 'Come Together', author: 'The Beatles', deleted_at: null }))
    ).toEqual({
      id: ID,
      songId: ID,
      songTitle: 'Come Together',
      songAuthor: 'The Beatles',
      partN: 2,
      name: 'Riff',
      kind: 'riff',
      tempoPercent: 75,
      source: 'recording',
      note: 'slowly',
      createdAt: '2026-11-26T10:00:00Z',
    });
  });

  it('takes the song out of a one-item array', () => {
    const song = { title: 'A', author: null, deleted_at: null };
    expect(exerciseFromRow(row([song]))?.songTitle).toBe('A');
  });

  it('drops an exercise of a deleted song and a row that does not parse', () => {
    expect(exerciseFromRow(row({ title: 'A', author: null, deleted_at: '2026-11-01' }))).toBeNull();
    expect(exerciseFromRow({ id: 1 })).toBeNull();
  });
});
