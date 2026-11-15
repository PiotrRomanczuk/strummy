import type { AppLocale } from '@/i18n/locales';

import { createParagraph } from './email-template-blocks';
import { guardianNotice } from './i18n';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Shown at the top of a lesson email that reaches a parent: whose lesson it is. */
export function createGuardianNotice(childName: string, locale: AppLocale = 'en'): string {
  return createParagraph(guardianNotice(locale, escapeHtml(childName)));
}
