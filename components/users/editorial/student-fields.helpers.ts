import type { StudentFormValues } from './StudentFields.shared';

export const trimmedOrUndefined = (v: string): string | undefined => {
  const t = v.trim();
  return t === '' ? undefined : t;
};

export const rateOrUndefined = (v: string): number | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Formats a 24h HH:MM time for display, e.g. "16:00" → "4:00 PM". */
export const formatLessonTime = (v: string): string => {
  const match = /^(\d{2}):(\d{2})/.exec(v);
  if (!match) return v;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${match[2]} ${suffix}`;
};

/** camelCase intake payload the API schemas accept — shared by create + edit. */
export function studentIntakePayload(v: StudentFormValues) {
  return {
    instrument: trimmedOrUndefined(v.instrument),
    skillLevel: v.skillLevel,
    startDate: trimmedOrUndefined(v.startDate),
    avatarColor: trimmedOrUndefined(v.avatarColor),
    parentName: trimmedOrUndefined(v.parentName),
    parentEmail: trimmedOrUndefined(v.parentEmail),
    lessonDayOfWeek: v.lessonDay,
    lessonTimeLocal: trimmedOrUndefined(v.lessonTime),
    lessonDurationMinutes: v.lessonDuration,
    lessonRate: rateOrUndefined(v.lessonRate),
    billingCycle: v.billingCycle,
    goals: trimmedOrUndefined(v.goals),
  };
}
