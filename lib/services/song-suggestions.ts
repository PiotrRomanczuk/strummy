/**
 * Song suggestions in the database (SNG-15): which songs still need a field asked, saving a batch's proposals and
 * reading the open ones. Takes the Supabase client as an argument, so the admin page (the admin's session) and the
 * nightly script (service role) share it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import {
  needsValue,
  type PendingSuggestion,
  type SuggestField,
  type SuggestSong,
} from '@/lib/song-suggestions/fields';
import type { ParsedSuggestion } from '@/lib/song-suggestions/prompt';

import { fetchPaged } from './paged-rows';

export { decide, type Decision } from './song-suggestion-decide';
export type { PendingSuggestion };

const SONG_COLUMNS = 'id, title, author, category, level, chords, tempo, key';

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
  // PostgREST answers at most 1000 rows, so both reads page through the table in a stable order.
  const [songs, pending] = await Promise.all([
    fetchPaged<SuggestSong>((from, to) =>
      supabase.from('songs').select(SONG_COLUMNS).is('deleted_at', null).order('id').range(from, to)
    ),
    fetchPaged<{ song_id: string }>((from, to) =>
      supabase
        .from('song_suggestions')
        .select('song_id')
        .eq('field', field)
        .eq('status', 'pending')
        .order('id')
        .range(from, to)
    ),
  ]);
  if (songs.error || pending.error) {
    logger.error('[song-suggestions] songs to ask failed', songs.error ?? pending.error);
    return { songs: [], remaining: 0 };
  }
  const open = new Set(pending.rows.map((row) => row.song_id));
  const waiting = songs.rows.filter(
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

/** Every open proposal, the most confident first (paged: PostgREST answers at most 1000 rows). */
export async function getPendingSuggestions(supabase: Client): Promise<PendingSuggestion[]> {
  const { rows, error } = await fetchPaged<Record<string, unknown>>((from, to) =>
    supabase
      .from('song_suggestions')
      .select('id, song_id, field, value, confidence, reason, source')
      .eq('status', 'pending')
      .order('confidence', { ascending: false })
      .order('id')
      .range(from, to)
  );
  if (error) {
    logger.error('[song-suggestions] reading proposals failed', error);
    return [];
  }
  return rows.map((row) => ({
    id: row.id as string,
    songId: row.song_id as string,
    field: row.field as SuggestField,
    value: row.value as string,
    confidence: Number(row.confidence),
    reason: (row.reason as string | null) ?? null,
    source: row.source as string,
  }));
}
