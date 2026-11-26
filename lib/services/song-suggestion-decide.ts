/** Deciding one open song proposal (SNG-15): claim it first, then write the song, so two sessions never both apply it. */

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import {
  needsValue,
  songChange,
  type PendingSuggestion,
  type SuggestSong,
} from '@/lib/song-suggestions/fields';

export type Decision = 'accepted' | 'rejected' | 'stale' | 'failed';

type Client = SupabaseClient;
type Closing = Exclude<Decision, 'failed'>;

const SONG_COLUMNS = 'id, title, author, category, level, chords, tempo, key';

/**
 * Closes a still-open proposal. 'claimed' = this call closed it; 'gone' = another session already did (no row was
 * open any more); 'error' = the write failed.
 */
async function close(
  supabase: Client,
  id: string,
  status: Closing,
  by: string | null
): Promise<'claimed' | 'gone' | 'error'> {
  const { data, error } = await supabase
    .from('song_suggestions')
    .update({ status, decided_at: new Date().toISOString(), decided_by: by })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id');
  if (error) {
    logger.error('[song-suggestions] closing a proposal failed', { id, code: error.code });
    return 'error';
  }
  return (data ?? []).length === 1 ? 'claimed' : 'gone';
}

/** Gives a claimed proposal back to the queue after its song write failed. */
async function reopen(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase
    .from('song_suggestions')
    .update({ status: 'pending', decided_at: null, decided_by: null })
    .eq('id', id);
  if (error)
    logger.error('[song-suggestions] reopening a proposal failed', { id, code: error.code });
}

/**
 * Accepts one open proposal: writes it into the song only if the field still needs it (else the proposal turns
 * stale) and records who decided. Rejecting only records the decision. The proposal is claimed (pending → accepted)
 * before the song is written, so a second session cannot apply it again; a failed song write gives it back.
 */
export async function decide(
  supabase: Client,
  suggestion: Pick<PendingSuggestion, 'id' | 'songId' | 'field' | 'value'>,
  accept: boolean,
  by: string | null
): Promise<Decision> {
  if (!accept) return outcome(await close(supabase, suggestion.id, 'rejected', by), 'rejected');
  const { data: song, error } = await supabase
    .from('songs')
    .select(SONG_COLUMNS)
    .eq('id', suggestion.songId)
    .maybeSingle();
  if (error || !song) return 'failed';
  if (!needsValue(song as SuggestSong, suggestion.field))
    return outcome(await close(supabase, suggestion.id, 'stale', by), 'stale');
  const claim = await close(supabase, suggestion.id, 'accepted', by);
  if (claim !== 'claimed') return outcome(claim, 'accepted');
  const update = await supabase
    .from('songs')
    .update(songChange(suggestion.field, suggestion.value))
    .eq('id', suggestion.songId);
  if (!update.error) return 'accepted';
  logger.error('[song-suggestions] applying a proposal failed', {
    id: suggestion.id,
    code: update.error.code,
  });
  await reopen(supabase, suggestion.id);
  return 'failed';
}

/** Another session closing the proposal first is not an error: nothing is left to apply. */
const outcome = (result: 'claimed' | 'gone' | 'error', done: Closing): Decision =>
  result === 'error' ? 'failed' : result === 'gone' ? 'stale' : done;
