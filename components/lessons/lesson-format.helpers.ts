export const formatLessonDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatLessonClock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

/** Claude Design compact clock: "6:30p", "11:05a". */
export const formatLessonClockShort = (iso: string): string =>
  formatLessonClock(iso).replace(/\s?([AP])M$/i, (_, m: string) => m.toLowerCase());

export const formatLessonWeekday = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });

/** Date-column parts: "APR 23" over "THU · 2026". */
export const formatLessonDateParts = (iso: string): { monthDay: string; weekdayYear: string } => {
  const d = new Date(iso);
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  return { monthDay: `${month} ${d.getDate()}`, weekdayYear: `${weekday} · ${d.getFullYear()}` };
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
