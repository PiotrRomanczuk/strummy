import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  hasTechnique,
  songTechniques,
  type SongTechnique,
  type TechniqueKey,
} from '@/lib/music-theory/song-techniques';

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

const isCountMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The techniques a song has, densest first (`song_techniques`, #1206). Null when the song has no row or the
 * fetch fails: the card is an extra and must never take the song page down.
 */
export async function getSongTechniques(songId: string): Promise<SongTechnique[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('song_techniques')
      .select('note_count, techniques')
      .eq('song_id', songId)
      .maybeSingle();
    if (error) throw error;
    if (!data || !isCountMap(data.techniques)) return null;
    return songTechniques(data.techniques, data.note_count);
  } catch (error) {
    logger.warn('[song-techniques] fetch failed', { songId, error });
    return null;
  }
}

/**
 * Ids of the songs that have a technique by the rule in `lib/music-theory/song-techniques.ts`. The rule needs
 * the song's note count next to the mark count, so it is applied here and the list filters by these ids.
 */
export async function getSongIdsWithTechnique(
  supabase: SupabaseLike,
  key: TechniqueKey
): Promise<string[]> {
  const { data, error } = await supabase
    .from('song_techniques')
    .select('song_id, note_count, techniques');
  if (error) throw new Error(`song techniques filter query failed: ${error.message}`);
  return (data ?? [])
    .filter((row) => {
      if (!isCountMap(row.techniques)) return false;
      const count = row.techniques[key];
      return typeof count === 'number' && hasTechnique(count, row.note_count);
    })
    .map((row) => row.song_id);
}
