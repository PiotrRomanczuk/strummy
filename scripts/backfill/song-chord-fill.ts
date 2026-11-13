/** Writes a planned chord fill (song-chord-fill-core.ts) for the song-analysis-sources loader. */
import type { SupabaseClient } from '@supabase/supabase-js';

import { mergeFilledFields } from './song-analyses-core';
import type { ChordFill, ChordFillSong } from './song-chord-fill-core';

/**
 * Writes the fill and records it in the song's `song_analyses.filled_fields`. A song without that row (never
 * analysed by song2logic `analyze`) is not filled: nothing would remember which values a machine wrote.
 */
export async function fillSong(
  client: SupabaseClient,
  song: ChordFillSong,
  fill: ChordFill,
  counts: Record<string, number>,
  isCommit: boolean
) {
  const { data: analysis, error } = await client
    .from('song_analyses')
    .select('filled_fields')
    .eq('song_id', song.id)
    .maybeSingle();
  if (error) throw new Error(`song_analyses ${song.id}: ${error.message}`);
  if (!analysis) {
    counts['fill:skipped-no-analysis'] = (counts['fill:skipped-no-analysis'] ?? 0) + 1;
    return;
  }
  for (const field of Object.keys(fill))
    counts[`fill:${field}`] = (counts[`fill:${field}`] ?? 0) + 1;
  if (!isCommit) return;
  const { error: updateError } = await client.from('songs').update(fill).eq('id', song.id);
  if (updateError) throw new Error(`songs ${song.id}: ${updateError.message}`);
  const filled_fields = mergeFilledFields(analysis.filled_fields, Object.keys(fill));
  const { error: fieldsError } = await client
    .from('song_analyses')
    .update({ filled_fields })
    .eq('song_id', song.id);
  if (fieldsError) throw new Error(`song_analyses ${song.id}: ${fieldsError.message}`);
}
