/**
 * Calendar Conflict Alert Email Template
 *
 * Sent to teachers when two lessons are scheduled at the same time.
 */

import {
  generateBaseEmailHtml,
  createKicker,
  createSectionHeading,
  createGreeting,
  createParagraph,
  createCardSection,
  createDetailRow,
  createStatusBadge,
} from './base-template';

interface CalendarConflictAlertData {
  teacherName: string;
  conflictDate: string;
  conflictTime: string;
  lesson1: string;
  lesson2: string;
  resolveLink?: string;
}

export function generateCalendarConflictAlertHtml(data: CalendarConflictAlertData): string {
  const { teacherName, conflictDate, conflictTime, lesson1, lesson2, resolveLink } = data;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const bodyContent = `
    ${createKicker('Calendar &middot; Action needed', 'urgent')}
    ${createSectionHeading('Scheduling conflict detected')}
    ${createGreeting(teacherName)}
    ${createParagraph(
      'Two lessons are scheduled at the same time. Please resolve this conflict to avoid double-booking.'
    )}

    ${createCardSection(`
      ${createDetailRow('Date', conflictDate)}
      ${createDetailRow('Time', conflictTime)}
      <div style="padding-top: 14px;">
        ${createStatusBadge('Conflict', 'urgent')}
      </div>
    `)}

    ${createCardSection(`
      <p class="text-muted" style="margin: 0 0 10px 0; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #85806f;">Conflicting lessons</p>
      ${createDetailRow('Lesson 1', lesson1)}
      ${createDetailRow('Lesson 2', lesson2)}
    `)}

    ${createParagraph('Please reschedule one of these lessons to resolve the conflict.')}
  `;

  return generateBaseEmailHtml({
    subject: 'Calendar Conflict Detected',
    preheader: `Two lessons overlap on ${conflictDate} at ${conflictTime}`,
    bodyContent,
    tone: 'urgent',
    ctaButton: {
      text: 'Resolve Conflict',
      url: resolveLink || `${baseUrl}/dashboard`,
    },
  });
}
