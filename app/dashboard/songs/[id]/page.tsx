import '@/app/design-tokens.css';

import { notFound } from 'next/navigation';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import {
  getRelatedSongs,
  getSongLearners,
  getSongUsageStats,
  getViewerSongEntry,
} from '@/lib/services/song-detail-queries';
import { getStudentOptions } from '@/lib/services/lesson-form-data';
import { SongDetail } from '@/components/songs/SongDetail';
import type { Song, SongSection } from '@/components/songs/types';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

const SONG_COLUMNS =
  'id, title, author, level, key, chords, audio_files, gallery_images, cover_image_url, youtube_url, ultimate_guitar_link, spotify_link_url, tiktok_short_url, lyrics_with_chords, short_title, notes, category, capo_fret, strumming_pattern, tempo, time_signature, duration_ms, release_year, search_vector, deleted_at, recording_queued_at, recorded_at, created_at, updated_at';

async function loadSong(songId: string): Promise<Song | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_COLUMNS)
    .eq('id', songId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      logger.error('[song detail page] song fetch error', error);
    }
    return null;
  }
  return data as Song;
}

const SONG_SECTIONS_COLUMNS =
  'id, song_id, section_type, section_number, order_position, chords, lyrics, tab_notation, notes, created_at';

async function loadSongSections(songId: string): Promise<SongSection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('song_sections')
    .select(SONG_SECTIONS_COLUMNS)
    .eq('song_id', songId)
    .order('order_position', { ascending: true });

  if (error) {
    logger.error('[song detail page] song sections fetch error', error);
    return [];
  }
  return data as SongSection[];
}

type PageProps = { params: Promise<{ id: string }> };

export default async function SongDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [song, { isAdmin, isTeacher, isStudent, profileId }] = await Promise.all([
    loadSong(id),
    getUserWithRolesSSR(),
  ]);
  if (!song) {
    notFound();
  }

  const isStaffViewer = isAdmin || isTeacher;

  const [stats, learners, related, viewerEntry, sections, students] = await Promise.all([
    getSongUsageStats(song.id),
    getSongLearners(song.id),
    getRelatedSongs(song.id, song.level ?? null),
    // Staff read the learners list instead; skip the extra round trip for them.
    isStudent ? getViewerSongEntry(song.id) : Promise.resolve(null),
    loadSongSections(song.id),
    // Only staff can quick-assign, so only staff need the roster fetched.
    isStaffViewer ? getStudentOptions(profileId, isAdmin) : Promise.resolve([]),
  ]);

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <SongDetail
        song={song}
        stats={stats}
        learners={learners}
        related={related}
        viewerEntry={viewerEntry}
        sections={sections}
        students={students}
        canPickToLearn={isStudent}
        canSeeProduction={isStaffViewer}
        canEdit={isStaffViewer}
      />
    </div>
  );
}
