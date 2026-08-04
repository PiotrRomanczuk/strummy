/**
 * Weekly Insights Email Template
 *
 * Sent weekly to teachers with stat tiles, achievements, and action items.
 */

import type { WeeklyInsightsData } from '@/lib/services/weekly-insights';
import {
  generateBaseEmailHtml,
  createKicker,
  createSectionHeading,
  createGreeting,
  createParagraph,
  createSubsectionHeading,
  createDivider,
  createStatRow,
  createListBox,
} from './base-template';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function generateWeeklyInsightsHtml(data: WeeklyInsightsData): string {
  const {
    teacherName,
    dateRange,
    lessonsCompleted,
    newStudents,
    songsMastered,
    atRiskStudents,
    overdueAssignments,
    lessonsCancelled,
  } = data;

  const weekStart = formatDate(dateRange.start);
  const weekEnd = formatDate(dateRange.end);

  const atRiskItems = atRiskStudents.map((s) => ({
    text: s.name,
    subtext: `Health score ${s.healthScore} &middot; ${s.overdueAssignments} overdue`,
  }));
  const overdueItems = overdueAssignments.map((a) => ({
    text: `${a.studentName} &mdash; ${a.assignmentTitle}`,
    subtext: `Due ${formatDate(a.dueDate)}`,
  }));
  const masteryItems = songsMastered.map((s) => ({
    text: `${s.studentName} mastered &ldquo;${s.songTitle}&rdquo;`,
    subtext: formatDate(s.masteredAt),
  }));
  const newStudentItems = newStudents.map((s) => ({
    text: s.name,
    subtext: s.email,
  }));

  const hasAchievements = masteryItems.length > 0 || newStudentItems.length > 0;
  const hasActionItems = atRiskItems.length > 0 || overdueItems.length > 0;

  const bodyContent = `
    ${createKicker(`Weekly Insights &middot; ${weekStart} &ndash; ${weekEnd}`)}
    ${createSectionHeading('The week in your studio')}
    ${createGreeting(teacherName)}
    ${createParagraph('A summary of your teaching activity from last week.')}

    ${createStatRow(
      { value: lessonsCompleted, label: 'Lessons completed' },
      { value: newStudents.length, label: 'New students' }
    )}
    ${createStatRow(
      { value: songsMastered.length, label: 'Songs mastered' },
      { value: lessonsCancelled, label: 'Lessons cancelled' }
    )}

    ${
      hasAchievements
        ? `
      ${createDivider()}
      ${createSubsectionHeading('Student achievements')}
      ${masteryItems.length > 0 ? createListBox('Songs mastered', masteryItems.length, masteryItems, 'success') : ''}
      ${newStudentItems.length > 0 ? createListBox('New students', newStudentItems.length, newStudentItems, 'success') : ''}
    `
        : ''
    }

    ${createDivider()}
    ${
      hasActionItems
        ? `
      ${createSubsectionHeading('Action items')}
      ${atRiskItems.length > 0 ? createListBox('At-risk students', atRiskItems.length, atRiskItems, 'urgent') : ''}
      ${overdueItems.length > 0 ? createListBox('Overdue assignments', overdueItems.length, overdueItems, 'warning') : ''}
    `
        : `
      <p class="text-secondary" style="margin: 0; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 15px; font-style: italic; color: #4f4b45; text-align: center; line-height: 1.65;">
        All caught up &mdash; no action items this week. Great work!
      </p>
    `
    }
  `;

  return generateBaseEmailHtml({
    subject: `Weekly Insights: ${weekStart} - ${weekEnd}`,
    preheader: `${lessonsCompleted} lessons, ${songsMastered.length} songs mastered this week`,
    bodyContent,
    footerNote: 'Ready to dive deeper into your data?',
    ctaButton: {
      text: 'View Full Dashboard',
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    },
  });
}
