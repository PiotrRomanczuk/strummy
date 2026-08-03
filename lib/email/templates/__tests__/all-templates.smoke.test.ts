/**
 * Smoke coverage for every email template that doesn't already have its own
 * test file. Each case renders real data through the actual generate*Html
 * function and checks the output is well-formed, includes the key content,
 * and leaks no unresolved placeholders — not a design/pixel check, just a
 * guard against runtime errors and copy regressions in the v2 templates.
 */

import { generateAdminErrorAlertHtml } from '../admin-error-alert';
import { generateAssignmentCompletedHtml } from '../assignment-completed';
import { generateAssignmentCreatedHtml } from '../assignment-created';
import { generateAssignmentDueReminderHtml } from '../assignment-due-reminder';
import { generateAssignmentOverdueAlertHtml } from '../assignment-overdue-alert';
import { generateCalendarConflictAlertHtml } from '../calendar-conflict-alert';
import { generateLessonCancellationHtml } from '../lesson-cancellation';
import { generateLessonRescheduledHtml } from '../lesson-rescheduled-notification';
import { generateMilestoneReachedHtml } from '../milestone-reached';
import { generateSongMasteryAchievementHtml } from '../song-mastery-achievement';
import { generateStudentWelcomeHtml } from '../student-welcome';
import { generateTeacherDailySummaryHtml } from '../teacher-daily-summary';
import { generateTrialEndingReminderHtml } from '../trial-ending-reminder';
import { generateWebhookExpirationNoticeHtml } from '../webhook-expiration-notice';
import { generateWeeklyInsightsHtml } from '../weekly-insights';
import { generateWeeklyProgressDigestHtml } from '../weekly-progress-digest';

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV };
  process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
});

afterAll(() => {
  process.env = OLD_ENV;
});

/** Shared invariants every rendered email must satisfy. */
function expectWellFormed(html: string) {
  expect(html).toContain('<!DOCTYPE html>');
  expect(html).toContain('</html>');
  expect(html).toContain('Strummy');
  expect(html).not.toContain('undefined');
  expect(html).not.toContain('[object Object]');
  expect(html).not.toMatch(/\$\{/); // no unresolved template literal
}

describe('email templates — smoke coverage', () => {
  it('admin-error-alert renders with urgent tone and stack trace', () => {
    const html = generateAdminErrorAlertHtml({
      errorType: 'Google Calendar Webhook Failure',
      errorMessage: 'Webhook channel renewal failed after 3 retries',
      timestamp: '2026-08-03 06:14:22 UTC',
      affectedService: 'calendar-sync',
      stackTrace: 'Error: invalid_grant\n    at refreshTokenNoCache (oauth-client.ts:184:13)',
    });

    expectWellFormed(html);
    expect(html).toContain('Google Calendar Webhook Failure');
    expect(html).toContain('calendar-sync');
    expect(html).toContain('invalid_grant');
    expect(html).toContain('background-color: #a03d31'); // urgent tone rule
  });

  it('assignment-completed renders with student and teacher names', () => {
    const html = generateAssignmentCompletedHtml({
      studentName: 'Emma',
      assignmentTitle: 'Practice F major barre transitions',
      completedDate: 'August 1, 2026',
      teacherName: 'Sarah Chen',
    });

    expectWellFormed(html);
    expect(html).toContain('Practice F major barre transitions');
    expect(html).toContain('Sarah Chen');
    expect(html).toContain('Completed');
  });

  it('assignment-created renders with description and due date', () => {
    const html = generateAssignmentCreatedHtml({
      studentName: 'Emma',
      assignmentTitle: 'Learn "Horse With No Name" chords',
      assignmentDescription: 'Focus on the open chord transitions.',
      dueDate: 'August 10, 2026',
      teacherName: 'Sarah Chen',
      assignmentLink: 'https://example.com/dashboard/assignments/7',
    });

    expectWellFormed(html);
    expect(html).toContain('Learn "Horse With No Name" chords');
    expect(html).toContain('Focus on the open chord transitions.');
    expect(html).toContain('https://example.com/dashboard/assignments/7');
  });

  it('assignment-due-reminder renders with warning badge', () => {
    const html = generateAssignmentDueReminderHtml({
      studentName: 'Emma',
      assignmentTitle: 'Practice F major barre transitions',
      dueDate: 'August 5, 2026',
      assignmentDescription: 'Ten minutes daily.',
      assignmentLink: 'https://example.com/dashboard/assignments/42',
    });

    expectWellFormed(html);
    expect(html).toContain('Practice F major barre transitions');
    expect(html).toContain('Due soon');
  });

  it('assignment-overdue-alert renders with urgent tone and days overdue', () => {
    const html = generateAssignmentOverdueAlertHtml({
      studentName: 'Emma',
      assignmentTitle: 'Practice F major barre transitions',
      dueDate: 'Wednesday, July 29, 2026',
      daysOverdue: 5,
      assignmentLink: 'https://example.com/dashboard/assignments/42',
    });

    expectWellFormed(html);
    expect(html).toContain('5');
    expect(html).toContain('Overdue');
    expect(html).toContain('background-color: #a03d31');
  });

  it('calendar-conflict-alert renders both conflicting lessons', () => {
    const html = generateCalendarConflictAlertHtml({
      teacherName: 'Sarah',
      conflictDate: 'August 6, 2026',
      conflictTime: '4:30 PM',
      lesson1: 'Emma Kowalski — Regular Lesson',
      lesson2: 'Leo Martins — Regular Lesson',
      resolveLink: 'https://example.com/dashboard/calendar',
    });

    expectWellFormed(html);
    expect(html).toContain('Emma Kowalski');
    expect(html).toContain('Leo Martins');
    expect(html).toContain('Conflict');
  });

  it('lesson-cancellation renders with urgent tone and reschedule CTA', () => {
    const html = generateLessonCancellationHtml({
      studentName: 'Emma',
      teacherName: 'Sarah Chen',
      lessonDate: 'August 6, 2026',
      lessonTime: '4:30 PM',
      reason: 'Teacher illness',
      rescheduleLink: 'https://example.com/dashboard/reschedule/1',
    });

    expectWellFormed(html);
    expect(html).toContain('Teacher illness');
    expect(html).toContain('https://example.com/dashboard/reschedule/1');
  });

  it('lesson-rescheduled renders old (struck through) and new time', () => {
    const html = generateLessonRescheduledHtml({
      studentName: 'Emma',
      teacherName: 'Sarah Chen',
      oldDate: 'August 6, 2026',
      oldTime: '4:30 PM',
      newDate: 'August 7, 2026',
      newTime: '5:00 PM',
    });

    expectWellFormed(html);
    expect(html).toContain('text-decoration: line-through');
    expect(html).toContain('August 7, 2026');
    expect(html).toContain('5:00 PM');
  });

  it('milestone-reached renders the certificate card', () => {
    const html = generateMilestoneReachedHtml({
      studentName: 'Emma',
      milestone: '100 Days Practice Streak',
      milestoneDescription: 'Practiced every day for 100 days straight.',
      achievedDate: 'August 1, 2026',
    });

    expectWellFormed(html);
    expect(html).toContain('100 Days Practice Streak');
    expect(html).toContain('Achievement unlocked');
    expect(html).toContain('border: 1px solid #b68235');
  });

  it('song-mastery-achievement renders the certificate card with no CTA button', () => {
    const html = generateSongMasteryAchievementHtml({
      studentName: 'Emma',
      songTitle: 'Blackbird',
      songArtist: 'The Beatles',
      masteredDate: 'August 1, 2026',
      totalSongsMastered: 12,
    });

    expectWellFormed(html);
    expect(html).toContain('Blackbird');
    expect(html).toContain('The Beatles');
    expect(html).toContain('No. 12 in your repertoire');
    expect(html).not.toContain('class="btn"');
  });

  it('student-welcome renders the numbered feature list', () => {
    const html = generateStudentWelcomeHtml({
      studentName: 'Emma',
      teacherName: 'Sarah Chen',
      loginLink: 'https://example.com/auth/sign-in',
      firstLessonDate: 'August 6, 2026',
    });

    expectWellFormed(html);
    expect(html).toContain('Sarah Chen');
    expect(html).toContain('Lessons');
    expect(html).toContain('Practice log');
    expect(html).toContain('https://example.com/auth/sign-in');
  });

  it('teacher-daily-summary renders stat tiles and lesson rows', () => {
    const html = generateTeacherDailySummaryHtml({
      teacherName: 'Sarah',
      date: 'August 6, 2026',
      upcomingLessons: [{ studentName: 'Emma Kowalski', time: '4:30 PM', title: 'Regular Lesson' }],
      completedLessons: 3,
      pendingAssignments: 2,
      recentAchievements: [{ studentName: 'Leo Martins', achievement: 'Mastered "Wonderwall"' }],
    });

    expectWellFormed(html);
    expect(html).toContain('Emma Kowalski');
    expect(html).toContain('Leo Martins');
    expect(html).toContain('Mastered "Wonderwall"');
  });

  it('trial-ending-reminder renders days remaining and upgrade CTA', () => {
    const html = generateTrialEndingReminderHtml({
      studentName: 'Emma',
      trialEndDate: 'August 10, 2026',
      daysRemaining: 3,
      upgradeLink: 'https://example.com/dashboard/upgrade',
    });

    expectWellFormed(html);
    expect(html).toContain('3');
    expect(html).toContain('https://example.com/dashboard/upgrade');
  });

  it('webhook-expiration-notice renders service name and renew CTA', () => {
    const html = generateWebhookExpirationNoticeHtml({
      teacherName: 'Sarah',
      serviceName: 'Google Calendar',
      expirationDate: 'August 10, 2026',
      renewLink: 'https://example.com/dashboard/settings',
    });

    expectWellFormed(html);
    expect(html).toContain('Google Calendar');
    expect(html).toContain('Expiring soon');
  });

  it('weekly-insights renders stats, achievements, and action items', () => {
    const html = generateWeeklyInsightsHtml({
      teacherId: 'teacher-1',
      teacherName: 'Sarah',
      teacherEmail: 'sarah@example.com',
      dateRange: { start: '2026-07-27', end: '2026-08-02' },
      lessonsCompleted: 14,
      newStudents: [
        { id: 's1', name: 'Noah Petersen', email: 'noah@example.com', createdAt: '2026-07-28' },
      ],
      songsMastered: [
        { studentName: 'Emma Kowalski', songTitle: 'Blackbird', masteredAt: '2026-08-01' },
      ],
      atRiskStudents: [
        {
          id: 's2',
          name: 'Jake Thornton',
          email: 'jake@example.com',
          healthScore: 34,
          overdueAssignments: 3,
        },
      ],
      overdueAssignments: [
        {
          studentName: 'Jake Thornton',
          assignmentTitle: 'Practice F major barre transitions',
          dueDate: '2026-07-29',
        },
      ],
      lessonsCancelled: 1,
    });

    expectWellFormed(html);
    expect(html).toContain('14');
    expect(html).toContain('Noah Petersen');
    expect(html).toContain('Blackbird');
    expect(html).toContain('Jake Thornton');
    expect(html).toContain('At-risk students');
    expect(html).toContain('Overdue assignments');
  });

  it('weekly-insights renders the all-caught-up state when there are no action items', () => {
    const html = generateWeeklyInsightsHtml({
      teacherId: 'teacher-1',
      teacherName: 'Sarah',
      teacherEmail: 'sarah@example.com',
      dateRange: { start: '2026-07-27', end: '2026-08-02' },
      lessonsCompleted: 5,
      newStudents: [],
      songsMastered: [],
      atRiskStudents: [],
      overdueAssignments: [],
      lessonsCancelled: 0,
    });

    expectWellFormed(html);
    expect(html).toContain('All caught up');
  });

  it('weekly-progress-digest renders stat tiles and highlights', () => {
    const html = generateWeeklyProgressDigestHtml({
      recipientName: 'Emma',
      weekStart: 'July 27',
      weekEnd: 'August 2',
      lessonsCompleted: 2,
      songsMastered: 1,
      practiceTime: 5,
      highlights: ['Mastered "Blackbird"', 'Improved barre chord speed'],
      upcomingLessons: [{ date: 'August 6, 2026', title: 'Regular Lesson' }],
    });

    expectWellFormed(html);
    expect(html).toContain('Mastered "Blackbird"');
    expect(html).toContain('August 6, 2026');
  });
});
