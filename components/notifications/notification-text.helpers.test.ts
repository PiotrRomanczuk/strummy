import { createTranslator } from 'next-intl';

import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';
import { generateInAppContent } from '@/lib/services/notification-in-app-content';
import type { NotificationType } from '@/types/notifications';
import {
  localizeNotification,
  type NotificationTextSource,
  type NotificationTextTranslator,
} from './notification-text.helpers';

const translator = (locale: 'en' | 'pl'): NotificationTextTranslator =>
  createTranslator({
    locale,
    messages: locale === 'en' ? enMessages : plMessages,
    namespace: 'Notifications',
  }) as unknown as NotificationTextTranslator;

const tEn = translator('en');
const tPl = translator('pl');

/** A stored row, exactly as `generateInAppContent` writes it. */
const stored = (type: NotificationType, data: Record<string, unknown>): NotificationTextSource => {
  const content = generateInAppContent(type, data);
  return {
    notification_type: type,
    title: content.title,
    body: content.body,
    action_label: content.actionLabel ?? null,
  };
};

const SAMPLES: Array<[NotificationType, Record<string, unknown>]> = [
  ['lesson_reminder_24h', { lessonTime: '4:00 PM' }],
  ['lesson_recap', { lessonTitle: 'Barre chords' }],
  ['lesson_cancelled', { lessonDate: 'Mon, Dec 1' }],
  ['lesson_rescheduled', { newDate: 'Tue 5:00 PM' }],
  ['assignment_created', { assignmentTitle: 'Slow run-through', dueDate: 'Dec 3' }],
  ['assignment_due_reminder', { assignmentTitle: 'Slow run-through', dueDate: 'tomorrow' }],
  ['assignment_overdue_alert', { assignmentTitle: 'Slow run-through', daysOverdue: 3 }],
  ['assignment_completed', { studentName: 'Emma Wright', assignmentTitle: 'Wonderwall intro' }],
  ['song_mastery_achievement', { songTitle: 'Wonderwall', songArtist: 'Oasis' }],
  ['milestone_reached', { milestone: '10 lessons' }],
  ['student_welcome', { studentName: 'Ola' }],
  ['trial_ending_reminder', { daysRemaining: 'in 3 days' }],
  ['teacher_daily_summary', { completedLessons: 4 }],
  ['weekly_progress_digest', { lessonsCompleted: 5, songsMastered: 2 }],
  ['calendar_conflict_alert', { conflictDate: 'Dec 2' }],
  ['webhook_expiration_notice', { integration: 'Google Calendar', expiresAt: 'tomorrow' }],
  ['admin_error_alert', { errorType: 'Timeout' }],
];

describe('localizeNotification', () => {
  describe.each(SAMPLES)('%s', (type, data) => {
    it('reads back as the generated English text under en', () => {
      const row = stored(type, data);
      const text = localizeNotification(row, tEn);
      // The welcome copy no longer names the app's old working title.
      const expectedBody = row.body?.replace('Guitar CRM', 'Strummy');
      expect(text).toEqual({
        title: row.title,
        body: expectedBody,
        actionLabel: row.action_label,
      });
    });

    it('is translated under pl: no English title, body or action left', () => {
      const row = stored(type, data);
      const text = localizeNotification(row, tPl);
      expect(text.title).not.toBe(row.title);
      expect(text.body).not.toBe(row.body);
      expect(text.actionLabel).not.toBe(row.action_label);
    });
  });

  it('writes the completed-assignment notification in Polish', () => {
    const text = localizeNotification(
      stored('assignment_completed', {
        studentName: 'Emma Wright',
        assignmentTitle: 'E2E Interact Assignment',
      }),
      tPl
    );
    expect(text).toEqual({
      title: 'Zadanie wykonane',
      body: 'Emma Wright: ukończono zadanie „E2E Interact Assignment”',
      actionLabel: 'Zobacz zadanie',
    });
  });

  it('keeps the placeholder variants readable when the generator had no value', () => {
    expect(localizeNotification(stored('lesson_reminder_24h', {}), tPl).body).toBe(
      'Masz lekcję o wyznaczonej porze'
    );
    expect(
      localizeNotification(stored('assignment_created', { assignmentTitle: 'Etiuda' }), tPl).body
    ).toBe('„Etiuda” — termin wkrótce');
  });

  it.each([
    [1, '1 dzień'],
    [2, '2 dni'],
    [5, '5 dni'],
    [22, '22 dni'],
  ])('declines Polish days overdue: %i -> %s', (days, expected) => {
    const text = localizeNotification(
      stored('assignment_overdue_alert', { assignmentTitle: 'Etiuda', daysOverdue: days }),
      tPl
    );
    expect(text.body).toBe(`Zadanie „Etiuda” jest po terminie o ${expected}`);
  });

  it('leaves rows with custom text untouched', () => {
    const custom: NotificationTextSource = {
      notification_type: 'assignment_completed',
      title: 'Kuba skończył zadanie',
      body: 'Wstęp Hotel California — czyste przejście w 100 BPM.',
      action_label: 'Otwórz',
    };
    expect(localizeNotification(custom, tPl)).toEqual({
      title: custom.title,
      body: custom.body,
      actionLabel: custom.action_label,
    });
  });

  it('keeps the stored body when it no longer matches the template', () => {
    const row = { ...stored('assignment_completed', {}), body: 'Something else entirely' };
    const text = localizeNotification(row, tPl);
    expect(text.title).toBe('Zadanie wykonane');
    expect(text.body).toBe('Something else entirely');
  });

  it('passes unknown types and empty bodies through', () => {
    const row: NotificationTextSource = {
      notification_type: 'future_type',
      title: 'Hello',
      body: null,
      action_label: null,
    };
    expect(localizeNotification(row, tPl)).toEqual({
      title: 'Hello',
      body: null,
      actionLabel: null,
    });
  });
});
