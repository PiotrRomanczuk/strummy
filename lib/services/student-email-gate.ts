/**
 * Student e-mail kill switch (one definition for the notification service and
 * the queue processor).
 *
 * STUDENT_EMAILS_ENABLED=true lets every student e-mail through.
 * STUDENT_EMAIL_TYPES=lesson_recap,... lets only the listed notification types
 * through — added 2026-10-21 so the post-lesson summary can be e-mailed without
 * switching on every other student e-mail (reminders, digests) at once.
 * Anything else: student e-mails are downgraded to in-app and logged as skipped.
 */
export function isStudentEmailEnabled(type: string): boolean {
  if (process.env.STUDENT_EMAILS_ENABLED === 'true') return true;
  const allowed = (process.env.STUDENT_EMAIL_TYPES ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  return allowed.includes(type);
}
