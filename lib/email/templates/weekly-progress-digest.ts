/**
 * Weekly Progress Digest Email Template
 *
 * Sent to students at the end of each week summarizing their progress.
 */

import {
  generateBaseEmailHtml,
  createKicker,
  createSectionHeading,
  createGreeting,
  createParagraph,
  createCardSection,
  createSubsectionHeading,
} from './base-template';
import type { WeeklyProgressDigestData } from '@/types/notifications';

const SERIF = "Georgia, 'Times New Roman', Times, serif";

function renderStatTile(value: string | number, label: string): string {
  return `
    <td style="width: 33%; vertical-align: top; padding: 0 5px;">
      <div class="card" style="border: 1px solid #e2dfda; border-radius: 4px; padding: 18px 8px; text-align: center;">
        <div class="text-primary" style="font-family: ${SERIF}; font-size: 34px; font-weight: 400; color: #201f1d; font-variant-numeric: tabular-nums; line-height: 1;">${value}</div>
        <div class="text-muted" style="font-family: ${SERIF}; font-size: 10px; letter-spacing: 0.16em; color: #85806f; text-transform: uppercase; margin-top: 9px;">${label}</div>
      </div>
    </td>
  `;
}

export function generateWeeklyProgressDigestHtml(data: WeeklyProgressDigestData): string {
  const {
    recipientName,
    weekStart,
    weekEnd,
    lessonsCompleted,
    songsMastered,
    practiceTime,
    highlights,
    upcomingLessons,
  } = data;

  const bodyContent = `
    ${createKicker(`Weekly Progress &middot; ${weekStart} &ndash; ${weekEnd}`)}
    ${createSectionHeading('Your week in review')}
    ${createGreeting(recipientName)}
    ${createParagraph(`Here's a summary of your progress from ${weekStart} to ${weekEnd}. Great work this week!`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 24px;"><tr>
      ${renderStatTile(lessonsCompleted, 'Lessons')}
      ${renderStatTile(songsMastered, 'Songs')}
      ${renderStatTile(`${practiceTime}h`, 'Practice')}
    </tr></table>

    ${
      highlights.length > 0
        ? createCardSection(`
      ${createSubsectionHeading("This week's highlights")}
      <ul style="margin: 0; padding-left: 20px; color: #4f4b45; line-height: 1.8; font-size: 15px; font-family: ${SERIF};">
        ${highlights.map((highlight) => `<li>${highlight}</li>`).join('')}
      </ul>
    `)
        : ''
    }

    ${
      upcomingLessons.length > 0
        ? createCardSection(`
      ${createSubsectionHeading('Coming up next week')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
        ${upcomingLessons
          .map(
            (lesson, index) => `
          <tr style="${index !== upcomingLessons.length - 1 ? 'border-bottom: 1px solid #eceae4;' : ''}">
            <td style="padding: 12px 0; font-family: ${SERIF};">
              <div class="text-primary" style="color: #201f1d; font-weight: 600; font-size: 15px;">${lesson.date}</div>
              <div class="text-muted" style="color: #85806f; font-size: 14px; margin-top: 2px;">${lesson.title || 'Regular Lesson'}</div>
            </td>
          </tr>
        `
          )
          .join('')}
      </table>
    `)
        : ''
    }

    <p class="text-secondary" style="margin: 0; font-family: ${SERIF}; font-size: 15px; font-style: italic; color: #4f4b45; text-align: center; line-height: 1.65;">
      Keep up the fantastic work! Consistency is the key to mastery.
    </p>
  `;

  return generateBaseEmailHtml({
    subject: 'Your Weekly Progress Report',
    preheader: `${lessonsCompleted} lessons, ${songsMastered} songs mastered this week`,
    bodyContent,
    tone: 'celebration',
    footerNote: 'This is an opt-in digest. Manage your preferences anytime.',
  });
}
