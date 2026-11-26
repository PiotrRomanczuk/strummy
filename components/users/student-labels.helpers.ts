/** `Users.*` label key per stored value; the stored values stay English. */
export const LEVEL_KEYS: Record<string, string> = {
  beginner: 'skillLevelBeginner',
  novice: 'skillLevelNovice',
  intermediate: 'skillLevelIntermediate',
  advanced: 'skillLevelAdvanced',
};

export const INSTRUMENT_KEYS: Record<string, string> = {
  Guitar: 'instrumentGuitar',
  Bass: 'instrumentBass',
  Ukulele: 'instrumentUkulele',
  Piano: 'instrumentPiano',
};

const capitalise = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

/**
 * Translated label for a stored instrument/level value; an unknown value
 * (free text) is shown as stored rather than hidden.
 */
export const labelFor = (
  keys: Record<string, string>,
  value: string,
  t: (key: string) => string
): string => {
  const key = keys[value] ?? keys[value.toLowerCase()] ?? keys[capitalise(value)];
  return key ? t(key) : value;
};

/** "today" / "3 days ago" / "dzisiaj" / "3 dni temu" in the viewer's locale. */
export const relativeDaysLabel = (iso: string, locale: string, now: Date = new Date()): string => {
  const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (!Number.isFinite(days) || days <= 0) return rtf.format(0, 'day');
  return rtf.format(-days, 'day');
};

/** "Fri · Nov 27 · 5:00 PM" / "pt. · 27 lis · 17:00" in the viewer's locale. */
export const formatLessonWhen = (iso: string, locale: string): string => {
  const d = new Date(iso);
  const day = d
    .toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
    .replace(',', ' ·');
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
};
