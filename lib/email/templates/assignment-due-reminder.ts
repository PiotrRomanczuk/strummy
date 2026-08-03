/**
 * Assignment Due Reminder Email Template
 *
 * Sent 2 days before an assignment is due.
 */

import {
  generateBaseEmailHtml,
  createKicker,
  createSectionHeading,
  createGreeting,
  createParagraph,
  createCardSection,
  createSubsectionHeading,
  createDetailRow,
  createStatusBadge,
} from './base-template';
import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/locales';
import { assignmentDueReminder } from './i18n';
import type { AssignmentDueReminderData } from '@/types/notifications';

export function generateAssignmentDueReminderHtml(
  data: AssignmentDueReminderData & { locale?: AppLocale }
): string {
  const {
    studentName,
    assignmentTitle,
    dueDate,
    assignmentDescription,
    assignmentLink,
    locale = DEFAULT_LOCALE,
  } = data;
  const t = assignmentDueReminder[locale];

  const bodyContent = `
    ${createKicker(t.kicker)}
    ${createSectionHeading(t.heading)}
    ${createGreeting(studentName, locale)}
    ${createParagraph(t.intro)}

    ${createCardSection(`
      <div style="margin-bottom: 16px;">
        ${createSubsectionHeading(assignmentTitle)}
        ${assignmentDescription ? createParagraph(assignmentDescription) : ''}
      </div>

      ${createDetailRow(t.dueDate, `<span style="color: #8a5f24; font-weight: 600;">${dueDate}</span>`)}

      <div style="padding-top: 14px;">
        ${createStatusBadge(t.dueSoon, 'warning')}
      </div>
    `)}

    ${createParagraph(t.outro)}
  `;

  return generateBaseEmailHtml({
    subject: t.subject(assignmentTitle),
    preheader: `Don't forget - ${assignmentTitle} is due ${dueDate}`,
    bodyContent,
    locale,
    footerNote: t.footerNote,
    ctaButton: {
      text: t.cta,
      url: assignmentLink,
    },
  });
}
