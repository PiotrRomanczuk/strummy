/**
 * Reusable HTML building blocks for the v2 "editorial letterpress" email
 * templates. See base-template.ts for the outer wrapper and design tokens.
 */

import type { AppLocale } from '@/i18n/locales';
import { greeting } from './i18n';

export const SERIF = "Georgia, 'Times New Roman', Times, serif";
export const MONO = "'Courier New', Courier, monospace";

export type EmailTone = 'default' | 'celebration' | 'urgent';

export const TONES: Record<EmailTone, { rule: string; btn: string; btnDark: string }> = {
  default: { rule: '#b68235', btn: '#8a5f24', btnDark: '#c99a52' },
  celebration: { rule: '#b68235', btn: '#8a5f24', btnDark: '#c99a52' },
  urgent: { rule: '#a03d31', btn: '#a03d31', btnDark: '#d98a7e' },
};

/**
 * Helper function to create a card section (commonly used in emails)
 */
export function createCardSection(content: string): string {
  return `
    <div class="card" style="margin: 0 0 24px 0; border: 1px solid #e2dfda; border-radius: 4px; padding: 16px 20px; background-color: transparent;">
      ${content}
    </div>
  `;
}

/**
 * Helper function to create a detail row (label + value)
 */
export function createDetailRow(label: string, value: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; border-bottom: 1px solid #eceae4;" class="row-rule"><tr>
    <td style="padding: 11px 0; font-family: ${SERIF}; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #85806f; width: 40%; vertical-align: top;" class="text-muted">${label}</td>
    <td style="padding: 11px 0; font-family: ${SERIF}; font-size: 15px; line-height: 1.45; color: #201f1d; text-align: right;" class="text-primary">${value}</td>
    </tr></table>
  `;
}

/**
 * Helper function to create a status badge (translucent style matching dashboard)
 */
export function createStatusBadge(
  text: string,
  color: 'success' | 'warning' | 'info' | 'urgent' | 'default' = 'default'
): string {
  const colorMap = {
    success: { bg: '#e7efe4', text: '#3d6b40' },
    warning: { bg: '#f7ecd8', text: '#8a5f24' },
    info: { bg: '#e4e9ef', text: '#44586e' },
    urgent: { bg: '#f6e4e1', text: '#a03d31' },
    default: { bg: '#ecebe7', text: '#6d675e' },
  };

  const colors = colorMap[color] || colorMap.default;

  return `
    <span class="badge-${color}" style="display: inline-block; padding: 4px 12px; border-radius: 3px; font-family: ${SERIF}; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; background-color: ${colors.bg}; color: ${colors.text}; white-space: nowrap;">
      ${text}
    </span>
  `;
}

/**
 * Helper function to create a divider
 */
export function createDivider(): string {
  return `
    <hr class="hairline" style="border: none; border-top: 1px solid #e2dfda; margin: 28px 0;">
  `;
}

/**
 * Helper function to format greeting with recipient name
 */
export function createGreeting(name: string, locale: AppLocale = 'en'): string {
  return `
    <p class="text-secondary" style="color: #4f4b45; margin: 0 0 20px 0; line-height: 1.65; font-size: 16px; font-family: ${SERIF};">
      ${greeting(locale, name)}
    </p>
  `;
}

/**
 * Helper function to create a section heading
 */
export function createSectionHeading(heading: string): string {
  return `
    <h2 class="text-primary" style="color: #201f1d; margin: 0 0 18px 0; font-size: 25px; font-weight: 400; line-height: 1.25; font-family: ${SERIF}; letter-spacing: 0.01em;">
      ${heading}
    </h2>
  `;
}

/**
 * Helper function to create a subsection heading
 */
export function createSubsectionHeading(heading: string): string {
  return `
    <h3 class="text-primary" style="color: #201f1d; font-size: 17px; font-weight: 600; margin: 0 0 12px 0; font-family: ${SERIF};">
      ${heading}
    </h3>
  `;
}

/**
 * Helper function to create body text paragraph
 */
export function createParagraph(text: string): string {
  return `
    <p class="text-secondary" style="color: #4f4b45; margin: 0 0 16px 0; line-height: 1.65; font-size: 15px; font-family: ${SERIF};">
      ${text}
    </p>
  `;
}

/**
 * Small uppercase eyebrow label above a section heading, e.g. "Lessons" or
 * "System Alert · Internal". Pass tone 'urgent' to switch to the red ink.
 */
export function createKicker(text: string, tone: EmailTone = 'default'): string {
  const color = tone === 'urgent' ? '#a03d31' : '#8a5f24';
  const cls = tone === 'urgent' ? 'kicker-urgent' : 'kicker';
  return `
    <p class="${cls}" style="margin: 0 0 10px 0; font-family: ${SERIF}; font-size: 12px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: ${color};">
      ${text}
    </p>
  `;
}

/**
 * Two stat tiles side by side (e.g. "14 Lessons completed" / "2 New students").
 */
export function createStatRow(
  left: { value: string | number; label: string },
  right: { value: string | number; label: string }
): string {
  const cell = (stat: { value: string | number; label: string }, pad: 'right' | 'left') => `
    <td style="width: 50%; padding-${pad}: 5px; vertical-align: top;">
      <div class="card" style="border: 1px solid #e2dfda; border-radius: 4px; padding: 18px 8px; text-align: center;">
        <div class="text-primary" style="font-family: ${SERIF}; font-size: 34px; font-weight: 400; color: #201f1d; font-variant-numeric: tabular-nums; line-height: 1;">${stat.value}</div>
        <div class="text-muted" style="font-family: ${SERIF}; font-size: 10px; letter-spacing: 0.16em; color: #85806f; text-transform: uppercase; margin-top: 9px;">${stat.label}</div>
      </div>
    </td>
  `;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 10px;"><tr>${cell(left, 'right')}${cell(right, 'left')}</tr></table>
  `;
}

/**
 * A titled card containing a short list of rows (label + optional italic subtext),
 * used for achievement/action-item groupings (e.g. "Songs mastered · 3").
 */
export function createListBox(
  title: string,
  count: number,
  items: Array<{ text: string; subtext?: string }>,
  tone: 'success' | 'urgent' | 'warning' | 'default' = 'default'
): string {
  const titleColor = {
    success: '#3d6b40',
    urgent: '#a03d31',
    warning: '#8a5f24',
    default: '#6d675e',
  }[tone];
  const rows = items
    .map(
      (item) => `
      <tr><td style="padding: 9px 0; border-top: 1px solid #eceae4;" class="row-rule">
      <div class="text-primary" style="font-family: ${SERIF}; font-size: 14px; color: #201f1d;">${item.text}</div>
      ${
        item.subtext
          ? `<div class="text-muted" style="font-family: ${SERIF}; font-size: 12px; color: #85806f; margin-top: 2px; font-style: italic;">${item.subtext}</div>`
          : ''
      }
      </td></tr>
    `
    )
    .join('');
  return `
    <div class="card" style="border: 1px solid #e2dfda; border-radius: 4px; padding: 14px 20px 8px; margin-bottom: 16px;">
    <p style="margin: 0 0 10px 0; font-family: ${SERIF}; font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: ${titleColor};">${title} &nbsp;&middot;&nbsp; ${count}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">${rows}</table>
    </div>
  `;
}

/**
 * Numbered feature list using roman numerals (i. ii. iii.) — used for
 * onboarding "what you'll find" style lists.
 */
export function createNumberedFeatureList(
  items: Array<{ title: string; description: string }>
): string {
  const numerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];
  const rows = items
    .map(
      (item, index) => `
    <tr>
    <td style="width: 40px; vertical-align: top; padding: 13px 0; border-top: 1px solid #eceae4;" class="row-rule">
      <span style="font-family: ${SERIF}; font-size: 20px; color: #b68235; font-style: italic;">${numerals[index] || index + 1}.</span>
    </td>
    <td style="vertical-align: top; padding: 13px 0; border-top: 1px solid #eceae4;" class="row-rule">
      <div class="text-primary" style="font-family: ${SERIF}; font-size: 15px; font-weight: 600; color: #201f1d;">${item.title}</div>
      <div class="text-secondary" style="font-family: ${SERIF}; font-size: 14px; color: #4f4b45; line-height: 1.55; margin-top: 2px;">${item.description}</div>
    </td></tr>
  `
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 8px;">${rows}</table>`;
}

/**
 * Monospace code/stack-trace block with a tone-colored left rule.
 */
export function createCodeBlock(content: string, tone: EmailTone = 'urgent'): string {
  const t = TONES[tone];
  return `
    <div class="card" style="border: 1px solid #e2dfda; border-left: 3px solid ${t.rule}; border-radius: 4px; background-color: #f7f5f2; padding: 14px 16px; font-family: ${MONO}; font-size: 12px; line-height: 1.55; color: #4f4b45; white-space: pre-wrap; word-break: break-all;">${content}</div>
  `;
}

/**
 * Certificate-style card for celebratory achievements (song mastery, milestones):
 * a double-bordered frame with a kicker, italic title, byline, ornamental rule,
 * date, and a status badge.
 */
export function createCertificateCard(options: {
  kicker: string;
  title: string;
  subtitle?: string;
  dateLabel: string;
  badgeText: string;
}): string {
  const { kicker, title, subtitle, dateLabel, badgeText } = options;
  return `
    <div style="border: 1px solid #b68235; border-radius: 4px; padding: 5px; margin: 8px 0 24px;">
      <div style="border: 1px solid #e5d3b3; border-radius: 2px; padding: 32px 24px; text-align: center;">
        <p class="kicker" style="margin: 0 0 14px 0; font-family: ${SERIF}; font-size: 11px; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; color: #8a5f24;">${kicker}</p>
        <h2 class="text-primary" style="margin: 0 0 6px 0; font-family: ${SERIF}; font-size: 30px; font-weight: 400; font-style: italic; color: #201f1d; line-height: 1.2;">&ldquo;${title}&rdquo;</h2>
        ${
          subtitle
            ? `<p class="text-secondary" style="margin: 0 0 20px 0; font-family: ${SERIF}; font-size: 15px; color: #4f4b45;">${subtitle}</p>`
            : ''
        }
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width: 44px; border-top: 1px solid #d9c9a8; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td>
          <td style="padding: 0 12px; font-family: ${SERIF}; font-size: 13px; color: #8a5f24; line-height: 1;">&#9834;</td>
          <td style="width: 44px; border-top: 1px solid #d9c9a8; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td>
        </tr></table>
        <p class="text-muted" style="margin: 18px 0 12px 0; font-family: ${SERIF}; font-size: 13px; color: #85806f;">${dateLabel}</p>
        <span class="badge-success" style="display: inline-block; padding: 4px 12px; border-radius: 3px; font-family: ${SERIF}; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; background-color: #e7efe4; color: #3d6b40; white-space: nowrap;">${badgeText}</span>
      </div>
    </div>
  `;
}

/**
 * Bulletproof outlined CTA button — border/padding live on the <td>, the link
 * fills it as display:block, so it survives Outlook's lack of padding support
 * on inline elements. Tone controls the outline/text color.
 */
export function createCtaButton(text: string, url: string, tone: EmailTone = 'default'): string {
  const t = TONES[tone];
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 32px auto 4px;"><tr>
    <td class="btn" style="border: 1px solid ${t.btn}; border-radius: 4px; text-align: center;">
    <a href="${url}" style="display: block; padding: 13px 38px; font-family: ${SERIF}; font-size: 13px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: ${t.btn}; text-decoration: none;" class="btn-a">${text}</a>
    </td></tr></table>
  `;
}
