/**
 * Pure helpers shared by the notifications inbox components.
 */

import type { useTranslations } from 'next-intl';

type Translator = ReturnType<typeof useTranslations>;

export const VARIANT_COLOURS: Record<string, string> = {
  default: 'var(--ink-3)',
  success: 'var(--success)',
  warning: 'var(--warn)',
  error: 'var(--danger)',
  info: 'var(--info)',
};

// "just now" / "{n}m/h ago" stay terse (invariant units) in both locales;
// "day(s)" gets a manual singular/plural swap since Polish "dzień"/"dni"
// can't share one word the way the minute/hour abbreviations do. The exact
// calendar-date fallback (>= 14 days) intentionally keeps its runtime locale
// — see the hydration-mismatch note on toLocaleDateString('en-US', ...) in
// RepertoireRow.tsx.
export const formatRelative = (iso: string, now: Date, t: Translator): string => {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return t('listTimeJustNow');
  if (mins < 60) return t('listTimeMinutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('listTimeHoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 14) {
    const unit = days === 1 ? t('listTimeDaySingular') : t('listTimeDayPlural');
    return t('listTimeDaysAgo', { count: days, unit });
  }
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
