/**
 * getSongCard: the card is read from two tables; a failure of either must never take the page down.
 */

import { createClient } from '@/lib/supabase/server';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from '@/lib/music-theory/song-card.fixture';

import { getSongCard } from './song-card-queries';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

type Result = { data: unknown; error: unknown };

function clientWith(results: Record<string, Result>) {
  const selected: Record<string, string> = {};
  return {
    selected,
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: (columns: string) => {
          selected[table] = columns;
          return chain;
        },
        eq: () => chain,
        maybeSingle: () => Promise.resolve(results[table] ?? { data: null, error: null }),
      };
      return chain;
    },
  };
}

describe('getSongCard', () => {
  it('reads only the drawn parts of the analysis and builds the card with its parts', async () => {
    const client = clientWith({
      song_analyses: { data: CARD_ANALYSIS_ROW, error: null },
      song_segments: { data: CARD_SEGMENTS_ROW, error: null },
    });
    (createClient as jest.Mock).mockResolvedValue(client);
    const card = await getSongCard('song-1');
    expect(card?.parts).toHaveLength(3);
    expect(client.selected.song_analyses).toContain('grid:analysis->grid');
    expect(client.selected.song_analyses).not.toMatch(/(^|,\s*)analysis(,|$)/);
  });

  it("shows the recording's tempo at the teacher's pulse when the analysis counted double time", async () => {
    const client = clientWith({
      songs: { data: { tempo: 58 }, error: null },
      song_analyses: { data: CARD_ANALYSIS_ROW, error: null },
      song_segments: { data: CARD_SEGMENTS_ROW, error: null },
    });
    (createClient as jest.Mock).mockResolvedValue(client);
    const card = await getSongCard('song-1');
    expect(client.selected.songs).toBe('tempo');
    expect(card?.bpm).toBe(115.38); // the beat grid and backing keep the counted beat
    expect(card?.tempo).toMatchObject({ countedBpm: 115.38, scale: 0.5, checkAgainst: null });
    expect(card?.tempo.bpm).toBeCloseTo(57.69);
  });

  it('uses the felt tempo of a half-time feel heard in the same recording', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({
        song_analyses: { data: CARD_ANALYSIS_ROW, error: null },
        song_segments: {
          data: { ...CARD_SEGMENTS_ROW, feel: 'half_time', felt_bpm: 57.69 },
          error: null,
        },
      })
    );
    expect((await getSongCard('song-1'))?.tempo).toMatchObject({ bpm: 57.69, countedBpm: 115.38 });
  });

  it('keeps the card when the song tempo cannot be read', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({
        songs: { data: null, error: { message: 'boom' } },
        song_analyses: { data: CARD_ANALYSIS_ROW, error: null },
        song_segments: { data: null, error: null },
      })
    );
    expect((await getSongCard('song-1'))?.tempo.bpm).toBe(115.38);
  });

  it('keeps the card without parts when the segments fetch fails', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({
        song_analyses: { data: CARD_ANALYSIS_ROW, error: null },
        song_segments: { data: null, error: { message: 'boom' } },
      })
    );
    expect((await getSongCard('song-1'))?.parts).toEqual([]);
  });

  it('is null when the song has no analysis or the analysis fetch fails', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({
        song_analyses: { data: null, error: null },
        song_segments: { data: null, error: null },
      })
    );
    expect(await getSongCard('song-1')).toBeNull();
    (createClient as jest.Mock).mockResolvedValue(
      clientWith({
        song_analyses: { data: null, error: { message: 'boom' } },
        song_segments: { data: null, error: null },
      })
    );
    expect(await getSongCard('song-1')).toBeNull();
  });
});
