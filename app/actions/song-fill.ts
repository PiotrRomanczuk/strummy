'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import {
  FILL_FIELDS,
  fillSuggestionsOf,
  type FillField,
  type FillSuggestion,
} from '@/lib/repertoire-stats/fill';
import { getSongQualityReport } from '@/lib/services/data-quality-queries';

const FillSchema = z.object({
  songId: z.string().uuid(),
  field: z.enum(FILL_FIELDS as [FillField, ...FillField[]]),
});

export type FillResult = { ok: true; value: string | number } | { ok: false; error: string };
export type FillAllResult =
  { ok: true; filled: number; failed: number } | { ok: false; error: string };

const STATS_PATH = '/dashboard/admin/repertoire-stats';

/** The `songs` update for one suggestion. */
const changeOf = (suggestion: FillSuggestion) =>
  suggestion.field === 'tempo'
    ? { tempo: suggestion.value }
    : suggestion.field === 'key'
      ? { key: suggestion.value }
      : { chords: suggestion.value };

const numberOrNull = (value: unknown) => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

/**
 * Writes one value the recording knows into a song's empty field (SNG-14). The suggestion is computed again from
 * the database, never taken from the client, and only an empty field is filled: if someone typed a value since the
 * page loaded, nothing is written.
 */
export async function fillSongFromRecording(input: {
  songId: string;
  field: FillField;
}): Promise<FillResult> {
  const parsed = FillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { isAdmin } = await getUserWithRolesSSR();
  if (!isAdmin) return { ok: false, error: 'forbidden' };

  const { songId, field } = parsed.data;
  const supabase = await createClient();
  const [song, analysis] = await Promise.all([
    supabase
      .from('songs')
      .select('tempo, key, chords, lyrics_with_chords, capo_fret')
      .eq('id', songId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('song_analyses')
      .select('bpm, key, chords, key_strength:analysis->key->strength')
      .eq('song_id', songId)
      .maybeSingle(),
  ]);
  if (song.error || analysis.error || !song.data || !analysis.data) {
    return { ok: false, error: 'not-found' };
  }
  const measured = {
    bpm: numberOrNull(analysis.data.bpm),
    key: analysis.data.key,
    keyStrength: numberOrNull(analysis.data.key_strength),
    chords: analysis.data.chords ?? [],
  };
  const suggestion = fillSuggestionsOf(song.data, measured).find((s) => s.field === field);
  if (!suggestion) return { ok: false, error: 'nothing-to-fill' };

  const { error } = await supabase.from('songs').update(changeOf(suggestion)).eq('id', songId);
  if (error) {
    logger.error('[song-fill] update failed', { songId, field, code: error.code });
    return { ok: false, error: 'save-failed' };
  }
  revalidatePath(STATS_PATH);
  revalidatePath(`/dashboard/songs/${songId}`);
  return { ok: true, value: suggestion.value };
}

/**
 * Writes every value the recordings can fill (SNG-14) — the same proposals the page shows, computed again from the
 * database now, each into a field that is empty at this moment. Admin only.
 */
export async function fillAllFromRecording(): Promise<FillAllResult> {
  const { isAdmin } = await getUserWithRolesSSR();
  if (!isAdmin) return { ok: false, error: 'forbidden' };
  const [{ suggestions }, supabase] = await Promise.all([getSongQualityReport(), createClient()]);
  let filled = 0;
  let failed = 0;
  for (const [songId, list] of suggestions) {
    if (list.length === 0) continue;
    const { error } = await supabase
      .from('songs')
      .update(Object.assign({}, ...list.map(changeOf)))
      .eq('id', songId);
    if (error) {
      logger.error('[song-fill] bulk update failed', { songId, code: error.code });
      failed += 1;
    } else filled += list.length;
  }
  revalidatePath(STATS_PATH);
  return { ok: true, filled, failed };
}
