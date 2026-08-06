'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { revalidatePath } from 'next/cache';
import { SetSongOfTheWeekSchema } from '@/schemas/SongOfTheWeekSchema';
import { addSongToRepertoireAction } from '@/app/actions/repertoire';
import { createLogger } from '@/lib/logger';
import type { SongOfTheWeekWithSong } from '@/types/SongOfTheWeek';

const log = createLogger('song-of-the-week');

const SOTW_SONG_SELECT = `
  id, song_id, selected_by, teacher_message,
  active_from, active_until, is_active, created_at, updated_at,
  song:songs!inner(
    id, title, author, level, key, chords,
    youtube_url, spotify_link_url, ultimate_guitar_link,
    cover_image_url, strumming_pattern, tempo, capo_fret
  )
`;

export async function getCurrentSongOfTheWeek(): Promise<SongOfTheWeekWithSong | null> {
  const { user } = await getUserWithRolesSSR();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('song_of_the_week')
    .select(SOTW_SONG_SELECT)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    log.error('Failed to fetch current SOTW', { error });
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    song: Array.isArray(data.song) ? data.song[0] : data.song,
  } as SongOfTheWeekWithSong;
}

export async function setSongOfTheWeek(
  input: unknown
): Promise<{ success: true } | { error: string }> {
  const { user, profileId, isAdmin, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  if (!user || !profileId || !isAdmin) {
    return { error: 'Unauthorized — admin access required' };
  }

  const parsed = SetSongOfTheWeekSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Deactivate current SOTW (if any)
  const { error: deactivateError } = await supabase
    .from('song_of_the_week')
    .update({ is_active: false })
    .eq('is_active', true);

  if (deactivateError) {
    log.error('Failed to deactivate current SOTW', { error: deactivateError });
    return { error: 'Failed to update song of the week' };
  }

  // Insert new SOTW
  const { error: insertError } = await supabase
    .from('song_of_the_week')
    .insert({
      song_id: parsed.data.song_id,
      selected_by: profileId,
      teacher_message: parsed.data.teacher_message ?? null,
      active_until: parsed.data.active_until ?? null,
    });

  if (insertError) {
    log.error('Failed to insert new SOTW', { error: insertError });
    return { error: 'Failed to set song of the week' };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deactivateSongOfTheWeek(
  id: string
): Promise<{ success: true } | { error: string }> {
  const { user, isAdmin, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  if (!user || !isAdmin) {
    return { error: 'Unauthorized — admin access required' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('song_of_the_week')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    log.error('Failed to deactivate SOTW', { id, error });
    return { error: 'Failed to remove song of the week' };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function addSotwToRepertoire(): Promise<
  { success: true; id: string } | { error: string }
> {
  const { user, profileId, isStudent, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  if (!user || !profileId || !isStudent) {
    return { error: 'Unauthorized — student access required' };
  }

  const sotw = await getCurrentSongOfTheWeek();
  if (!sotw) {
    return { error: 'No song of the week is currently active' };
  }

  return addSongToRepertoireAction({
    student_id: profileId,
    song_id: sotw.song_id,
  });
}

export async function searchSongsForSotw(
  query: string
): Promise<{ songs: { id: string; title: string; author: string; level: string | null }[] } | { error: string }> {
  const { user, isAdmin } = await getUserWithRolesSSR();
  if (!user || !isAdmin) {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();
  let songQuery = supabase
    .from('songs')
    .select('id, title, author, level')
    .is('deleted_at', null)
    .order('title', { ascending: true })
    .limit(20);

  const safeQuery = query.trim().replace(/[,().%]/g, '');
  if (safeQuery) {
    songQuery = songQuery.or(`title.ilike.%${safeQuery}%,author.ilike.%${safeQuery}%`);
  }

  const { data, error } = await songQuery;

  if (error) {
    log.error('Failed to search songs for SOTW', { query, error });
    return { error: error.message };
  }

  return { songs: data || [] };
}
