import type { PracticeDay } from '@/lib/services/student-health.helpers';

const DAY_MS = 86_400_000;

/** "2h 14m" under a day out, "3d 4h" beyond — the hero's countdown. */
export const countdownLabel = (iso: string, now: Date): string => {
  const mins = Math.max(0, Math.round((Date.parse(iso) - now.getTime()) / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
};

export type WeekStripDay = { date: string; minutes: number; isToday: boolean };

// Same UTC day keys as `bucketPracticeByDay`, so the strip lines up with its buckets.
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Monday → Sunday of the current week, with the practice minutes logged each day. */
export const weekStrip = (days: PracticeDay[], now: Date): WeekStripDay[] => {
  const byDate = new Map(days.map((d) => [d.date, d.minutes]));
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const today = dayKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getTime() + i * DAY_MS);
    const key = dayKey(d);
    return { date: key, minutes: byDate.get(key) ?? 0, isToday: key === today };
  });
};

const STREAK_BADGES = [3, 7, 14, 30, 60, 100];

/** The next streak milestone and how far away it is. */
export const nextStreakBadge = (streak: number): { target: number; remaining: number } => {
  const target = STREAK_BADGES.find((b) => b > streak) ?? streak + 30;
  return { target, remaining: target - streak };
};

export type Achievement = {
  key: string;
  progress: number;
  max: number;
  isUnlocked: boolean;
};

type AchievementInput = {
  sessions: number;
  streak: number;
  songs: number;
  mastered: number;
  practiceMinutes: number;
};

/** Milestones derived from data the student already has — no achievements table. */
export const deriveAchievements = (input: AchievementInput): Achievement[] => {
  const defs: [string, number, number][] = [
    ['firstSession', input.sessions, 1],
    ['streak7', input.streak, 7],
    ['streak14', input.streak, 14],
    ['firstMastered', input.mastered, 1],
    ['fiveMastered', input.mastered, 5],
    ['repertoire10', input.songs, 10],
    ['tenHours', Math.floor(input.practiceMinutes / 60), 10],
    ['fiftyHours', Math.floor(input.practiceMinutes / 60), 50],
  ];
  return defs.map(([key, value, max]) => ({
    key,
    progress: Math.min(value, max),
    max,
    isUnlocked: value >= max,
  }));
};

/** Unlocked first, then the locked ones closest to done. */
export const featuredAchievements = (all: Achievement[], count = 4): Achievement[] =>
  [...all]
    .sort(
      (a, b) =>
        Number(b.isUnlocked) - Number(a.isUnlocked) || b.progress / b.max - a.progress / a.max
    )
    .slice(0, count);

/** "22m ago", "1h 20m ago", "3d ago". */
export const timeAgo = (iso: string, now: Date): string => {
  const mins = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000));
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d`;
};

/** 'today' / 'tomorrow' relative to `now`, else null (caller prints the date). */
export const relativeDay = (iso: string, now: Date): 'today' | 'tomorrow' | null => {
  const d = new Date(iso);
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - base.getTime()) / DAY_MS);
  return diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : null;
};
