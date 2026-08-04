/**
 * Teacher Daily Summary Email Template
 *
 * Sent to teachers each morning with the day's schedule and pending items.
 */

import {
  generateBaseEmailHtml,
  createKicker,
  createSectionHeading,
  createGreeting,
  createParagraph,
  createCardSection,
  createSubsectionHeading,
  createListBox,
} from './base-template';
import type { TeacherDailySummaryData } from '@/types/notifications';

const SERIF = "Georgia, 'Times New Roman', Times, serif";

function renderStatTile(value: number, label: string): string {
  return `
    <td style="width: 33%; vertical-align: top; padding: 0 5px;">
      <div class="card" style="border: 1px solid #e2dfda; border-radius: 4px; padding: 18px 8px; text-align: center;">
        <div class="text-primary" style="font-family: ${SERIF}; font-size: 34px; font-weight: 400; color: #201f1d; font-variant-numeric: tabular-nums; line-height: 1;">${value}</div>
        <div class="text-muted" style="font-family: ${SERIF}; font-size: 10px; letter-spacing: 0.16em; color: #85806f; text-transform: uppercase; margin-top: 9px;">${label}</div>
      </div>
    </td>
  `;
}

export function generateTeacherDailySummaryHtml(data: TeacherDailySummaryData): string {
  const {
    teacherName,
    date,
    upcomingLessons,
    completedLessons,
    pendingAssignments,
    recentAchievements,
  } = data;

  const lessonRows = upcomingLessons
    .map(
      (lesson, index) => `
    <tr style="${index !== upcomingLessons.length - 1 ? 'border-bottom: 1px solid #eceae4;' : ''}">
      <td style="padding: 12px 0; font-family: ${SERIF};">
        <div class="text-primary" style="color: #201f1d; font-weight: 600; font-size: 15px;">${lesson.time}</div>
        <div class="text-secondary" style="color: #4f4b45; font-size: 14px; margin-top: 4px;">${lesson.studentName}</div>
      </td>
      <td style="text-align: right; padding: 12px 0; font-family: ${SERIF};">
        <div class="text-muted" style="color: #85806f; font-size: 14px;">${lesson.title || 'Regular Lesson'}</div>
      </td>
    </tr>
  `
    )
    .join('');

  const achievementItems = recentAchievements.map((a) => ({
    text: a.studentName,
    subtext: a.achievement,
  }));

  const bodyContent = `
    ${createKicker('Daily Summary')}
    ${createSectionHeading(`Your day, ${date}`)}
    ${createGreeting(teacherName)}
    ${createParagraph("Here's your summary for today:")}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 24px;"><tr>
      ${renderStatTile(upcomingLessons.length, 'Lessons today')}
      ${renderStatTile(pendingAssignments, 'Pending items')}
      ${renderStatTile(completedLessons, 'Completed')}
    </tr></table>

    ${
      upcomingLessons.length > 0
        ? createCardSection(`
      ${createSubsectionHeading("Today's lessons")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">${lessonRows}</table>
    `)
        : ''
    }

    ${
      achievementItems.length > 0
        ? createListBox(
            'Recent student achievements',
            achievementItems.length,
            achievementItems,
            'success'
          )
        : ''
    }

    ${createParagraph('Have a great teaching day!')}
  `;

  return generateBaseEmailHtml({
    subject: `Your Daily Summary - ${date}`,
    preheader: `${upcomingLessons.length} lessons today`,
    bodyContent,
    footerNote: 'This is an opt-in digest. Manage your preferences anytime.',
  });
}
