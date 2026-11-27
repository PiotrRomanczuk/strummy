/**
 * getSongPartProgress: labels come from song_segments, marks from student_song_progress, the rule does the rest.
 */

import { createClient } from '@/lib/supabase/server';

import {
  getSongPartProgress,
  getSongProgressMarks,
  partLabelsFromParts,
} from './song-part-progress';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

type Result = { data: unknown; error: unknown };

function clientWith(results: Record<string, Result>) {
  return {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => Promise.resolve(results[table]),
        maybeSingle: () => Promise.resolve(results[table]),
      };
      return chain;
    },
  };
}

const ROW = (label: string | null, tempo: number, day: number) => ({
  part_label: label,
  tempo_percent: tempo,
  marked_at: `2026-11-0${day}T10:00:00Z`,
});

describe('partLabelsFromParts', () => {
  it('returns distinct labels and tolerates anything that is not a list of parts', () => {
    expect(partLabelsFromParts([{ label: 'A' }, { label: 'B' }, { label: 'A' }])).toEqual([
      'A',
      'B',
    ]);
    expect(partLabelsFromParts(null)).toEqual([]);
    expect(partLabelsFromParts({ label: 'A' })).toEqual([]);
  });
});

describe('getSongPartProgress', () => {
  it('maps the stored rows through the status rule', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({
        song_segments: {
          data: { parts: [{ label: 'A' }, { label: 'B' }, { label: 'A' }] },
          error: null,
        },
        student_song_progress: {
          data: [ROW('A', 100, 2), ROW('B', 100, 1), ROW('A', 60, 1)],
          error: null,
        },
      })
    );
    const result = await getSongPartProgress('student-1', 'song-1');
    expect(result.status).toBe('mastered');
    expect(result.parts).toEqual([
      { label: 'A', tempoPercent: 100, markedAt: '2026-11-02T10:00:00Z' },
      { label: 'B', tempoPercent: 100, markedAt: '2026-11-01T10:00:00Z' },
    ]);
  });

  it('judges the whole song when it has no segments', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({
        song_segments: { data: null, error: null },
        student_song_progress: { data: [ROW(null, 90, 1)], error: null },
      })
    );
    expect((await getSongPartProgress('student-1', 'song-1')).status).toBe('started');
  });

  it('is not_started when the marks cannot be read', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({
        song_segments: { data: null, error: null },
        student_song_progress: { data: null, error: { message: 'boom' } },
      })
    );
    expect(await getSongPartProgress('student-1', 'song-1')).toEqual({
      status: 'not_started',
      parts: [],
    });
  });
});

describe('getSongProgressMarks', () => {
  it('maps every stored row, whole-song marks included', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({ student_song_progress: { data: [ROW(null, 90, 1)], error: null } })
    );
    expect(await getSongProgressMarks('student-1', 'song-1')).toEqual([
      { partLabel: null, tempoPercent: 90, markedAt: '2026-11-01T10:00:00Z' },
    ]);
  });

  it('is empty when the marks cannot be read', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({ student_song_progress: { data: null, error: { message: 'boom' } } })
    );
    expect(await getSongProgressMarks('student-1', 'song-1')).toEqual([]);
  });
});
