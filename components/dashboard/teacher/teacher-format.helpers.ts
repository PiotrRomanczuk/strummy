export type GreetingKey =
  | 'greetingStillHere'
  | 'greetingMorning'
  | 'greetingAfternoon'
  | 'greetingEvening'
  | 'greetingLateNight';

/** The `TeacherHome` message key for the time of day; the words live in messages/. */
export const greetingKeyFor = (now: Date): GreetingKey => {
  const h = now.getHours();
  if (h < 5) return 'greetingStillHere';
  if (h < 12) return 'greetingMorning';
  if (h < 17) return 'greetingAfternoon';
  if (h < 22) return 'greetingEvening';
  return 'greetingLateNight';
};

export const totalMinutesLabel = (total: number): string => {
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const isEnglish = (locale: string): boolean => locale.toLowerCase().startsWith('en');

/**
 * Compact clock. English keeps the Claude Design "4:00p"; every other locale
 * gets its own 24-hour form ("16:00") — "4:00p" means nothing to a Polish
 * teacher, and the walkthrough showed it on every timed row.
 */
export const formatClock = (iso: string, locale = 'en'): string => {
  const d = new Date(iso);
  if (!isEnglish(locale)) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?([AP])M$/i, (_, m: string) => m.toLowerCase());
};

/** Hour gutter label on the day spine: "9a" / "1p" in English, "9:00" / "13:00" elsewhere. */
export const formatHourLabel = (hour: number, locale = 'en'): string => {
  if (!isEnglish(locale)) return `${hour}:00`;
  if (hour === 12) return '12p';
  return hour > 12 ? `${hour - 12}p` : `${hour}a`;
};

/** Narrow weekday for a YYYY-MM-DD date ("M" / "P"), noon so no timezone tips it over. */
export const narrowWeekday = (isoDate: string, locale = 'en'): string =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString(locale, { weekday: 'narrow' }).toUpperCase();

const KNOWN_LEVELS = ['beginner', 'novice', 'intermediate', 'advanced'];

/** "beginner" → `TeacherHome.level.beginner`; an unknown value passes through untouched. */
export const levelLabel = (t: (key: string) => string, level: string): string => {
  const key = level.toLowerCase();
  return KNOWN_LEVELS.includes(key) ? t(`level.${key}`) : level;
};

export const minutesIntoDay = (iso: string): number => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
