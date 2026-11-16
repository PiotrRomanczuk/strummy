/**
 * Song suggestions in the database (SNG-15): which songs still need a field asked, saving a batch's proposals and
 * reading the open ones. Takes the Supabase client as an argument, so the admin page (the admin's session) and the
 * nightly script (service role) share it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import {
  needsValue,
  songChange,
  type PendingSuggestion,
  type SuggestField,
  type SuggestSong,
} from '@/lib/song-suggestions/fields';
import type { ParsedSuggestion } from '@/lib/song-suggestions/prompt';

export type { PendingSuggestion };

const SONG_COLUMNS = 'id, title, author, category, level, chords, tempo, key';
const MAX_SONGS = 5000;

type Client = SupabaseClient;

/**
 * The next songs, in id order after `after`, whose field is missing and has no open suggestion — and how many are
 * left after them. The cursor keeps a run moving past songs the model did not recognise.
 */
export async function songsToAsk(
  supabase: Client,
  field: SuggestField,
  after: string | null,
  limit: number
): Promise<{ songs: SuggestSong[]; remaining: number }> {
  const [songs, pending] = await Promise.all([
    supabase.from('songs').select(SONG_COLUMNS).is('deleted_at', null).order('id').limit(MAX_SONGS),
    supabase.from('song_suggestions').select('song_id').eq('field', field).eq('status', 'pending'),
  ]);
  if (songs.error || pending.error) {
    logger.error('[song-suggestions] songs to ask failed', songs.error ?? pending.error);
    return { songs: [], remaining: 0 };
  }
  const open = new Set((pending.data ?? []).map((row) => row.song_id as string));
  const waiting = ((songs.data ?? []) as SuggestSong[]).filter(
    (song) => (!after || song.id > after) && !open.has(song.id) && needsValue(song, field)
  );
  return { songs: waiting.slice(0, limit), remaining: Math.max(0, waiting.length - limit) };
}

/** Saves a batch: a song's previous open proposal for the field is replaced. */
export async function savePending(
  supabase: Client,
  suggestions: (ParsedSuggestion & { source: string })[]
): Promise<number> {
  if (suggestions.length === 0) return 0;
  const field = suggestions[0].field;
  const removed = await supabase
    .from('song_suggestions')
    .delete()
    .eq('field', field)
    .eq('status', 'pending')
    .in(
      'song_id',
      suggestions.map((s) => s.songId)
    );
  if (removed.error)
    logger.error('[song-suggestions] replacing open proposals failed', removed.error);
  const { error } = await supabase.from('song_suggestions').insert(
    suggestions.map((s) => ({
      song_id: s.songId,
      field: s.field,
      value: s.value,
      confidence: s.confidence,
      reason: s.reason,
      source: s.source,
    }))
  );
  if (error) {
    logger.error('[song-suggestions] saving proposals failed', error);
    return 0;
  }
  return suggestions.length;
}

export type Decision = 'accepted' | 'rejected' | 'stale' | 'failed';

const decided = (
  supabase: Client,
  id: string,
  status: Exclude<Decision, 'failed'>,
  by: string | null
) =>
  supabase
    .from('song_suggestions')
    .update({ status, decided_at: new Date().toISOString(), decided_by: by })
    .eq('id', id)
    .eq('status', 'pending');

/**
 * Accepts one open proposal: writes it into the song only if the field still needs it (else the proposal turns
 * stale) and records who decided. Rejecting only records the decision.
 */
export async function decide(
  supabase: Client,
  suggestion: Pick<PendingSuggestion, 'id' | 'songId' | 'field' | 'value'>,
  accept: boolean,
  by: string | null
): Promise<Decision> {
  if (!accept)
    return (await decided(supabase, suggestion.id, 'rejected', by)).error ? 'failed' : 'rejected';
  const { data: song, error } = await supabase
    .from('songs')
    .select(SONG_COLUMNS)
    .eq('id', suggestion.songId)
    .maybeSingle();
  if (error || !song) return 'failed';
  if (!needsValue(song as SuggestSong, suggestion.field)) {
    await decided(supabase, suggestion.id, 'stale', by);
    return 'stale';
  }
  const update = await supabase
    .from('songs')
    .update(songChange(suggestion.field, suggestion.value))
    .eq('id', suggestion.songId);
  if (update.error) {
    logger.error('[song-suggestions] applying a proposal failed', {
      id: suggestion.id,
      code: update.error.code,
    });
    return 'failed';
  }
  return (await decided(supabase, suggestion.id, 'accepted', by)).error ? 'failed' : 'accepted';
}

/** Every open proposal, the most confident first. */
export async function getPendingSuggestions(supabase: Client): Promise<PendingSuggestion[]> {
  const { data, error } = await supabase
    .from('song_suggestions')
    .select('id, song_id, field, value, confidence, reason, source')
    .eq('status', 'pending')
    .order('confidence', { ascending: false });
  if (error) {
    logger.error('[song-suggestions] reading proposals failed', error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    songId: row.song_id as string,
    field: row.field as SuggestField,
    value: row.value as string,
    confidence: Number(row.confidence),
    reason: (row.reason as string | null) ?? null,
    source: row.source as string,
  }));
}
