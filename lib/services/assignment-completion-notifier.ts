import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/services/notification-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('assignment-completion-notifier');

export interface CompletedAssignment {
  id: string;
  title: string | null;
  teacher_id: string;
  student_id: string;
}

/**
 * Tells the teacher that a student finished an assignment.
 *
 * Sent immediately rather than queued: the queue is drained by the daily
 * dispatcher, and a teacher looking at their inbox after a lesson should see
 * what the student did today, not tomorrow. `sendNotification` still honours
 * the teacher's preference and delivery channel. Best-effort — the status
 * change has already been written and must not be reported as failed because
 * the inbox write did not happen.
 */
export async function notifyTeacherOfCompletion(assignment: CompletedAssignment): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: student } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', assignment.student_id)
      .maybeSingle();

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_BASE_URL_REMOTE || '';

    await sendNotification({
      type: 'assignment_completed',
      recipientUserId: assignment.teacher_id,
      templateData: {
        assignmentTitle: assignment.title ?? 'Assignment',
        studentName: student?.full_name || 'Your student',
        completedDate: new Date().toISOString().slice(0, 10),
        assignmentLink: `${baseUrl}/dashboard/assignments/${assignment.id}`,
      },
      entityType: 'assignment',
      entityId: assignment.id,
      // The inbox is where a teacher looks after a lesson; e-mail is a bonus.
      alwaysInApp: true,
    });
  } catch (error) {
    log.error('Failed to notify teacher of assignment completion', {
      assignmentId: assignment.id,
      error,
    });
  }
}
