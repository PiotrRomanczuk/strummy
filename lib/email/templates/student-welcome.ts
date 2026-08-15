/**
 * Student Welcome Email Template
 *
 * Sent when a new student account is created.
 */

import {
  generateBaseEmailHtml,
  getBaseUrl,
  createKicker,
  createSectionHeading,
  createGreeting,
  createParagraph,
  createCardSection,
  createDetailRow,
  createSubsectionHeading,
  createNumberedFeatureList,
} from './base-template';
import type { StudentWelcomeData } from '@/types/notifications';

export function generateStudentWelcomeHtml(data: StudentWelcomeData): string {
  const { studentName, teacherName, loginLink, firstLessonDate } = data;

  const bodyContent = `
    ${createKicker('Welcome')}
    ${createSectionHeading('Your guitar journey begins here')}
    ${createGreeting(studentName)}
    ${createParagraph(
      `We&rsquo;re delighted to have you. You&rsquo;ve been enrolled with <strong>${teacherName}</strong>, and everything is ready for your first lesson.`
    )}

    ${createCardSection(`
      ${createDetailRow('Your teacher', teacherName)}
      ${firstLessonDate ? createDetailRow('First lesson', firstLessonDate) : ''}
    `)}

    ${createSubsectionHeading("What you'll find on your dashboard")}
    ${createNumberedFeatureList([
      {
        title: 'Lessons',
        description: 'Your upcoming schedule and the full history of what you&rsquo;ve covered.',
      },
      {
        title: 'Songs &amp; progress',
        description: 'Every song you&rsquo;re learning, from first read-through to mastered.',
      },
      {
        title: 'Assignments',
        description: 'Practice work from your teacher, with due dates and checklists.',
      },
      {
        title: 'Practice log',
        description: 'Track your practice time and watch your streaks and achievements grow.',
      },
    ])}

    ${createParagraph('Practice regularly, stay curious, and never hesitate to ask your teacher questions.')}
  `;

  return generateBaseEmailHtml({
    subject: 'Welcome to Strummy Guitar CRM!',
    preheader: `Get started with ${teacherName} and begin your guitar journey`,
    bodyContent,
    footerNote: 'Happy strumming!',
    ctaButton: {
      text: 'Log In to Your Dashboard',
      url: loginLink || `${getBaseUrl()}/sign-in`,
    },
  });
}
