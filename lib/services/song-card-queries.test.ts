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
        maybeSingle: () => Promise.resolve(results[table]),
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
