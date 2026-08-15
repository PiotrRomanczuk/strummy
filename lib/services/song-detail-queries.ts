import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { canStudentRemove } from './repertoire.helpers';

export type SongProgressStatus = 'to_learn' | 'started' | 'remembered' | 'with_author' | 'mastered';

export type SongUsageStats = {
  assignedTo: number;
  usedInLessons: number;
  inLibrarySince: string | null;
  avgMastery: number;
};

export type SongLearner = {
  studentId: string;
  fullName: string | null;
  email: string | null;
  status: SongProgressStatus;
  totalPracticeMinutes: number;
  lastPracticedAt: string | null;
};

export type RelatedSongRow = {
  id: string;
  title: string;
  author: string | null;
  songKey: string | null;
};

/** The signed-in student's own entry for a song, or null if they have none. */
export type ViewerSongEntry = {
  status: SongProgressStatus;
  totalPracticeMinutes: number;
  addedByStudent: boolean;
  /** Mirrors `remove_song_from_my_repertoire`'s predicate. */
  isRemovable: boolean;
};

export const STATUS_MASTERY: Record<SongProgressStatus, number> = {
  to_learn: 0,
  started: 25,
  remembered: 50,
  with_author: 75,
  mastered: 100,
};

export type SongLearnerSummary = { count: number; avgMastery: number };

/**
 * Learner count + average mastery per song, for a whole list page in one
 * query rather than one per row (mirrors `getViewerRepertoireSongIds`).
 * Excludes `to_learn` rows from the count, matching `getSongLearners`'
 * "currently learning" definition — a song only "wanted" isn't being learned.
 */
export async function getSongsLearnerSummaries(
  songIds: string[]
): Promise<Record<string, SongLearnerSummary>> {
  if (songIds.length === 0) return {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('student_repertoire')
    .select('song_id, current_status')
    .in('song_id', songIds)
    .neq('current_status', 'to_learn');

  if (error) {
    logger.warn('[song-detail-queries] learner summaries error', {
      error: error.message,
      code: error.code,
    });
    return {};
  }

  const bySong = new Map<string, number[]>();
  for (const row of data ?? []) {
    const songId = row.song_id as string;
    const mastery = STATUS_MASTERY[row.current_status as SongProgressStatus];
    const list = bySong.get(songId);
    if (list) list.push(mastery);
    else bySong.set(songId, [mastery]);
  }

  const summaries: Record<string, SongLearnerSummary> = {};
  for (const [songId, masteryValues] of bySong) {
    const avgMastery = Math.round(
      masteryValues.reduce((sum, m) => sum + m, 0) / masteryValues.length
    );
    summaries[songId] = { count: masteryValues.length, avgMastery };
  }
  return summaries;
}

export async function getSongUsageStats(songId: string): Promise<SongUsageStats> {
  const supabase = await createClient();

  const [repertoireResult, lessonsResult, songResult] = await Promise.all([
    supabase.from('student_repertoire').select('current_status').eq('song_id', songId),
    supabase
      .from('lesson_songs')
      .select('id', { count: 'exact', head: true })
      .eq('song_id', songId),
    supabase.from('songs').select('created_at').eq('id', songId).single(),
  ]);

  if (repertoireResult.error) {
    logger.warn('[song-detail-queries] usage stats — repertoire error', {
      error: repertoireResult.error.message,
      code: repertoireResult.error.code,
    });
  }
  if (lessonsResult.error) {
    logger.warn('[song-detail-queries] usage stats — lessons error', {
      error: lessonsResult.error.message,
      code: lessonsResult.error.code,
    });
  }

  const repertoireRows = repertoireResult.data ?? [];
  const masterySum = repertoireRows.reduce(
    (sum, row) => sum + STATUS_MASTERY[row.current_status as SongProgressStatus],
    0
  );
  const avgMastery = repertoireRows.length > 0 ? Math.round(masterySum / repertoireRows.length) : 0;

  return {
    assignedTo: repertoireRows.length,
    usedInLessons: lessonsResult.count ?? 0,
    inLibrarySince: songResult.data?.created_at ?? null,
    avgMastery,
  };
}

export async function getSongLearners(songId: string, limit = 8): Promise<SongLearner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('student_repertoire')
    .select(
      'student_id, current_status, total_practice_minutes, last_practiced_at, profiles:student_id(full_name, email)'
    )
    .eq('song_id', songId)
    .neq('current_status', 'to_learn')
    .order('total_practice_minutes', { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn('[song-detail-queries] learners error', {
      error: error.message,
      code: error.code,
    });
    return [];
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      studentId: row.student_id as string,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      status: row.current_status as SongProgressStatus,
      totalPracticeMinutes: row.total_practice_minutes ?? 0,
      lastPracticedAt: row.last_practiced_at ?? null,
    };
  });
}

/**
 * The viewer's own repertoire entry for a song.
 *
 * Deliberately NOT `getSongLearners(...)[0]`, which is what the student's
 * progress card used to read. That query filters `.neq('current_status',
 * 'to_learn')` — correct for the teacher's "who is learning this" list, wrong
 * for the viewer's own state: a song marked "want to learn" is exactly a
 * `to_learn` row, so it would come back empty and the card would claim the
 * song was not in the student's repertoire at all.
 *
 * `sr_select_own` scopes this to the caller, so no student_id filter is needed
 * here (ADR-0001: RLS is the boundary, app code does not re-state it).
 */
export async function getViewerSongEntry(songId: string): Promise<ViewerSongEntry | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('student_repertoire')
    .select(
      'current_status, total_practice_minutes, practice_session_count, added_by_student, student_id'
    )
    .eq('song_id', songId)
    .maybeSingle();

  if (error) {
    logger.warn('[song-detail-queries] viewer entry error', {
      error: error.message,
      code: error.code,
    });
    return null;
  }
  if (!data) return null;

  return {
    status: data.current_status as SongProgressStatus,
    totalPracticeMinutes: data.total_practice_minutes ?? 0,
    addedByStudent: data.added_by_student,
    isRemovable: canStudentRemove(data),
  };
}

/**
 * Song ids already in the viewer's repertoire, for the library list — one
 * query for the whole page rather than one per row.
 */
export async function getViewerRepertoireSongIds(): Promise<Set<string>> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('student_repertoire').select('song_id');

  if (error) {
    logger.warn('[song-detail-queries] viewer repertoire ids error', {
      error: error.message,
      code: error.code,
    });
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.song_id as string));
}

export async function getRelatedSongs(
  songId: string,
  level: string | null,
  limit = 3
): Promise<RelatedSongRow[]> {
  if (!level) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('songs')
    .select('id, title, author, key')
    .eq('level', level)
    .is('deleted_at', null)
    .neq('id', songId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn('[song-detail-queries] related error', {
      error: error.message,
      code: error.code,
    });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    author: row.author as string | null,
    songKey: row.key as string | null,
  }));
}
