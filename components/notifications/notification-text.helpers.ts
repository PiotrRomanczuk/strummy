import type { NotificationType } from '@/types/notifications';

/**
 * Display-time translation of in-app notification text.
 *
 * `generateInAppContent` (lib/services/notification-in-app-content.ts) writes an
 * English title, body and action label into `in_app_notifications` when the row
 * is created, and the table keeps no structured fields beside them. So the list
 * recognises the rows that generator wrote — by `notification_type` plus its
 * exact English title — and re-renders them from the type and the values still
 * readable in the stored body. Anything else (rows with custom text, text that
 * is already Polish, a body that no longer matches its template) shows as stored.
 *
 * The stored rows are never rewritten.
 */

export type NotificationTextTranslator = (
  key: string,
  values?: Record<string, string | number>
) => string;

type BodyRule = {
  /** The English title `generateInAppContent` wrote for this type. */
  title: string;
  /** The English body template, with one capture group per value. */
  pattern: RegExp;
  /** Message value names, one per capture group. A numeric group is passed as a number. */
  values: string[];
  /** A captured value that is the generator's own placeholder, not real data. */
  placeholder?: { value: string; at: number };
};

const BODY_RULES: Partial<Record<NotificationType, BodyRule>> = {
  lesson_reminder_24h: {
    title: 'Lesson Tomorrow',
    pattern: /^You have a lesson at (.+)$/,
    values: ['time'],
    placeholder: { value: 'your scheduled time', at: 0 },
  },
  lesson_recap: {
    title: 'Lesson Recap',
    pattern: /^Recap from your lesson: (.+)$/,
    values: ['lesson'],
  },
  lesson_cancelled: {
    title: 'Lesson Cancelled',
    pattern: /^Your lesson on (.+) has been cancelled$/,
    values: ['date'],
    placeholder: { value: 'your scheduled date', at: 0 },
  },
  lesson_rescheduled: {
    title: 'Lesson Rescheduled',
    pattern: /^Your lesson has been moved to (.+)$/,
    values: ['date'],
    placeholder: { value: 'a new time', at: 0 },
  },
  assignment_created: {
    title: 'New Assignment',
    pattern: /^"(.*)" due (.+)$/,
    values: ['assignment', 'due'],
    placeholder: { value: 'soon', at: 1 },
  },
  assignment_due_reminder: {
    title: 'Assignment Due Soon',
    pattern: /^"(.*)" is due (.+)$/,
    values: ['assignment', 'due'],
    placeholder: { value: 'soon', at: 1 },
  },
  assignment_overdue_alert: {
    title: 'Assignment Overdue',
    pattern: /^"(.*)" is overdue by (\d+) days$/,
    values: ['assignment', 'count'],
  },
  assignment_completed: {
    title: 'Assignment Completed',
    pattern: /^(.*) completed "(.*)"$/,
    values: ['student', 'assignment'],
  },
  song_mastery_achievement: {
    title: 'Song Mastered!',
    pattern: /^You mastered "(.*)" by (.*)! 🎉$/,
    values: ['song', 'artist'],
  },
  milestone_reached: {
    title: 'Milestone Reached!',
    pattern: /^You reached: (.*)!$/,
    values: ['milestone'],
  },
  student_welcome: {
    title: 'Welcome!',
    pattern: /^Welcome to Guitar CRM, (.*)!$/,
    values: ['name'],
  },
  trial_ending_reminder: {
    title: 'Trial Ending Soon',
    pattern: /^Your trial period ends (.*)$/,
    values: ['when'],
  },
  teacher_daily_summary: {
    title: 'Daily Summary',
    pattern: /^(\d+) lessons completed today$/,
    values: ['count'],
  },
  weekly_progress_digest: {
    title: 'Weekly Progress',
    pattern: /^(\d+) lessons, (\d+) songs mastered this week$/,
    values: ['lessons', 'songs'],
  },
  calendar_conflict_alert: {
    title: 'Calendar Conflict',
    pattern: /^You have a scheduling conflict on (.*)$/,
    values: ['date'],
  },
  webhook_expiration_notice: {
    title: 'Integration Expiring',
    pattern: /^Your (.*) expires (.*)$/,
    values: ['integration', 'when'],
  },
  admin_error_alert: {
    title: 'System Error',
    pattern: /^Error: (.*)$/,
    values: ['error'],
  },
};

/** English action label → message key under `content.actions`. */
const ACTION_LABEL_KEYS: Record<string, string> = {
  'View Lesson': 'viewLesson',
  'View Details': 'viewDetails',
  'View New Time': 'viewNewTime',
  'View Assignment': 'viewAssignment',
  'Complete Now': 'completeNow',
  'View Progress': 'viewProgress',
  'View Dashboard': 'viewDashboard',
  'Get Started': 'getStarted',
  'Upgrade Now': 'upgradeNow',
  'View Summary': 'viewSummary',
  'Resolve Conflict': 'resolveConflict',
  'Renew Now': 'renewNow',
  'View Logs': 'viewLogs',
};

export type NotificationTextSource = {
  notification_type: string;
  title: string;
  body: string | null;
  action_label: string | null;
};

export type NotificationText = {
  title: string;
  body: string | null;
  actionLabel: string | null;
};

/** Values the messages use in a plural; everything else stays text. */
const COUNT_VALUES = new Set(['count', 'lessons', 'songs']);

function translateBody(
  type: NotificationType,
  rule: BodyRule,
  body: string,
  t: NotificationTextTranslator
): string | null {
  const match = rule.pattern.exec(body);
  if (!match) return null;

  const captured = match.slice(1);
  const values: Record<string, string | number> = {};
  rule.values.forEach((name, index) => {
    values[name] = COUNT_VALUES.has(name) ? Number(captured[index]) : captured[index];
  });

  const isPlaceholder =
    rule.placeholder && captured[rule.placeholder.at] === rule.placeholder.value;
  return t(`content.${type}.${isPlaceholder ? 'bodyNoValue' : 'body'}`, values);
}

/**
 * The title, body and action label to show for a stored notification, in the
 * active language. Unknown types and non-template text come back unchanged.
 */
export function localizeNotification(
  n: NotificationTextSource,
  t: NotificationTextTranslator
): NotificationText {
  const type = n.notification_type as NotificationType;
  const rule = BODY_RULES[type];
  const actionKey = n.action_label ? ACTION_LABEL_KEYS[n.action_label] : undefined;

  return {
    title: rule && n.title === rule.title ? t(`content.${type}.title`) : n.title,
    body: rule && n.body ? (translateBody(type, rule, n.body, t) ?? n.body) : n.body,
    actionLabel: actionKey ? t(`content.actions.${actionKey}`) : n.action_label,
  };
}
