/**
 * Assignment Overdue Alert Email Template
 *
 * Sent when an assignment becomes overdue.
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
import type { AssignmentOverdueAlertData } from '@/types/notifications';

export function generateAssignmentOverdueAlertHtml(data: AssignmentOverdueAlertData): string {
  const { studentName, assignmentTitle, dueDate, daysOverdue, assignmentLink } = data;
  const dayWord = daysOverdue === 1 ? 'day' : 'days';

  const bodyContent = `
    ${createKicker('Assignments &middot; Action needed', 'urgent')}
    ${createSectionHeading('An assignment is overdue')}
    ${createGreeting(studentName)}
    ${createParagraph(
      `Your assignment <em>&ldquo;${assignmentTitle}&rdquo;</em> is now ${daysOverdue} ${dayWord} past its due date. It&rsquo;s not too late to catch up &mdash; and your teacher is glad to help if you&rsquo;re stuck.`
    )}

    ${createCardSection(`
      ${createSubsectionHeading(assignmentTitle)}
      ${createDetailRow('Was due', `<span style="color: #a03d31;">${dueDate}</span>`)}
      ${createDetailRow('Days overdue', `<span style="color: #a03d31; font-weight: 600;">${daysOverdue}</span>`)}
      <div style="padding-top: 14px;">
        ${createStatusBadge('Overdue', 'urgent')}
      </div>
    `)}
  `;

  return generateBaseEmailHtml({
    subject: `Overdue Assignment: ${assignmentTitle}`,
    preheader: `${assignmentTitle} is ${daysOverdue} ${dayWord} overdue`,
    bodyContent,
    tone: 'urgent',
    footerNote: 'Your teacher is here to help.',
    ctaButton: {
      text: 'Complete Assignment',
      url: assignmentLink,
    },
  });
}
