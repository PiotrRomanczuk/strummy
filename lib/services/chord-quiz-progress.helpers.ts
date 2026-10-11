/**
 * Chord-quiz game layer from the Claude Design quiz screens — XP, levels,
 * daily goal, day streak and hearts — all derived from `chord_quiz_attempts`,
 * so there is no separate state to keep in sync.
 */

export const XP_PER_CORRECT = 10;
export const XP_PER_LEVEL = 250;
export const DAILY_XP_GOAL = 40;
export const HEARTS_PER_SESSION = 5;

const DAY_MS = 86_400_000;

export const xpFor = (correctAnswers: number): number => correctAnswers * XP_PER_CORRECT;

/** Level 1 starts at 0 XP; each level needs another XP_PER_LEVEL. */
export const levelFor = (xp: number): { level: number; toNext: number } => {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return { level, toNext: level * XP_PER_LEVEL - xp };
};

/** Hearts left after `wrong` misses in a session. */
export const heartsLeft = (wrong: number): number => Math.max(0, HEARTS_PER_SESSION - wrong);

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Consecutive days with at least one answer, ending today — or yesterday when
 * today has none yet (the streak is still alive until midnight).
 */
export const quizStreak = (answeredAt: string[], now: Date): number => {
  const days = new Set(answeredAt.map((iso) => dayKey(new Date(iso))));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setTime(cursor.getTime() - DAY_MS);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setTime(cursor.getTime() - DAY_MS);
  }
  return streak;
};

/** Longest run of consecutive answer days in the history. */
export const bestStreak = (answeredAt: string[]): number => {
  const days = [...new Set(answeredAt.map((iso) => dayKey(new Date(iso))))].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    const t = Date.parse(`${d}T12:00:00`);
    run = prev != null && Math.round((t - prev) / DAY_MS) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
};

/**
 * A quiz session is saved in one insert, so every attempt in it shares one
 * `created_at` — distinct timestamps count sessions.
 */
export const sessionCount = (answeredAt: string[]): number => new Set(answeredAt).size;
