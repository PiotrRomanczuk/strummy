/**
 * Milestone Reached Email Template
 *
 * Sent when a student reaches a learning milestone.
 */

import {
  generateBaseEmailHtml,
  createGreeting,
  createParagraph,
  createCertificateCard,
  createDetailRow,
  createCardSection,
} from './base-template';

interface MilestoneReachedData {
  studentName: string;
  milestone: string;
  milestoneDescription?: string;
  achievedDate: string;
}

export function generateMilestoneReachedHtml(data: MilestoneReachedData): string {
  const { studentName, milestone, milestoneDescription, achievedDate } = data;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const bodyContent = `
    ${createGreeting(studentName)}
    ${createParagraph(
      "Congratulations! Your hard work is paying off. You've just reached a new milestone in your guitar journey."
    )}

    ${createCertificateCard({
      kicker: 'Milestone Reached',
      title: milestone,
      dateLabel: `Achieved on ${achievedDate}`,
      badgeText: 'Achievement unlocked',
    })}

    ${milestoneDescription ? createCardSection(createDetailRow('Details', milestoneDescription)) : ''}

    ${createParagraph('Every milestone brings you closer to mastering the guitar. Keep practicing!')}
  `;

  return generateBaseEmailHtml({
    subject: `Milestone Reached: ${milestone}`,
    preheader: `You reached a new milestone: ${milestone}`,
    bodyContent,
    tone: 'celebration',
    footerNote: 'Keep strumming!',
    ctaButton: {
      text: 'View Achievements',
      url: `${baseUrl}/dashboard`,
    },
  });
}
