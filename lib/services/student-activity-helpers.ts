/**
 * Student Activity Helpers
 *
 * Individual student status update functions that can be called
 * from lesson completion hooks or manual triggers
 */

// Cron-only service. Uses the service-role client deliberately: these
// functions run from the daily cron with no user session, so the
// RLS-scoped client resolves to `anon`, which cannot read or write
// profiles — every query silently returned 0 rows and the whole
// automatic status update was a no-op. Callers are cron routes only
// (app/api/cron/dispatcher, app/api/cron/update-student-status).
import { createAdminClient } from '@/lib/supabase/admin';

const INACTIVITY_DAYS = 28;

/**
 * Updates a single student's activity status based on their lesson history
 * Useful for immediate updates when a lesson is completed or scheduled
 */
export async function updateSingleStudentStatus(studentId: string): Promise<{
  updated: boolean;
  previousStatus: string | null;
  newStatus: string | null;
}> {
  const supabase = createAdminClient();
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);

  // Get student
  const { data: student, error: studentError } = await supabase
    .from('profiles')
    .select('id, email, student_status')
    .eq('id', studentId)
    .eq('is_student', true)
    .in('student_status', ['active', 'archived'])
    .single();

  if (studentError || !student) {
    return { updated: false, previousStatus: null, newStatus: null };
  }

  // Get last completed lesson
  const { data: lastCompleted } = await supabase
    .from('lessons')
    .select('scheduled_at')
    .eq('student_id', studentId)
    .eq('status', 'COMPLETED')
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .single();

  // Get next scheduled lesson
  const { data: nextScheduled } = await supabase
    .from('lessons')
    .select('scheduled_at')
    .eq('student_id', studentId)
    .eq('status', 'SCHEDULED')
    .gte('scheduled_at', now.toISOString())
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single();

  const hasRecentLesson = lastCompleted && new Date(lastCompleted.scheduled_at) >= cutoffDate;
  const hasFutureLesson = !!nextScheduled;

  let newStatus = student.student_status;

  if (student.student_status === 'active') {
    if (!hasRecentLesson && !hasFutureLesson) {
      newStatus = 'archived';
    }
  } else if (student.student_status === 'archived') {
    if (hasRecentLesson || hasFutureLesson) {
      newStatus = 'active';
    }
  }

  if (newStatus !== student.student_status) {
    // Update status
    await supabase
      .from('profiles')
      .update({
        student_status: newStatus,
        status_changed_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', studentId);

    // Log to history
    await supabase
      .from('user_history')
      .insert({
        profile_id: studentId,
        changed_by: null,
        change_type: 'status_changed',
        previous_data: { student_status: student.student_status },
        new_data: { student_status: newStatus },
        notes: `Activity-based status update: ${student.student_status} → ${newStatus}`
      });

    return {
      updated: true,
      previousStatus: student.student_status,
      newStatus
    };
  }

  return {
    updated: false,
    previousStatus: student.student_status,
    newStatus: student.student_status
  };
}

/**
 * Gets activity status for a student without updating
 * Useful for UI display and manual review
 */
export async function getStudentActivityInfo(studentId: string): Promise<{
  studentStatus: string | null;
  lastCompletedLessonDate: string | null;
  nextScheduledLessonDate: string | null;
  daysSinceLastLesson: number | null;
  shouldBeInactive: boolean;
  shouldBeActive: boolean;
}> {
  const supabase = createAdminClient();
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);

  const { data: student } = await supabase
    .from('profiles')
    .select('student_status')
    .eq('id', studentId)
    .eq('is_student', true)
    .single();

  if (!student) {
    return {
      studentStatus: null,
      lastCompletedLessonDate: null,
      nextScheduledLessonDate: null,
      daysSinceLastLesson: null,
      shouldBeInactive: false,
      shouldBeActive: false
    };
  }

  const { data: lastCompleted } = await supabase
    .from('lessons')
    .select('scheduled_at')
    .eq('student_id', studentId)
    .eq('status', 'COMPLETED')
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .single();

  const { data: nextScheduled } = await supabase
    .from('lessons')
    .select('scheduled_at')
    .eq('student_id', studentId)
    .eq('status', 'SCHEDULED')
    .gte('scheduled_at', now.toISOString())
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single();

  const lastCompletedDate = lastCompleted?.scheduled_at || null;
  const nextScheduledDate = nextScheduled?.scheduled_at || null;

  const daysSinceLastLesson = lastCompletedDate
    ? Math.floor((now.getTime() - new Date(lastCompletedDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const hasRecentLesson = lastCompleted && new Date(lastCompleted.scheduled_at) >= cutoffDate;
  const hasFutureLesson = !!nextScheduled;

  return {
    studentStatus: student.student_status,
    lastCompletedLessonDate: lastCompletedDate,
    nextScheduledLessonDate: nextScheduledDate,
    daysSinceLastLesson,
    shouldBeInactive: !hasRecentLesson && !hasFutureLesson,
    shouldBeActive: hasRecentLesson || hasFutureLesson
  };
}
