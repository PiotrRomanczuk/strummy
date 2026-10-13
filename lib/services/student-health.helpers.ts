/**
 * Pure, client-safe helpers for the student-detail health surface.
 *
 * MUST stay free of any server-only import (no lib/supabase/server, no
 * next/headers) — these run inside the client bundle via
 * StudentDetail.Body. All time-derived values take an explicit `now`
 * so callers (server) compute them deterministically and pass results down,
 * keeping the client render hydration-safe.
 */

const DAY_MS = 86_400_000;

export type HealthStatus = 'on_track' | 'watch' | 'at_risk';

/**
 * The one practice-recency model. Every surface — student detail, the teacher
 * dashboard's Needs-attention list and health dots, the studio roster — reads
 * these; before they did not, and a 7–13-day student showed a red dot on the
 * dashboard while their own profile said "watch".
 */
export const PRACTICE_WATCH_DAYS = 7;
export const PRACTICE_AT_RISK_DAYS = 14;

/** Tier for whole days since practice; never practiced (null) is at risk. */
export function practiceTier(days: number | null): HealthStatus {
  if (days === null || days >= PRACTICE_AT_RISK_DAYS) return 'at_risk';
  return days >= PRACTICE_WATCH_DAYS ? 'watch' : 'on_track';
}

export type StudentHealth = {
  status: HealthStatus;
  /** Whole days since the most recent practice; null when never practiced. */
  daysSincePractice: number | null;
  lastPracticedAt: string | null;
};

/** Health from the most recent practice (tiers: see practiceTier). */
export function computeHealth(lastPracticedAt: string | null, now: Date): StudentHealth {
  if (!lastPracticedAt) {
    return { status: 'at_risk', daysSincePractice: null, lastPracticedAt: null };
  }
  const days = Math.floor((now.getTime() - new Date(lastPracticedAt).getTime()) / DAY_MS);
  return {
    status: practiceTier(Math.max(0, days)),
    daysSincePractice: Math.max(0, days),
    lastPracticedAt,
  };
}

/** Most recent `lastPracticedAt` across a student's repertoire rows. */
export function latestPracticedAt(rows: { lastPracticedAt: string | null }[]): string | null {
  let latest: string | null = null;
  for (const row of rows) {
    if (row.lastPracticedAt && (!latest || new Date(row.lastPracticedAt) > new Date(latest))) {
      latest = row.lastPracticedAt;
    }
  }
  return latest;
}

/** A single day's practice total. `date` is a UTC `YYYY-MM-DD` key. */
export type PracticeDay = { date: string; minutes: number };

const dayKey = (iso: string | Date): string =>
  (typeof iso === 'string' ? new Date(iso) : iso).toISOString().slice(0, 10);

/**
 * Zero-filled trailing-`days` buckets (oldest → newest) from raw sessions.
 * Days with no practice appear as `minutes: 0` so the chart keeps a fixed width.
 */
export function bucketPracticeByDay(
  sessions: { createdAt: string; durationMinutes: number }[],
  days: number,
  now: Date
): PracticeDay[] {
  const buckets = new Map<string, number>();
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * DAY_MS));
    keys.push(key);
    buckets.set(key, 0);
  }
  for (const session of sessions) {
    const key = dayKey(session.createdAt);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + session.durationMinutes);
  }
  return keys.map((date) => ({ date, minutes: buckets.get(date) ?? 0 }));
}

/** Minutes practiced over the trailing 7 days of a bucketed series. */
export const weekMinutes = (days: PracticeDay[]): number =>
  days.slice(-7).reduce((sum, day) => sum + day.minutes, 0);

/** No per-student daily-target column exists yet — a shared default for the goal line. */
export const DEFAULT_DAILY_GOAL_MIN = 30;
