/**
 * Base Email Template (v2 — "editorial letterpress")
 *
 * Reusable HTML email template with consistent styling, mobile-responsive design,
 * dark mode support, and unsubscribe footer.
 *
 * Design tokens (from the Strummy Email Redesign v2 review, claude.ai/design):
 * - Body copy: Georgia/Times serif (survives email clients that strip web fonts)
 * - Wordmark: Georgia italic, gold #c99a52 on a near-black colophon header #1a1712
 * - Page bg #f3f2f2 · surface #fdfcfa · ink #201f1d · secondary #4f4b45 · muted #85806f
 * - Hairline #e2dfda · row rule #eceae4 · tone rule (default) #b68235 · accent (text-safe) #8a5f24
 * - Tones: default/celebration share the gold accent; urgent switches to #a03d31
 * - Dark mode via prefers-color-scheme, mirrored token-for-token below
 *
 * Reusable blocks (createCardSection, createStatusBadge, etc.) live in
 * ./email-template-blocks and are re-exported here for existing imports.
 */

import { generateUnsubscribeToken } from '@/lib/notifications/unsubscribe-token';
import { logger } from '@/lib/logger';
import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/locales';
import { SERIF, TONES, type EmailTone, createCtaButton } from './email-template-blocks';
import { emailChrome } from './i18n';

export * from './email-template-blocks';

export interface BaseEmailTemplateOptions {
  subject: string;
  preheader?: string;
  bodyContent: string;
  footerNote?: string;
  recipientEmail?: string;
  recipientUserId?: string;
  notificationType?: string;
  tone?: EmailTone;
  /** Recipient's preferred language for the chrome (tagline, footer). Defaults to English. */
  locale?: AppLocale;
  ctaButton?: {
    text: string;
    url: string;
  };
}

/**
 * Get the base URL for links in emails
 */
export function getBaseUrl(): string {
  let baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL_REMOTE ||
    'http://localhost:3000';

  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  return baseUrl;
}

/**
 * Generate a signed unsubscribe link using HMAC token (prevents IDOR).
 * Falls back to the settings page if token generation fails or params are missing.
 */
function getUnsubscribeLink(recipientUserId?: string, notificationType?: string): string {
  const baseUrl = getBaseUrl();

  if (recipientUserId && notificationType) {
    try {
      const token = generateUnsubscribeToken(recipientUserId, notificationType);
      return `${baseUrl}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
    } catch (err) {
      logger.warn('[base-template] Could not generate signed unsubscribe token', {
        error: String(err),
      });
    }
  }

  // Fallback to settings page
  return `${baseUrl}/dashboard/settings`;
}

function renderDarkModeStyles(btnDark: string): string {
  return `
    @media (prefers-color-scheme: dark) {
      body, .email-bg { background-color: #100e0a !important; }
      .email-container { background-color: #17140f !important; border-color: #322d26 !important; }
      .email-footer { background-color: #14110d !important; border-color: #322d26 !important; }
      .text-primary { color: #ece8e0 !important; }
      .text-secondary { color: #c9c3b8 !important; }
      .text-muted { color: #8f887b !important; }
      .card { border-color: #322d26 !important; }
      .row-rule { border-color: #2a251f !important; }
      .hairline { border-color: #322d26 !important; }
      .kicker { color: #c99a52 !important; }
      .kicker-urgent { color: #d98a7e !important; }
      .btn { border-color: ${btnDark} !important; }
      .btn-a { color: ${btnDark} !important; }
      .badge-success { background-color: #22301f !important; color: #9dc79a !important; }
      .badge-warning { background-color: #33260f !important; color: #d9ab63 !important; }
      .badge-info { background-color: #1e2733 !important; color: #9db4cc !important; }
      .badge-urgent { background-color: #331713 !important; color: #d98a7e !important; }
      .badge-default { background-color: #26231e !important; color: #a19a8d !important; }
      .footer-link { color: #c99a52 !important; }
    }
    @media only screen and (max-width: 620px) {
      .email-outer { padding: 16px 8px !important; }
      .email-content { padding: 28px 20px !important; }
      .email-header { padding: 26px 20px !important; }
      .email-footer { padding: 22px 20px !important; }
    }
  `;
}

function renderHeader(locale: AppLocale): string {
  const chrome = emailChrome[locale];
  return `
    <tr><td class="email-header" style="background-color: #1a1712; padding: 30px 24px 28px; text-align: center;">
    <h1 style="color: #c99a52; margin: 0; font-size: 27px; font-weight: 400; letter-spacing: 0.04em; font-family: ${SERIF}; font-style: italic;">Strummy</h1>
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 12px auto 0;"><tr>
    <td style="width: 34px; border-top: 1px solid #4a4130; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td>
    <td style="padding: 0 10px; font-family: ${SERIF}; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: #9a927f; line-height: 1;">${chrome.tagline}</td>
    <td style="width: 34px; border-top: 1px solid #4a4130; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td>
    </tr></table>
    </td></tr>
  `;
}

function renderFooter(
  baseUrl: string,
  unsubscribeLink: string,
  footerNote: string | undefined,
  year: number,
  locale: AppLocale
): string {
  const chrome = emailChrome[locale];
  return `
    <tr><td class="email-footer" style="background-color: #f5f3f0; padding: 24px; text-align: center; border-top: 1px solid #e2dfda;">
    ${
      footerNote
        ? `<p class="text-secondary" style="margin: 0 0 14px 0; font-size: 14px; color: #4f4b45; font-family: ${SERIF}; font-style: italic;">${footerNote}</p>`
        : ''
    }
    <p style="margin: 0 0 14px 0; font-size: 12px; font-family: ${SERIF}; letter-spacing: 0.14em; text-transform: uppercase;">
    <a href="${baseUrl}/dashboard" class="footer-link" style="color: #8a5f24; text-decoration: none;">${chrome.viewDashboard}</a>
    <span class="text-muted" style="color: #c5c0b6; letter-spacing: 0; margin: 0 10px;">&middot;</span>
    <a href="${unsubscribeLink}" class="text-muted" style="color: #85806f; text-decoration: none;">${chrome.notificationSettings}</a>
    </p>
    <p class="text-muted" style="margin: 0 0 6px 0; font-size: 12px; color: #85806f; font-family: ${SERIF};">${chrome.receivingBecause}</p>
    <p class="text-muted" style="margin: 0; font-size: 12px; color: #85806f; font-family: ${SERIF};">&copy; ${year} Strummy &middot; ${chrome.allRightsReserved}</p>
    </td></tr>
  `;
}

/**
 * Generate the complete email HTML using the base template
 */
export function generateBaseEmailHtml(options: BaseEmailTemplateOptions): string {
  const {
    subject,
    preheader,
    bodyContent,
    footerNote,
    recipientUserId,
    notificationType,
    tone = 'default',
    locale = DEFAULT_LOCALE,
    ctaButton,
  } = options;

  const baseUrl = getBaseUrl();
  const unsubscribeLink = getUnsubscribeLink(recipientUserId, notificationType);
  const currentYear = new Date().getFullYear();
  const t = TONES[tone];

  return `
    <!DOCTYPE html>
    <html lang="${locale}" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>${subject}</title>
      <!--[if mso]>
      <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
      <style> * { font-family: Georgia, 'Times New Roman', serif !important; } </style>
      <![endif]-->
      <style>${renderDarkModeStyles(t.btnDark)}</style>
    </head>
    <body class="email-bg" style="margin: 0; padding: 0; background-color: #f3f2f2; -webkit-font-smoothing: antialiased;">
    ${
      preheader
        ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
        : ''
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="background-color: #f3f2f2;"><tr>
    <td align="center" class="email-outer" style="padding: 40px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="email-container" style="width: 600px; max-width: 600px; background-color: #fdfcfa; border: 1px solid #dedbd6; border-radius: 4px; border-collapse: separate; overflow: hidden;">
    <!-- Tone rule -->
    <tr><td style="height: 3px; line-height: 3px; font-size: 3px; background-color: ${t.rule};">&nbsp;</td></tr>
    <!-- Header : colophon -->
    ${renderHeader(locale)}
    <!-- Content -->
    <tr><td class="email-content" style="padding: 36px 32px 32px;">
    ${bodyContent}
    ${ctaButton ? createCtaButton(ctaButton.text, ctaButton.url, tone) : ''}
    </td></tr>
    <!-- Footer -->
    ${renderFooter(baseUrl, unsubscribeLink, footerNote, currentYear, locale)}
    </table>
    </td></tr></table>
    </body>
    </html>
  `;
}
