import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import {
  getStudentPreferences,
  getStudentProfile,
  getStudentRepertoire,
} from './student-detail-queries';
import {
  getStudentLatestNote,
  getStudentPracticeHistory,
  getStudentUpcomingLessons,
  type LatestNote,
  type UpcomingLesson,
} from './parent-health-queries';
import {
  currentStreak,
  DEFAULT_DAILY_GOAL_MINUTES,
  summarisePracticeWeek,
  type PracticeDay,
  type PracticeWeek,
} from './parent-health.helpers';

export type ParentChild = {
  id: string;
  name: string;
  email: string | null;
};

export type ParentChildOverview = {
  id: string;
  name: string;
  skillLevel: string | null;
  teacherName: string | null;
  streakDays: number;
  songCount: number;
  practiceWeek: PracticeWeek;
  practiceDays: PracticeDay[];
  upcomingLessons: UpcomingLesson[];
  latestNote: LatestNote | null;
};

const capitalise = (value: string): string =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);

/**
 * Children linked to a parent via profiles.parent_id. RLS
 * (profiles_select_parent) already restricts this to the caller's own
 * children, so no extra guard is needed here.
 */
export async function getParentChildren(parentId: string): Promise<ParentChild[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('parent_id', parentId)
    .order('full_name', { ascending: true });

  if (error) {
    logger.warn('[parent-dashboard] children error', { error: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.full_name as string) ?? (row.email as string) ?? 'Your child',
    email: (row.email as string) ?? null,
  }));
}

/**
 * Choose which child to show: the requested one when it is actually linked,
 * otherwise the first linked child, otherwise null. Pure — safe to unit-test.
 */
export function resolveActiveChildId(
  children: ParentChild[],
  requestedId: string | undefined
): string | null {
  if (children.length === 0) return null;
  if (requestedId && children.some((child) => child.id === requestedId)) return requestedId;
  return children[0].id;
}

/**
 * Compose one child's check-in view from the existing student-detail and
 * student-health queries. Returns null when the child is not readable (not
 * linked / removed) so the caller can fall back to the empty state.
 */
export async function getParentChildOverview(
  childId: string,
  now: Date = new Date()
): Promise<ParentChildOverview | null> {
  const profile = await getStudentProfile(childId);
  if (!profile) return null;

  const [preferences, practiceDays, upcomingLessons, latestNote, repertoire] = await Promise.all([
    getStudentPreferences(childId),
    getStudentPracticeHistory(childId, now),
    getStudentUpcomingLessons(childId),
    getStudentLatestNote(childId, now),
    getStudentRepertoire(childId),
  ]);

  const names = await getTeacherNames([
    ...upcomingLessons.map((lesson) => lesson.teacherId),
    latestNote?.teacherId ?? null,
  ]);
  const withName = <T extends { teacherId: string | null; teacherName: string | null }>(
    row: T
  ): T => ({
    ...row,
    teacherName: row.teacherName ?? (row.teacherId ? (names.get(row.teacherId) ?? null) : null),
  });
  const lessons = upcomingLessons.map(withName);
  const note = latestNote ? withName(latestNote) : null;

  return {
    id: profile.id,
    name: profile.fullName ?? profile.email ?? 'Your child',
    skillLevel: preferences?.skillLevel ? capitalise(preferences.skillLevel) : null,
    teacherName: note?.teacherName ?? lessons[0]?.teacherName ?? null,
    streakDays: currentStreak(practiceDays),
    songCount: repertoire.length,
    practiceWeek: summarisePracticeWeek(practiceDays, DEFAULT_DAILY_GOAL_MINUTES),
    practiceDays,
    upcomingLessons: lessons,
    latestNote: note,
  };
}

/**
 * Names of the child's teachers. RLS gives a parent the child's lessons but not
 * the teachers' profiles, so the lesson's teacher came back empty and the
 * dashboard showed no teacher at all. The ids come from lessons the parent can
 * already read; only `full_name` leaves this function.
 */
async function getTeacherNames(ids: Array<string | null>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('id, full_name')
    .in('id', unique)
    .eq('is_teacher', true);
  if (error) {
    logger.warn('[parent-dashboard] teacher names error', { error: error.message });
    return new Map();
  }
  return new Map(
    (data ?? [])
      .filter((row) => row.full_name)
      .map((row) => [row.id as string, row.full_name as string])
  );
}
