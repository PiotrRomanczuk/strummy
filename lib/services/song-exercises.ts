import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { EXERCISES_PAGE_SIZE, type ExerciseListParams } from '@/schemas/ExerciseListParamsSchema';
import { SongExerciseRowSchema, type SongExercise } from '@/schemas/SongExerciseSchema';

/** `songs!inner` + the `deleted_at` filter keep exercises of deleted songs out of the rows and out of the count. */
const COLUMNS =
  'id, song_id, part_n, name, kind, tempo_percent, source, note, created_at, songs!inner(title, author, deleted_at)';

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

/** `ilike` treats `%`, `_` and `\` as patterns; a teacher searching for "50%" means the characters. */
export const nameSearchPattern = (q: string): string => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

/** The rows of one page: Supabase's `range` is inclusive at both ends. */
export const pageRange = (page: number, size = EXERCISES_PAGE_SIZE): [number, number] => [
  (page - 1) * size,
  page * size - 1,
];

export interface ExercisePage {
  exercises: SongExercise[];
  /** Exercises matching the filter across every page — what the pager divides. */
  total: number;
}

/** One page of the library, filtered in the query, newest first (staff only — RLS). */
export async function listSongExercises(params: ExerciseListParams): Promise<ExercisePage> {
  const supabase = await createClient();
  let query = supabase
    .from('song_exercises')
    .select(COLUMNS, { count: 'exact' })
    .is('songs.deleted_at', null);
  if (params.kind) query = query.eq('kind', params.kind);
  if (params.song) query = query.eq('song_id', params.song);
  if (params.q) query = query.ilike('name', nameSearchPattern(params.q));
  const [from, to] = pageRange(params.page);
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to);
  if (error) {
    logger.warn('[song-exercises] page fetch failed', { params, error });
    return { exercises: [], total: 0 };
  }
  return {
    exercises: (data ?? []).flatMap((row) => exerciseFromRow(row) ?? []),
    total: count ?? 0,
  };
}

export interface ExerciseSongOption {
  id: string;
  title: string | null;
}

/** The songs that have at least one exercise, by title — the library's song filter. */
export async function listExerciseSongs(): Promise<ExerciseSongOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, song_exercises!inner(id)')
    .is('deleted_at', null)
    .order('title', { ascending: true });
  if (error) {
    logger.warn('[song-exercises] songs fetch failed', { error });
    return [];
  }
  return (data ?? []).map((song) => ({ id: song.id, title: song.title }));
}

/** The exercises of one song, newest first. One song has a handful, so it needs no pages. */
export async function listExercisesOfSong(songId: string): Promise<SongExercise[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('song_exercises')
    .select(COLUMNS)
    .eq('song_id', songId)
    .is('songs.deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    logger.warn('[song-exercises] fetch failed', { songId, error });
    return [];
  }
  return (data ?? []).flatMap((row) => exerciseFromRow(row) ?? []);
}
