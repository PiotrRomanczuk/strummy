'use server';

import { revalidatePath } from 'next/cache';

import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import {
  NO_RECORDING_CATEGORIES,
  SongNoRecordingSchema,
  SongYoutubeLinkSchema,
  type NoRecordingKind,
} from '@/schemas/SongLinkSchema';

export interface SongMissingLink {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  duration_ms: number | null;
  spotify_link_url: string | null;
}

export interface SongLinkResult {
  success: boolean;
  /** A `Songs` message key, so the row can show it in the viewer's language. */
  error?: 'invalidYoutubeLink' | 'linkNotAllowed' | 'linkSaveFailed';
}

const QUEUE_PATH = '/dashboard/songs/links';

/** Songs with no YouTube link that are expected to have one (exercises and "other" entries are left out). */
export async function getSongsMissingLink(): Promise<{ songs: SongMissingLink[]; error?: string }> {
  const { isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!isAdmin && !isTeacher) return { songs: [], error: 'Not allowed' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, author, category, duration_ms, spotify_link_url, youtube_url')
    .is('deleted_at', null)
    .or('youtube_url.is.null,youtube_url.eq.')
    .order('title', { ascending: true });
  if (error) {
    logger.error('[getSongsMissingLink] Error:', error);
    return { songs: [], error: 'Failed to load songs' };
  }
  const withoutRecording = new Set<string>(Object.values(NO_RECORDING_CATEGORIES));
  return { songs: data.filter((song) => !withoutRecording.has(song.category ?? '')) };
}

async function updateSong(songId: string, values: { youtube_url: string } | { category: string }) {
  const { user, isAdmin, isTeacher, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard || !user || (!isAdmin && !isTeacher))
    return { success: false, error: 'linkNotAllowed' } as const;

  const supabase = await createClient();
  const { data, error } = await supabase.from('songs').update(values).eq('id', songId).select('id');
  if (error || data.length === 0) {
    logger.error('[song-links] Update failed', { songId, error });
    return { success: false, error: 'linkSaveFailed' } as const;
  }
  revalidatePath(QUEUE_PATH);
  revalidatePath('/dashboard/songs');
  return { success: true } as const;
}

/** Attach the recording to the song. */
export async function saveSongYoutubeLink(songId: string, url: string): Promise<SongLinkResult> {
  const parsed = SongYoutubeLinkSchema.safeParse({ songId, url });
  if (!parsed.success) return { success: false, error: 'invalidYoutubeLink' };
  return updateSong(parsed.data.songId, { youtube_url: parsed.data.url });
}

/** File the entry under "exercises" or "other": it has no recording and leaves the queue. */
export async function markSongWithoutRecording(
  songId: string,
  kind: NoRecordingKind
): Promise<SongLinkResult> {
  const parsed = SongNoRecordingSchema.safeParse({ songId, kind });
  if (!parsed.success) return { success: false, error: 'linkSaveFailed' };
  return updateSong(parsed.data.songId, { category: NO_RECORDING_CATEGORIES[parsed.data.kind] });
}
