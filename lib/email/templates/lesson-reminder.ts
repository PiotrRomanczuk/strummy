/**
 * Lesson Reminder Email Template
 *
 * Sent 24 hours before a scheduled lesson.
 */

import {
  generateBaseEmailHtml,
  createKicker,
  createSectionHeading,
  createGreeting,
  createParagraph,
  createCardSection,
  createDetailRow,
} from './base-template';
import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/locales';
import { lessonReminder } from './i18n';

export interface LessonReminderData {
  studentName: string;
  lessonDate: string;
  lessonTime: string;
  location?: string;
  agenda?: string;
  locale?: AppLocale;
}

export function generateLessonReminderHtml(data: LessonReminderData): string {
  const { studentName, lessonDate, lessonTime, location, agenda, locale = DEFAULT_LOCALE } = data;
  const t = lessonReminder[locale];

  const bodyContent = `
    ${createKicker(t.kicker)}
    ${createSectionHeading(t.heading)}
    ${createGreeting(studentName, locale)}
    ${createParagraph(t.intro)}

    ${createCardSection(`
      ${createDetailRow(t.date, lessonDate)}
      ${createDetailRow(t.time, lessonTime)}
      ${location ? createDetailRow(t.location, location) : ''}
      ${agenda ? createDetailRow(t.agenda, agenda) : ''}
    `)}
  `;

  return generateBaseEmailHtml({
    subject: t.subject,
    preheader: `Your lesson is scheduled for ${lessonDate} at ${lessonTime}`,
    bodyContent,
    locale,
    footerNote: t.footerNote,
    ctaButton: {
      text: t.cta,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    },
  });
}
