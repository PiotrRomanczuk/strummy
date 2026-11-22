/**
 * Reads behind the chord map. Both run under the caller's RLS: every signed-in
 * user may read active songs; a student reads their own lessons and repertoire,
 * a teacher those of their students.
 */

import { logger } from '@/lib/logger';
import { chordShapes, type ChordShape } from '@/lib/music-theory/chord-shape';
import { createClient } from '@/lib/supabase/server';
import { NO_RECORDING_CATEGORIES } from '@/schemas/SongLinkSchema';

import type { ChordMapSong } from './chord-map';
import { fetchAllRows } from './songs-list-queries';

type SongChords = { chords: string | null };

/** What the student has worked on: the shapes, and from how many songs they came. */
export type KnownShapes = { shapes: ChordShape[]; songCount: number };

const NOT_SONGS = new Set<string>(Object.values(NO_RECORDING_CATEGORIES));

/** Every active, published song whose chord field reads as a chord list. */
export async function getChordMapCatalogue(): Promise<ChordMapSong[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<{
    id: string;
    title: string;
    author: string | null;
    category: string | null;
    chords: string | null;
  }>(
    (from, to) =>
      supabase
        .from('songs')
        .select('id, title, author, category, chords')
        .is('deleted_at', null)
        .eq('is_draft', false)
        .order('title')
        .range(from, to),
    '[chord-map] catalogue'
  );
  return rows.flatMap((row) => {
    const shapes = NOT_SONGS.has(row.category ?? '') ? null : chordShapes(row.chords);
    return shapes ? [{ id: row.id, title: row.title, author: row.author, shapes }] : [];
  });
}

const oneSong = (songs: SongChords | SongChords[] | null): SongChords | null =>
  Array.isArray(songs) ? (songs[0] ?? null) : songs;

/**
 * Shapes of the songs this student has had in lessons (any status: a song that
 * came up in a lesson was played) and of repertoire songs past "to learn".
 */
export async function getKnownShapes(studentId: string): Promise<KnownShapes> {
  const supabase = await createClient();
  const [lessonSongs, repertoire] = await Promise.all([
    supabase
      .from('lesson_songs')
      .select('song_id, songs(chords), lessons!inner(student_id, deleted_at)')
      .eq('lessons.student_id', studentId)
      .is('lessons.deleted_at', null),
    supabase
      .from('student_repertoire')
      .select('song_id, songs:song_id(chords)')
      .eq('student_id', studentId)
      .neq('current_status', 'to_learn'),
  ]);
  for (const { error } of [lessonSongs, repertoire]) {
    if (error) logger.warn('[chord-map] known shapes', { error: error.message, code: error.code });
  }

  const chordsBySong = new Map<string, string | null>();
  for (const row of [...(lessonSongs.data ?? []), ...(repertoire.data ?? [])]) {
    chordsBySong.set(row.song_id, oneSong(row.songs)?.chords ?? null);
  }
  const shapes = new Set<ChordShape>();
  let songCount = 0;
  for (const chords of chordsBySong.values()) {
    const songShapes = chordShapes(chords);
    if (!songShapes) continue;
    songCount += 1;
    songShapes.forEach((shape) => shapes.add(shape));
  }
  return { shapes: [...shapes], songCount };
}
