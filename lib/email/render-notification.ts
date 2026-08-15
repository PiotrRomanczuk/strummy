/**
 * Notification HTML Renderer
 *
 * Maps NotificationType to the corresponding email template.
 * Used by both notification-service.ts and notification-queue-processor.ts.
 */

import type { NotificationType } from '@/types/notifications';
import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/locales';
import { generateLessonReminderHtml } from './templates/lesson-reminder';
import { generateLessonRecapHtml, type LessonEmailData } from './templates/lesson-recap';
import { generateLessonCancellationHtml } from './templates/lesson-cancellation';
import { generateLessonRescheduledHtml } from './templates/lesson-rescheduled-notification';
import { generateAssignmentCreatedHtml } from './templates/assignment-created';
import { generateAssignmentDueReminderHtml } from './templates/assignment-due-reminder';
import { generateAssignmentOverdueAlertHtml } from './templates/assignment-overdue-alert';
import { generateAssignmentCompletedHtml } from './templates/assignment-completed';
import { generateSongMasteryAchievementHtml } from './templates/song-mastery-achievement';
import { generateMilestoneReachedHtml } from './templates/milestone-reached';
import { generateStudentWelcomeHtml } from './templates/student-welcome';
import { generateTrialEndingReminderHtml } from './templates/trial-ending-reminder';
import { generateTeacherDailySummaryHtml } from './templates/teacher-daily-summary';
import { generateWeeklyProgressDigestHtml } from './templates/weekly-progress-digest';
import { generateCalendarConflictAlertHtml } from './templates/calendar-conflict-alert';
import { generateWebhookExpirationNoticeHtml } from './templates/webhook-expiration-notice';
import { generateAdminErrorAlertHtml } from './templates/admin-error-alert';
import { generateBaseEmailHtml, createGreeting, createParagraph } from './templates/base-template';

type TemplateData = Record<string, unknown>;
// profiles.email is nullable in the schema; this is display-only here.
type Recipient = { full_name: string | null; email: string | null };

function renderLessonTemplate(
  type: string,
  d: TemplateData,
  name: string,
  locale: AppLocale
): string | null {
  switch (type) {
    case 'lesson_reminder_24h':
      return generateLessonReminderHtml({
        studentName: (d.studentName as string) || name,
        lessonDate: (d.lessonDate as string) || '',
        lessonTime: (d.lessonTime as string) || '',
        location: d.location as string | undefined,
        agenda: d.agenda as string | undefined,
        locale,
      });
    case 'lesson_recap':
      return generateLessonRecapHtml({
        studentName: (d.studentName as string) || name,
        lessonDate: (d.lessonDate as string) || '',
        lessonTitle: (d.lessonTitle as string) || 'Your Recent Lesson',
        notes: (d.notes as string) || null,
        songs: d.songs as LessonEmailData['songs'],
        locale,
      });
    case 'lesson_cancelled':
      return generateLessonCancellationHtml({
        studentName: (d.studentName as string) || name,
        teacherName: (d.teacherName as string) || '',
        lessonDate: (d.lessonDate as string) || '',
        lessonTime: (d.lessonTime as string) || '',
        reason: d.reason as string | undefined,
        rescheduleLink: d.rescheduleLink as string | undefined,
      });
    case 'lesson_rescheduled':
      return generateLessonRescheduledHtml({
        studentName: (d.studentName as string) || name,
        teacherName: (d.teacherName as string) || '',
        oldDate: (d.oldDate as string) || '',
        oldTime: (d.oldTime as string) || '',
        newDate: (d.newDate as string) || '',
        newTime: (d.newTime as string) || '',
      });
    default:
      return null;
  }
}

function renderStudentTemplate(
  type: string,
  d: TemplateData,
  name: string,
  locale: AppLocale
): string | null {
  switch (type) {
    case 'assignment_created':
      return generateAssignmentCreatedHtml({
        studentName: (d.studentName as string) || name,
        assignmentTitle: (d.assignmentTitle as string) || '',
        assignmentDescription: d.assignmentDescription as string | undefined,
        dueDate: (d.dueDate as string) || '',
        teacherName: (d.teacherName as string) || '',
        assignmentLink: d.assignmentLink as string | undefined,
      });
    case 'assignment_due_reminder':
      return generateAssignmentDueReminderHtml({
        studentName: (d.studentName as string) || name,
        assignmentTitle: (d.assignmentTitle as string) || '',
        dueDate: (d.dueDate as string) || '',
        assignmentDescription: d.assignmentDescription as string | undefined,
        assignmentLink: (d.assignmentLink as string) || '',
        locale,
      });
    case 'assignment_overdue_alert':
      return generateAssignmentOverdueAlertHtml({
        studentName: (d.studentName as string) || name,
        assignmentTitle: (d.assignmentTitle as string) || '',
        dueDate: (d.dueDate as string) || '',
        daysOverdue: (d.daysOverdue as number) || 0,
        assignmentLink: (d.assignmentLink as string) || '',
      });
    case 'assignment_completed':
      return generateAssignmentCompletedHtml({
        studentName: (d.studentName as string) || name,
        assignmentTitle: (d.assignmentTitle as string) || '',
        completedDate: (d.completedDate as string) || '',
        teacherName: (d.teacherName as string) || '',
      });
    case 'song_mastery_achievement':
      return generateSongMasteryAchievementHtml({
        studentName: (d.studentName as string) || name,
        songTitle: (d.songTitle as string) || '',
        songArtist: (d.songArtist as string) || '',
        masteredDate: (d.masteredDate as string) || '',
        totalSongsMastered: (d.totalSongsMastered as number) || 0,
      });
    case 'milestone_reached':
      return generateMilestoneReachedHtml({
        studentName: (d.studentName as string) || name,
        milestone: (d.milestone as string) || '',
        milestoneDescription: d.milestoneDescription as string | undefined,
        achievedDate: (d.achievedDate as string) || '',
      });
    case 'student_welcome':
      return generateStudentWelcomeHtml({
        studentName: (d.studentName as string) || name,
        teacherName: (d.teacherName as string) || '',
        loginLink: (d.loginLink as string) || '',
        firstLessonDate: d.firstLessonDate as string | undefined,
      });
    case 'trial_ending_reminder':
      return generateTrialEndingReminderHtml({
        studentName: (d.studentName as string) || name,
        trialEndDate: (d.trialEndDate as string) || '',
        daysRemaining: (d.daysRemaining as number) || 0,
        upgradeLink: d.upgradeLink as string | undefined,
      });
    case 'weekly_progress_digest':
      return generateWeeklyProgressDigestHtml({
        recipientName: (d.recipientName as string) || name,
        weekStart: (d.weekStart as string) || '',
        weekEnd: (d.weekEnd as string) || '',
        lessonsCompleted: (d.lessonsCompleted as number) || 0,
        songsMastered: (d.songsMastered as number) || 0,
        practiceTime: (d.practiceTime as number) || 0,
        highlights: (d.highlights as string[]) || [],
        upcomingLessons: (d.upcomingLessons as Array<{ date: string; title: string }>) || [],
      });
    default:
      return null;
  }
}

function renderTeacherTemplate(type: string, d: TemplateData, name: string): string | null {
  if (type !== 'teacher_daily_summary') return null;
  return generateTeacherDailySummaryHtml({
    teacherName: (d.teacherName as string) || name,
    date: (d.date as string) || '',
    upcomingLessons:
      (d.upcomingLessons as Array<{ studentName: string; time: string; title: string }>) || [],
    completedLessons: (d.completedLessons as number) || 0,
    pendingAssignments: (d.pendingAssignments as number) || 0,
    recentAchievements:
      (d.recentAchievements as Array<{ studentName: string; achievement: string }>) || [],
  });
}

function renderSystemTemplate(type: string, d: TemplateData, name: string): string | null {
  switch (type) {
    case 'calendar_conflict_alert':
      return generateCalendarConflictAlertHtml({
        teacherName: (d.teacherName as string) || name,
        conflictDate: (d.conflictDate as string) || '',
        conflictTime: (d.conflictTime as string) || '',
        lesson1: (d.lesson1 as string) || '',
        lesson2: (d.lesson2 as string) || '',
        resolveLink: d.resolveLink as string | undefined,
      });
    case 'webhook_expiration_notice':
      return generateWebhookExpirationNoticeHtml({
        teacherName: (d.teacherName as string) || name,
        serviceName: (d.serviceName as string) || '',
        expirationDate: (d.expirationDate as string) || '',
        renewLink: d.renewLink as string | undefined,
      });
    case 'admin_error_alert':
      return generateAdminErrorAlertHtml({
        adminName: (d.adminName as string) || name,
        errorType: (d.errorType as string) || 'Unknown',
        errorMessage: (d.errorMessage as string) || '',
        timestamp: (d.timestamp as string) || '',
        affectedService: d.affectedService as string | undefined,
        stackTrace: d.stackTrace as string | undefined,
      });
    default:
      return null;
  }
}

/** Safety-net fallback for any future notification types without a dedicated template. */
function renderGenericNotification(
  type: NotificationType,
  data: TemplateData,
  recipientName: string,
  // Nullable: profiles.email is nullable and this is only used for the
  // "sent to" footer, which generateBaseEmailHtml already treats as optional.
  recipientEmail: string | null
): string {
  const subject = 'Notification from Strummy';

  const detailPairs = Object.entries(data)
    .filter(([, v]) => v != null && typeof v !== 'object')
    .map(([k, v]) => `<strong>${k}:</strong> ${String(v)}`)
    .join('<br>');

  const bodyContent = [
    createGreeting(recipientName),
    createParagraph(subject),
    detailPairs
      ? `<div style="background-color: #faf5f0; padding: 16px; border-radius: 8px; margin: 16px 0; line-height: 1.8;">${detailPairs}</div>`
      : '',
  ].join('');

  return generateBaseEmailHtml({
    subject,
    bodyContent,
    recipientEmail: recipientEmail ?? undefined,
    notificationType: type,
  });
}

/**
 * Render notification HTML using the appropriate template.
 * Falls back to a generic base template for types without a dedicated template.
 */
export function renderNotificationHtml(
  type: NotificationType,
  templateData: TemplateData,
  recipient: Recipient,
  locale: AppLocale = DEFAULT_LOCALE
): string {
  const name = recipient.full_name || 'there';

  return (
    renderLessonTemplate(type, templateData, name, locale) ||
    renderStudentTemplate(type, templateData, name, locale) ||
    renderTeacherTemplate(type, templateData, name) ||
    renderSystemTemplate(type, templateData, name) ||
    renderGenericNotification(type, templateData, name, recipient.email)
  );
}
