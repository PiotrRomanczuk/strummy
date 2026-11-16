'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { FILL_FIELDS, fillSuggestionsOf, type FillField } from '@/lib/repertoire-stats/fill';

const FillSchema = z.object({
  songId: z.string().uuid(),
  field: z.enum(FILL_FIELDS as [FillField, ...FillField[]]),
});

export type FillResult = { ok: true; value: string | number } | { ok: false; error: string };

const STATS_PATH = '/dashboard/admin/repertoire-stats';

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

  const change =
    suggestion.field === 'tempo'
      ? { tempo: suggestion.value }
      : suggestion.field === 'key'
        ? { key: suggestion.value }
        : { chords: suggestion.value };
  const { error } = await supabase.from('songs').update(change).eq('id', songId);
  if (error) {
    logger.error('[song-fill] update failed', { songId, field, code: error.code });
    return { ok: false, error: 'save-failed' };
  }
  revalidatePath(STATS_PATH);
  revalidatePath(`/dashboard/songs/${songId}`);
  return { ok: true, value: suggestion.value };
}
