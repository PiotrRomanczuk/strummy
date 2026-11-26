import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { SongExerciseRowSchema, type SongExercise } from '@/schemas/SongExerciseSchema';

const COLUMNS =
  'id, song_id, part_n, name, kind, tempo_percent, source, note, created_at, songs(title, author, deleted_at)';

/** A stored row as the library shows it; null for a row that does not parse or whose song was deleted. */
export function exerciseFromRow(row: unknown): SongExercise | null {
  const parsed = SongExerciseRowSchema.safeParse(row);
  if (!parsed.success) return null;
  const { songs, ...r } = parsed.data;
  const song = Array.isArray(songs) ? (songs[0] ?? null) : songs;
  if (song?.deleted_at) return null;
  return {
    id: r.id,
    songId: r.song_id,
    songTitle: song?.title ?? null,
    songAuthor: song?.author ?? null,
    partN: r.part_n,
    name: r.name,
    kind: r.kind,
    tempoPercent: r.tempo_percent,
    source: r.source,
    note: r.note,
    createdAt: r.created_at,
  };
}

/** The exercises of one song, or of all songs when `songId` is omitted — newest first (staff only — RLS). */
async function listExercises(songId?: string): Promise<SongExercise[]> {
  const supabase = await createClient();
  const query = supabase.from('song_exercises').select(COLUMNS);
  const { data, error } = await (songId ? query.eq('song_id', songId) : query).order('created_at', {
    ascending: false,
  });
  if (error) {
    logger.warn('[song-exercises] fetch failed', { songId, error });
    return [];
  }
  return (data ?? []).flatMap((row) => exerciseFromRow(row) ?? []);
}

/** Every exercise with its song's title and author, newest first. */
export const listSongExercises = (): Promise<SongExercise[]> => listExercises();

/** The exercises of one song, newest first. */
export const listExercisesOfSong = (songId: string): Promise<SongExercise[]> =>
  listExercises(songId);
