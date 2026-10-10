import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { quizStreak, sessionCount, xpFor } from './chord-quiz-progress.helpers';

/**
 * Numbers for the Claude Design quiz home: recent accuracy, answers today, average
 * response time, and the chords this student misses most.
 */

export type ChordAccuracy = { chordId: string; pct: number; attempts: number };

export type ChordQuizStats = {
  accuracy7d: number | null;
  answersToday: number;
  avgResponseMs: number | null;
  weakest: ChordAccuracy[];
  /** 10 XP per correct answer, across the whole history. */
  totalXp: number;
  xpToday: number;
  sessionsToday: number;
  /** Consecutive quiz days ending today (or yesterday). */
  streak: number;
};

const HISTORY = 2000;
const DAY_MS = 86_400_000;

/** Lifetime XP: an exact count, so it is not capped by how many rows a page fetches. */
export async function getChordQuizTotalXp(studentId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('chord_quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('is_correct', true);
  if (error) logger.warn('[chord-quiz-stats] xp count error', { error: error.message });
  return xpFor(count ?? 0);
}

export async function getChordQuizStats(studentId: string, now: Date): Promise<ChordQuizStats> {
  const supabase = await createClient();
  const totalXp = await getChordQuizTotalXp(studentId);
  const { data, error } = await supabase
    .from('chord_quiz_attempts')
    .select('chord_id, is_correct, response_time_ms, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(HISTORY);
  if (error) logger.warn('[chord-quiz-stats] attempts error', { error: error.message });
  const rows = data ?? [];

  const weekAgo = now.getTime() - 7 * DAY_MS;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = rows.filter((r) => Date.parse(r.created_at) >= weekAgo);
  const times = week
    .map((r) => r.response_time_ms)
    .filter((ms): ms is number => typeof ms === 'number');

  const byChord = new Map<string, { ok: number; n: number }>();
  for (const r of rows) {
    const s = byChord.get(r.chord_id) ?? { ok: 0, n: 0 };
    s.n += 1;
    if (r.is_correct) s.ok += 1;
    byChord.set(r.chord_id, s);
  }

  const todayRows = rows.filter((r) => Date.parse(r.created_at) >= today.getTime());

  return {
    totalXp,
    xpToday: xpFor(todayRows.filter((r) => r.is_correct).length),
    sessionsToday: sessionCount(todayRows.map((r) => r.created_at)),
    streak: quizStreak(
      rows.map((r) => r.created_at),
      now
    ),
    accuracy7d: week.length
      ? Math.round((week.filter((r) => r.is_correct).length / week.length) * 100)
      : null,
    answersToday: todayRows.length,
    avgResponseMs: times.length
      ? Math.round(times.reduce((s, ms) => s + ms, 0) / times.length)
      : null,
    weakest: [...byChord.entries()]
      .map(([chordId, s]) => ({ chordId, pct: Math.round((s.ok / s.n) * 100), attempts: s.n }))
      .sort((a, b) => a.pct - b.pct || b.attempts - a.attempts)
      .slice(0, 6),
  };
}
