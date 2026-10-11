import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { bestStreak, quizStreak, sessionCount } from './chord-quiz-progress.helpers';
import { getChordQuizTotalXp } from './chord-quiz-stats-queries';

/** Quiz history (Claude Design screen 5): a 12-week answer heatmap and per-chord accuracy. */

const DAY = 86_400_000;
export const HEATMAP_WEEKS = 12;
const MASTERED_PCT = 90;

export type ChordMastery = { chordId: string; pct: number; attempts: number };

export type ChordQuizHistory = {
  /** HEATMAP_WEEKS columns × 7 days (Mon→Sun), answers per day. */
  weeks: number[][];
  answers30d: number;
  accuracy30d: number | null;
  sessions30d: number;
  /** Longest run inside the heatmap window. */
  bestStreak: number;
  streak: number;
  totalXp: number;
  mastered: number;
  chordsSeen: number;
  chords: ChordMastery[];
};

export async function getChordQuizHistory(studentId: string, now: Date): Promise<ChordQuizHistory> {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const start = monday.getTime() - (HEATMAP_WEEKS - 1) * 7 * DAY;

  const supabase = await createClient();
  const totalXp = await getChordQuizTotalXp(studentId);
  const { data, error } = await supabase
    .from('chord_quiz_attempts')
    .select('chord_id, is_correct, created_at')
    .eq('student_id', studentId)
    .gte('created_at', new Date(start).toISOString())
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) logger.warn('[chord-quiz-history] attempts error', { error: error.message });
  const rows = data ?? [];

  const weeks = Array.from({ length: HEATMAP_WEEKS }, () => Array<number>(7).fill(0));
  const byChord = new Map<string, { ok: number; n: number }>();
  for (const r of rows) {
    const day = Math.floor((Date.parse(r.created_at) - start) / DAY);
    if (day >= 0 && day < HEATMAP_WEEKS * 7) weeks[Math.floor(day / 7)][day % 7] += 1;
    const s = byChord.get(r.chord_id) ?? { ok: 0, n: 0 };
    s.n += 1;
    if (r.is_correct) s.ok += 1;
    byChord.set(r.chord_id, s);
  }

  const recent = rows.filter((r) => Date.parse(r.created_at) >= now.getTime() - 30 * DAY);
  const chords = [...byChord.entries()]
    .map(([chordId, s]) => ({ chordId, pct: Math.round((s.ok / s.n) * 100), attempts: s.n }))
    .sort((a, b) => b.pct - a.pct || b.attempts - a.attempts);

  return {
    weeks,
    answers30d: recent.length,
    sessions30d: sessionCount(recent.map((r) => r.created_at)),
    bestStreak: bestStreak(rows.map((r) => r.created_at)),
    streak: quizStreak(
      rows.map((r) => r.created_at),
      now
    ),
    totalXp,
    accuracy30d: recent.length
      ? Math.round((recent.filter((r) => r.is_correct).length / recent.length) * 100)
      : null,
    mastered: chords.filter((c) => c.pct >= MASTERED_PCT).length,
    chordsSeen: chords.length,
    chords,
  };
}
