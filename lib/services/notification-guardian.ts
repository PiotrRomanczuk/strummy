import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import {
  generateInAppContent,
  type InAppContent,
} from '@/lib/services/notification-in-app-content';
import type {
  NotificationResult,
  NotificationType,
  SendNotificationParams,
} from '@/types/notifications';

const log = createLogger('notification-guardian');

/**
 * Lesson notifications a linked parent also receives. A child booked by a
 * parent through Cal.com often has no email of their own, so without this copy
 * nobody hears about the lesson at all.
 */
export const PARENT_COPY_TYPES: ReadonlySet<NotificationType> = new Set<NotificationType>([
  'lesson_reminder_24h',
  'lesson_recap',
  'lesson_cancelled',
  'lesson_rescheduled',
]);

type Send = (params: SendNotificationParams) => Promise<NotificationResult>;

/** The parent to copy a student's notification to, or null when there is none. */
async function findParent(
  studentId: string
): Promise<{ parentId: string; parentName: string | null; childName: string | null } | null> {
  const admin = createAdminClient();
  const { data: student } = await admin
    .from('profiles')
    .select('full_name, parent_id')
    .eq('id', studentId)
    .maybeSingle();
  if (!student?.parent_id) return null;

  const { data: parent } = await admin
    .from('profiles')
    .select('id, full_name, is_parent')
    .eq('id', student.parent_id)
    .maybeSingle();
  // parent_id alone is not enough: only a profile flagged as a parent is one.
  if (!parent?.is_parent) return null;
  return { parentId: parent.id, parentName: parent.full_name, childName: student.full_name };
}

/**
 * Send the parent's copy of a student's lesson notification. The copy greets
 * the parent by name and says whose lesson it is; everything else — channel,
 * preferences, the student e-mail kill switch — is decided by `send` exactly
 * as for the student.
 *
 * Returns null when no copy applies (other type, no linked parent).
 *
 * Not deduplicated on purpose: a lesson moved twice is two notifications for
 * the parent as for the student, and queue retries re-send to the student
 * only (`retryFailedNotifications`), so they never repeat the copy.
 */
export async function sendParentCopy(
  params: SendNotificationParams,
  send: Send
): Promise<NotificationResult | null> {
  if (params.isGuardianCopy || !PARENT_COPY_TYPES.has(params.type)) return null;

  try {
    const parent = await findParent(params.recipientUserId);
    if (!parent) return null;

    const childName =
      (params.templateData.studentName as string | undefined) ?? parent.childName ?? '';
    return await send({
      ...params,
      recipientUserId: parent.parentId,
      isGuardianCopy: true,
      templateData: {
        ...params.templateData,
        studentName: parent.parentName ?? childName,
        guardianFor: childName,
      },
    });
  } catch (error) {
    log.error('Failed to send the parent copy', {
      error,
      notification_type: params.type,
      entity_id: params.entityId,
    });
    return { success: false, error: 'Parent copy failed' };
  }
}

/**
 * The outcome of a student notification once the parent copy is counted: a
 * child with no address of their own whose parent got the message was
 * notified, so the queue must not retry (and re-send to the parent).
 */
export function combineWithParentCopy(
  student: NotificationResult,
  parent: NotificationResult | null
): NotificationResult {
  if (student.success || !parent?.success) return student;
  return { ...parent, success: true };
}

/** What the parent's in-app row says: the child's lesson, linking to the family dashboard. */
export function guardianInAppContent(
  type: NotificationType,
  data: Record<string, unknown>
): InAppContent {
  const content = generateInAppContent(type, data);
  const child = (data.guardianFor as string | undefined) || 'Your child';
  const bodies: Partial<Record<NotificationType, string>> = {
    lesson_reminder_24h: `${child} has a lesson at ${data.lessonTime || 'the scheduled time'}`,
    lesson_recap: data.summary
      ? `Wiadomość od nauczyciela po lekcji: ${child}`
      : `Recap from ${child}'s lesson`,
    lesson_cancelled: `${child}'s lesson on ${data.lessonDate || 'the scheduled date'} has been cancelled`,
    lesson_rescheduled: `${child}'s lesson has been moved to ${data.newDate || 'a new time'}`,
  };
  // A parent has no lesson pages; everything about the child is on the family dashboard.
  return { ...content, body: bodies[type] ?? content.body, actionUrl: '/dashboard' };
}
