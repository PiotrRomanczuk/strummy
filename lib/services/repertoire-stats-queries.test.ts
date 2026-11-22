/**
 * getRepertoireSongs: a failing query must fail the whole load, never return partial statistics.
 */

import { createClient } from '@/lib/supabase/server';

import { getRepertoireSongs } from './repertoire-stats-queries';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('react', () => ({ ...jest.requireActual('react'), cache: <T>(fn: T) => fn }));

type Result = { data: unknown[] | null; error: unknown };

function clientWith(results: Record<string, Result>) {
  return {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        is: () => chain,
        order: () => chain,
        range: () => Promise.resolve(results[table]),
      };
      return chain;
    },
  };
}

const OK: Result = { data: [], error: null };

describe('getRepertoireSongs', () => {
  it('returns the songs when every query succeeds', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({
        songs: OK,
        song_analyses: OK,
        song_transcriptions: OK,
        student_repertoire: OK,
      })
    );
    await expect(getRepertoireSongs()).resolves.toEqual([]);
  });

  it.each(['songs', 'song_analyses', 'song_transcriptions', 'student_repertoire'])(
    'throws when the %s query fails',
    async (failing) => {
      (createClient as jest.Mock).mockResolvedValue(
        clientWith({
          songs: OK,
          song_analyses: OK,
          song_transcriptions: OK,
          student_repertoire: OK,
          [failing]: { data: null, error: { message: 'boom' } },
        })
      );
      await expect(getRepertoireSongs()).rejects.toThrow(failing);
    }
  );
});
