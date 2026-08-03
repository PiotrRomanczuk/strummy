/**
 * Admin Error Alert Email Template
 *
 * Sent to admins when a system error occurs.
 * Reads as an internal ops notice: urgent tone, no greeting, code block for the trace.
 */

import {
  generateBaseEmailHtml,
  createKicker,
  createSectionHeading,
  createParagraph,
  createCardSection,
  createDetailRow,
  createStatusBadge,
  createCodeBlock,
} from './base-template';

interface AdminErrorAlertData {
  adminName?: string;
  errorType: string;
  errorMessage: string;
  timestamp: string;
  affectedService?: string;
  stackTrace?: string;
}

export function generateAdminErrorAlertHtml(data: AdminErrorAlertData): string {
  const { errorType, errorMessage, timestamp, affectedService, stackTrace } = data;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const bodyContent = `
    ${createKicker('System Alert &middot; Internal', 'urgent')}
    ${createSectionHeading(errorType)}
    ${createParagraph('A system error has been detected that may require your attention.')}

    ${createCardSection(`
      ${createDetailRow('Error Type', errorType)}
      ${createDetailRow('Message', errorMessage)}
      ${createDetailRow('Timestamp', timestamp)}
      ${affectedService ? createDetailRow('Affected Service', affectedService) : ''}
      <div style="padding-top: 14px;">
        ${createStatusBadge('Error', 'urgent')}
      </div>
    `)}

    ${
      stackTrace
        ? `
      <p class="text-muted" style="margin: 0 0 8px 0; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #85806f;">
        Stack trace
      </p>
      ${createCodeBlock(
        `${stackTrace.slice(0, 1000)}${stackTrace.length > 1000 ? '\n... (truncated)' : ''}`,
        'urgent'
      )}
    `
        : ''
    }
  `;

  return generateBaseEmailHtml({
    subject: `System Alert: ${errorType}`,
    preheader: `Error detected: ${errorMessage.slice(0, 80)}`,
    bodyContent,
    tone: 'urgent',
    ctaButton: {
      text: 'Open System Health',
      url: `${baseUrl}/dashboard/health`,
    },
  });
}
