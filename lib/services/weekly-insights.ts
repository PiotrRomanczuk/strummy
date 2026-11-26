/**
 * Weekly Insights Service
 * Aggregates weekly data for teacher insight emails
 */

import type { createAdminClient } from '@/lib/supabase/admin';

/**
 * The caller passes the client. The weekly job runs from cron with no user
 * session, so it uses the admin client: every query below must therefore be
 * scoped to `teacherId` (directly or through that teacher's students) itself,
 * because RLS is not there to do it.
 */
type InsightsClient = ReturnType<typeof createAdminClient>;

/** Not yet done: `'pending'` is not an assignment status, so it matched nothing. */
const OPEN_ASSIGNMENT_STATUSES = ['not_started', 'in_progress', 'overdue'] as const;

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at?: string;
}

interface LessonWithProfile {
  student_id: string;
  created_at: string;
  profiles: ProfileData | null;
}

interface SongProgressData {
  song_id: string;
  mastered_at: string;
  student_id: string;
  profiles: ProfileData | null;
  songs: {
    title: string | null;
  } | null;
}

interface AssignmentData {
  title: string;
  due_date: string;
  student_id: string;
  profiles: ProfileData | null;
}

interface StudentLessonData {
  student_id: string;
  profiles: ProfileData | null;
}

export interface WeeklyInsightsData {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  dateRange: {
    start: string;
    end: string;
  };
  lessonsCompleted: number;
  newStudents: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
  songsMastered: Array<{
    studentName: string;
    songTitle: string;
    masteredAt: string;
  }>;
  atRiskStudents: Array<{
    id: string;
    name: string;
    email: string;
    healthScore: number;
    overdueAssignments: number;
  }>;
  overdueAssignments: Array<{
    studentName: string;
    assignmentTitle: string;
    dueDate: string;
  }>;
  lessonsCancelled: number;
}

/** Songs that `studentIds` mastered in the range; nothing when there are none. */
async function fetchMasteredSongs(
  supabase: InsightsClient,
  studentIds: string[],
  startDate: Date,
  endDate: Date
): Promise<SongProgressData[]> {
  if (studentIds.length === 0) return [];
  const { data } = await supabase
    .from('student_repertoire')
    .select(
      `
      song_id,
      mastered_at,
      student_id,
      profiles!student_repertoire_student_id_fkey (
        full_name,
        email
      ),
      songs (
        title
      )
    `
    )
    .in('student_id', studentIds)
    .eq('current_status', 'mastered')
    .gte('mastered_at', startDate.toISOString())
    .lte('mastered_at', endDate.toISOString());
  return (data as SongProgressData[] | null) ?? [];
}

/**
 * Get weekly insights data for a teacher
 */
export async function getWeeklyInsightsData(
  supabase: InsightsClient,
  teacherId: string,
  startDate: Date,
  endDate: Date
): Promise<WeeklyInsightsData> {
  // Get teacher profile
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', teacherId)
    .single();

  // Get lessons completed this week
  const { count: lessonsCompleted } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', teacherId)
    .eq('status', 'COMPLETED')
    .gte('scheduled_at', startDate.toISOString())
    .lte('scheduled_at', endDate.toISOString());

  // Get lessons cancelled this week
  const { count: lessonsCancelled } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', teacherId)
    .eq('status', 'CANCELLED')
    .gte('scheduled_at', startDate.toISOString())
    .lte('scheduled_at', endDate.toISOString());

  // Get new students this week (students with first lesson this week)
  const { data: newStudentLessons } = await supabase
    .from('lessons')
    .select(
      `
      student_id,
      profiles!lessons_student_id_fkey (
        id,
        full_name,
        email,
        created_at
      )
    `
    )
    .eq('teacher_id', teacherId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  const newStudents =
    (newStudentLessons as LessonWithProfile[] | null)
      ?.map((lesson) => {
        const profile = lesson.profiles;
        if (!profile) return null;
        return {
          id: profile.id,
          name: profile.full_name || profile.email || 'Unknown Student',
          email: profile.email || '',
          createdAt: profile.created_at || lesson.created_at,
        };
      })
      .filter((student): student is NonNullable<typeof student> => student !== null)
      .filter(
        (student, index, self) =>
          // Remove duplicates
          index === self.findIndex((s) => s.id === student.id)
      ) || [];

  // Fetch all teacher's students with a single query
  const { data: teacherStudents } = await supabase
    .from('lessons')
    .select('student_id, profiles!lessons_student_id_fkey (id, full_name, email)')
    .eq('teacher_id', teacherId);

  const uniqueStudentIds = [
    ...new Set(
      (teacherStudents as StudentLessonData[] | null)?.map((l) => l.student_id).filter(Boolean)
    ),
  ];

  // Songs mastered this week by this teacher's students
  const masteredSongs = await fetchMasteredSongs(supabase, uniqueStudentIds, startDate, endDate);

  const songsMastered = masteredSongs
    .map((progress) => ({
      studentName: progress.profiles?.full_name || progress.profiles?.email || 'Unknown Student',
      songTitle: progress.songs?.title || 'Unknown Song',
      masteredAt: progress.mastered_at,
    }))
    .filter((song) => song.studentName && song.songTitle);

  // Get at-risk students (health score < 40)
  const atRiskStudents: Array<{
    id: string;
    name: string;
    email: string;
    healthScore: number;
    overdueAssignments: number;
  }> = [];

  if (uniqueStudentIds.length > 0) {
    // Batch query: fetch recent lesson counts for all students in one query
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentLessonRows } = await supabase
      .from('lessons')
      .select('student_id')
      .in('student_id', uniqueStudentIds)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Batch query: fetch overdue assignments for all students in one query
    const { data: overdueRows } = await supabase
      .from('assignments')
      .select('student_id')
      .in('student_id', uniqueStudentIds)
      .in('status', OPEN_ASSIGNMENT_STATUSES)
      .lt('due_date', new Date().toISOString());

    // Build lookup maps from batched results
    const recentLessonCountByStudent = new Map<string, number>();
    for (const row of recentLessonRows || []) {
      recentLessonCountByStudent.set(
        row.student_id,
        (recentLessonCountByStudent.get(row.student_id) || 0) + 1
      );
    }

    const overdueCountByStudent = new Map<string, number>();
    for (const row of overdueRows || []) {
      overdueCountByStudent.set(
        row.student_id,
        (overdueCountByStudent.get(row.student_id) || 0) + 1
      );
    }

    // Calculate health scores using the pre-fetched maps
    for (const studentId of uniqueStudentIds) {
      const recentLessons = recentLessonCountByStudent.get(studentId) || 0;
      const overdueCount = overdueCountByStudent.get(studentId) || 0;

      // Simple health score: penalty for inactivity and overdue assignments
      const healthScore = Math.max(0, 100 - recentLessons * 20 + overdueCount * 15);

      if (healthScore < 40) {
        const student = (teacherStudents as StudentLessonData[] | null)?.find(
          (l) => l.student_id === studentId
        );
        const profile = student?.profiles;

        if (profile) {
          atRiskStudents.push({
            id: profile.id,
            name: profile.full_name || profile.email || 'Unknown Student',
            email: profile.email || '',
            healthScore,
            overdueAssignments: overdueCount,
          });
        }
      }
    }
  }

  // Get overdue assignments
  const { data: overdueAssignmentsData } = await supabase
    .from('assignments')
    .select(
      `
      title,
      due_date,
      student_id,
      profiles!assignments_student_id_fkey (
        full_name,
        email
      )
    `
    )
    .eq('teacher_id', teacherId)
    .in('status', OPEN_ASSIGNMENT_STATUSES)
    .lt('due_date', new Date().toISOString())
    .order('due_date', { ascending: true })
    .limit(10);

  const overdueAssignments =
    (overdueAssignmentsData as AssignmentData[] | null)?.map((assignment) => ({
      studentName:
        assignment.profiles?.full_name || assignment.profiles?.email || 'Unknown Student',
      assignmentTitle: assignment.title,
      dueDate: assignment.due_date,
    })) || [];

  return {
    teacherId,
    teacherName: teacherProfile?.full_name || teacherProfile?.email || 'Teacher',
    teacherEmail: teacherProfile?.email || '',
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    lessonsCompleted: lessonsCompleted || 0,
    newStudents,
    songsMastered,
    atRiskStudents,
    overdueAssignments,
    lessonsCancelled: lessonsCancelled || 0,
  };
}

/**
 * Get date range for previous week (Monday to Sunday)
 */
export function getLastWeekDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate last Monday
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysToLastMonday - 7); // Go back to previous week's Monday
  lastMonday.setHours(0, 0, 0, 0);

  // Calculate last Sunday
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  return {
    start: lastMonday,
    end: lastSunday,
  };
}
