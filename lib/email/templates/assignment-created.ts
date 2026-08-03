/**
 * Assignment Created Email Template
 *
 * Sent when a teacher creates a new assignment for a student.
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

interface AssignmentCreatedData {
  studentName: string;
  assignmentTitle: string;
  assignmentDescription?: string;
  dueDate: string;
  teacherName: string;
  assignmentLink?: string;
}

export function generateAssignmentCreatedHtml(data: AssignmentCreatedData): string {
  const {
    studentName,
    assignmentTitle,
    assignmentDescription,
    dueDate,
    teacherName,
    assignmentLink,
  } = data;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const bodyContent = `
    ${createKicker('Assignments')}
    ${createSectionHeading('New assignment')}
    ${createGreeting(studentName)}
    ${createParagraph(
      `Your teacher <strong>${teacherName}</strong> has given you a new assignment.`
    )}

    ${createCardSection(`
      <div style="margin-bottom: 16px;">
        ${createSubsectionHeading(assignmentTitle)}
        ${assignmentDescription ? createParagraph(assignmentDescription) : ''}
      </div>
      ${createDetailRow('Due date', dueDate)}
      ${createDetailRow('Assigned by', teacherName)}
      <div style="padding-top: 14px;">
        ${createStatusBadge('New', 'info')}
      </div>
    `)}

    ${createParagraph('Get started early and reach out to your teacher if you have any questions!')}
  `;

  return generateBaseEmailHtml({
    subject: `New Assignment: ${assignmentTitle}`,
    preheader: `${teacherName} assigned "${assignmentTitle}" — due ${dueDate}`,
    bodyContent,
    footerNote: 'Good luck with your practice!',
    ctaButton: {
      text: 'View Assignment',
      url: assignmentLink || `${baseUrl}/dashboard`,
    },
  });
}
