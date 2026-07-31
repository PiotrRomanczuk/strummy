import { NotificationCategory, NotificationType } from '@/types/notifications';

// Translation-key lookups (not the labels themselves) — callers supply `t`
// from their own `useTranslations('Settings')` so labels render in the
// active locale. Mirrors assignmentStatusLabel in
// lib/services/assignments-queries.ts. The category/type copy itself lives
// in types/notifications.ts as English fallback data (order + validity
// checks), but every user-facing render goes through these keys instead.

const CATEGORY_NAME_KEYS: Record<NotificationCategory, string> = {
  lessons: 'notifPrefsCategoryLessonsName',
  assignments: 'notifPrefsCategoryAssignmentsName',
  achievements: 'notifPrefsCategoryAchievementsName',
  lifecycle: 'notifPrefsCategoryLifecycleName',
  digests: 'notifPrefsCategoryDigestsName',
  system: 'notifPrefsCategorySystemName',
};

const CATEGORY_DESCRIPTION_KEYS: Record<NotificationCategory, string> = {
  lessons: 'notifPrefsCategoryLessonsDescription',
  assignments: 'notifPrefsCategoryAssignmentsDescription',
  achievements: 'notifPrefsCategoryAchievementsDescription',
  lifecycle: 'notifPrefsCategoryLifecycleDescription',
  digests: 'notifPrefsCategoryDigestsDescription',
  system: 'notifPrefsCategorySystemDescription',
};

const TYPE_LABEL_KEYS: Record<NotificationType, string> = {
  lesson_reminder_24h: 'notifPrefsTypeLessonReminder24hLabel',
  lesson_recap: 'notifPrefsTypeLessonRecapLabel',
  lesson_cancelled: 'notifPrefsTypeLessonCancelledLabel',
  lesson_rescheduled: 'notifPrefsTypeLessonRescheduledLabel',
  assignment_created: 'notifPrefsTypeAssignmentCreatedLabel',
  assignment_due_reminder: 'notifPrefsTypeAssignmentDueReminderLabel',
  assignment_overdue_alert: 'notifPrefsTypeAssignmentOverdueAlertLabel',
  assignment_completed: 'notifPrefsTypeAssignmentCompletedLabel',
  song_mastery_achievement: 'notifPrefsTypeSongMasteryAchievementLabel',
  milestone_reached: 'notifPrefsTypeMilestoneReachedLabel',
  student_welcome: 'notifPrefsTypeStudentWelcomeLabel',
  trial_ending_reminder: 'notifPrefsTypeTrialEndingReminderLabel',
  teacher_daily_summary: 'notifPrefsTypeTeacherDailySummaryLabel',
  weekly_progress_digest: 'notifPrefsTypeWeeklyProgressDigestLabel',
  calendar_conflict_alert: 'notifPrefsTypeCalendarConflictAlertLabel',
  webhook_expiration_notice: 'notifPrefsTypeWebhookExpirationNoticeLabel',
  admin_error_alert: 'notifPrefsTypeAdminErrorAlertLabel',
};

const TYPE_DESCRIPTION_KEYS: Record<NotificationType, string> = {
  lesson_reminder_24h: 'notifPrefsTypeLessonReminder24hDescription',
  lesson_recap: 'notifPrefsTypeLessonRecapDescription',
  lesson_cancelled: 'notifPrefsTypeLessonCancelledDescription',
  lesson_rescheduled: 'notifPrefsTypeLessonRescheduledDescription',
  assignment_created: 'notifPrefsTypeAssignmentCreatedDescription',
  assignment_due_reminder: 'notifPrefsTypeAssignmentDueReminderDescription',
  assignment_overdue_alert: 'notifPrefsTypeAssignmentOverdueAlertDescription',
  assignment_completed: 'notifPrefsTypeAssignmentCompletedDescription',
  song_mastery_achievement: 'notifPrefsTypeSongMasteryAchievementDescription',
  milestone_reached: 'notifPrefsTypeMilestoneReachedDescription',
  student_welcome: 'notifPrefsTypeStudentWelcomeDescription',
  trial_ending_reminder: 'notifPrefsTypeTrialEndingReminderDescription',
  teacher_daily_summary: 'notifPrefsTypeTeacherDailySummaryDescription',
  weekly_progress_digest: 'notifPrefsTypeWeeklyProgressDigestDescription',
  calendar_conflict_alert: 'notifPrefsTypeCalendarConflictAlertDescription',
  webhook_expiration_notice: 'notifPrefsTypeWebhookExpirationNoticeDescription',
  admin_error_alert: 'notifPrefsTypeAdminErrorAlertDescription',
};

type Translator = (key: string, values?: Record<string, string | number>) => string;

export const notificationCategoryName = (category: NotificationCategory, t: Translator): string =>
  t(CATEGORY_NAME_KEYS[category]);

export const notificationCategoryDescription = (
  category: NotificationCategory,
  t: Translator
): string => t(CATEGORY_DESCRIPTION_KEYS[category]);

export const notificationTypeLabel = (type: NotificationType, t: Translator): string =>
  t(TYPE_LABEL_KEYS[type]);

export const notificationTypeDescription = (type: NotificationType, t: Translator): string =>
  t(TYPE_DESCRIPTION_KEYS[type]);
