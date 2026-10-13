/**
 * Lesson date and time formatting. Every helper takes the app locale (from
 * next-intl); English keeps the Claude Design shapes ("APR 23", "6:30p"),
 * other locales get their own month and weekday names and a 24-hour clock.
 * The default stays 'en' so a caller that forgets the locale reads as before
 * rather than breaking — but every caller in the app passes it.
 */

const isEnglish = (locale: string) => locale.toLowerCase().startsWith('en');
const dateLocale = (locale: string) => (isEnglish(locale) ? 'en-US' : locale);
/** "paź." → "PAŹ": short month/weekday names, upper-cased, trailing dot dropped. */
const shortName = (d: Date, locale: string, part: 'month' | 'weekday') =>
  d
    .toLocaleDateString(dateLocale(locale), { [part]: 'short' })
    .replace(/\.$/, '')
    .toLocaleUpperCase(dateLocale(locale));

export const formatLessonDate = (iso: string, locale = 'en'): string =>
  new Date(iso).toLocaleDateString(dateLocale(locale), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatLessonClock = (iso: string, locale = 'en'): string =>
  isEnglish(locale)
    ? new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : new Date(iso).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

/** Claude Design compact clock: "6:30p", "11:05a" — "18:30" outside English. */
export const formatLessonClockShort = (iso: string, locale = 'en'): string =>
  isEnglish(locale)
    ? formatLessonClock(iso, locale).replace(/\s?([AP])M$/i, (_, m: string) => m.toLowerCase())
    : formatLessonClock(iso, locale);

export const formatLessonWeekday = (iso: string, locale = 'en'): string =>
  new Date(iso).toLocaleDateString(dateLocale(locale), { weekday: 'short' });

/** Month strip and weekday of the date block: { month: "OCT", weekday: "SAT" }. */
export const formatLessonMonthWeekday = (
  iso: string,
  locale = 'en'
): { month: string; weekday: string } => {
  const d = new Date(iso);
  return { month: shortName(d, locale, 'month'), weekday: shortName(d, locale, 'weekday') };
};

/** Date-column parts: "APR 23" over "THU · 2026" ("23 KWI" over "CZW · 2026"). */
export const formatLessonDateParts = (
  iso: string,
  locale = 'en'
): { monthDay: string; weekdayYear: string } => {
  const d = new Date(iso);
  const { month, weekday } = formatLessonMonthWeekday(iso, locale);
  return {
    monthDay: isEnglish(locale) ? `${month} ${d.getDate()}` : `${d.getDate()} ${month}`,
    weekdayYear: `${weekday} · ${d.getFullYear()}`,
  };
};

/** "45 min" — null when the lesson has no recorded duration. */
export const formatLessonDuration = (minutes: number | null): string | null =>
  minutes == null ? null : `${minutes} min`;

const LESSON_FORMAT_LABELS: Record<string, string> = {
  in_person: 'In person',
  video: 'Video call',
};

/** "In person" / "Video call" — null when the lesson has no recorded format. */
export const formatLessonFormat = (format: string | null): string | null =>
  format == null ? null : (LESSON_FORMAT_LABELS[format] ?? format);
