/**
 * The technique filter picks song ids by the rule in lib/music-theory/song-techniques.ts and must read every
 * row of `song_techniques`: PostgREST stops an unranged select at 1000 rows.
 */
import { getSongIdsWithTechnique, getSongTechniques } from './song-techniques-queries';

const mockSingle = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockSingle }) }) }),
  })),
}));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn() } }));

type Row = { song_id: string; note_count: number; techniques: unknown };

/** A client whose `song_techniques` select answers page by page from `pages`. */
function client(pages: Array<{ data: Row[] | null; error: { message: string } | null }>) {
  const ranges: Array<[number, number]> = [];
  const supabase = {
    from: () => ({
      select: () => ({
        order: () => ({
          range: async (from: number, to: number) => {
            ranges.push([from, to]);
            return pages[ranges.length - 1] ?? { data: [], error: null };
          },
        }),
      }),
    }),
  };
  return { supabase: supabase as never, ranges };
}

const row = (song_id: string, techniques: unknown, note_count = 1000): Row => ({
  song_id,
  note_count,
  techniques,
});

describe('getSongIdsWithTechnique', () => {
  it('keeps the songs that have the technique by the rule', async () => {
    const { supabase } = client([
      {
        data: [
          row('dense', { slide: 40 }),
          row('many-marks-in-a-long-song', { slide: 25 }, 10_000),
          row('a-few-marks', { slide: 7 }),
          row('thin-in-a-long-song', { slide: 9 }, 5000),
          row('other-technique', { bend: 80 }),
          row('not-a-number', { slide: 'lots' }),
          row('not-an-object', [40]),
        ],
        error: null,
      },
    ]);

    expect(await getSongIdsWithTechnique(supabase, 'slide')).toEqual([
      'dense',
      'many-marks-in-a-long-song',
    ]);
  });

  it('reads past the 1000-row page', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row(`a${i}`, { bend: 30 }));
    const { supabase, ranges } = client([
      { data: full, error: null },
      { data: [row('last', { bend: 30 })], error: null },
    ]);

    const ids = await getSongIdsWithTechnique(supabase, 'bend');

    expect(ids).toHaveLength(1001);
    expect(ids.at(-1)).toBe('last');
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('returns nothing for an empty table and fails loudly on a query error', async () => {
    expect(
      await getSongIdsWithTechnique(client([{ data: null, error: null }]).supabase, 'slide')
    ).toEqual([]);
    await expect(
      getSongIdsWithTechnique(
        client([{ data: null, error: { message: 'boom' } }]).supabase,
        'slide'
      )
    ).rejects.toThrow('song techniques filter query failed: boom');
  });
});

describe('getSongTechniques', () => {
  it('returns the techniques of a song, densest first', async () => {
    mockSingle.mockResolvedValue({
      data: { note_count: 1000, techniques: { slide: 20, bend: 200 } },
      error: null,
    });

    const techniques = await getSongTechniques('song-1');

    expect(techniques?.map((t) => t.key)).toEqual(['bend', 'slide']);
  });

  it.each([
    ['the song has no row', { data: null, error: null }],
    [
      'the stored value is not an object',
      { data: { note_count: 10, techniques: [] }, error: null },
    ],
    ['the query fails', { data: null, error: { message: 'boom' } }],
  ])('returns null when %s', async (_case, result) => {
    mockSingle.mockResolvedValue(result);

    expect(await getSongTechniques('song-1')).toBeNull();
  });
});
