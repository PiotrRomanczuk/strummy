import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Data for the Claude Design teacher dashboard's lower half and side column:
 * the studio roster (with health), this-week-vs-last comparison, and the
 * song-library quick-assign list. All scoped through `teacher_students`.
 */

export type StudioHealth = 'good' | 'needs_attention' | 'at_risk';

export type StudioStudent = {
  studentId: string;
  name: string | null;
  email: string | null;
  color: string | null;
  level: string | null;
  songs: number;
  masteredPct: number;
  daysSincePractice: number | null;
  health: StudioHealth;
  nextLessonAt: string | null;
};

export type WeekComparison = {
  teachingHours: { curr: number; prev: number };
  practiceHours: { curr: number; prev: number };
  songsAssigned: { curr: number; prev: number };
};

export type LibrarySong = {
  id: string;
  title: string;
  author: string | null;
  key: string | null;
  capo: number | null;
  learners: number;
};

const DAY_MS = 86_400_000;

const healthOf = (days: number | null): StudioHealth =>
  days === null || days >= 14 ? 'at_risk' : days >= 7 ? 'needs_attention' : 'good';

async function studentIdsFor(teacherId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('teacher_students')
    .select('student_id')
    .eq('teacher_id', teacherId);
  return Array.from(new Set((data ?? []).map((r) => r.student_id as string).filter(Boolean)));
}

export async function getStudioRoster(
  teacherId: string,
  now: Date,
  limit = 6
): Promise<{ total: number; rows: StudioStudent[] }> {
  const ids = await studentIdsFor(teacherId);
  if (ids.length === 0) return { total: 0, rows: [] };
  const supabase = await createClient();
  const [profiles, repertoire, lessons] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, skill_level, avatar_color')
      .in('id', ids),
    supabase
      .from('student_repertoire')
      .select('student_id, current_status, last_practiced_at')
      .in('student_id', ids),
    supabase
      .from('lessons')
      .select('student_id, scheduled_at')
      .eq('teacher_id', teacherId)
      .in('student_id', ids)
      .is('deleted_at', null)
      .gte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true }),
  ]);
  if (profiles.error)
    logger.warn('[studio-roster] profiles error', { error: profiles.error.message });

  const rows: StudioStudent[] = (profiles.data ?? []).map((p) => {
    const reps = (repertoire.data ?? []).filter((r) => r.student_id === p.id);
    const latest = reps.reduce<number | null>((max, r) => {
      const t = r.last_practiced_at ? Date.parse(r.last_practiced_at as string) : NaN;
      return Number.isFinite(t) && (max === null || t > max) ? t : max;
    }, null);
    const days = latest === null ? null : Math.floor((now.getTime() - latest) / DAY_MS);
    const mastered = reps.filter((r) => r.current_status === 'mastered').length;
    return {
      studentId: p.id as string,
      name: (p.full_name as string | null) ?? null,
      email: (p.email as string | null) ?? null,
      color: (p.avatar_color as string | null) ?? null,
      level: (p.skill_level as string | null) ?? null,
      songs: reps.length,
      masteredPct: reps.length ? Math.round((mastered / reps.length) * 100) : 0,
      daysSincePractice: days,
      health: healthOf(days),
      nextLessonAt:
        ((lessons.data ?? []).find((l) => l.student_id === p.id)?.scheduled_at as string) ?? null,
    };
  });
  const order: Record<StudioHealth, number> = { at_risk: 0, needs_attention: 1, good: 2 };
  rows.sort((a, b) => order[a.health] - order[b.health]);
  return { total: rows.length, rows: rows.slice(0, limit) };
}

const weekStart = (now: Date, offsetWeeks: number): Date => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offsetWeeks * 7);
  return d;
};

export async function getWeekComparison(teacherId: string, now: Date): Promise<WeekComparison> {
  const supabase = await createClient();
  const ids = await studentIdsFor(teacherId);
  const prevStart = weekStart(now, -1).toISOString();
  const currStart = weekStart(now, 0).toISOString();
  const nextStart = weekStart(now, 1).toISOString();
  const [lessons, practice, assigned] = await Promise.all([
    supabase
      .from('lessons')
      .select('scheduled_at, duration_minutes, status')
      .eq('teacher_id', teacherId)
      .is('deleted_at', null)
      .gte('scheduled_at', prevStart)
      .lt('scheduled_at', nextStart),
    ids.length
      ? supabase
          .from('practice_sessions')
          .select('created_at, duration_minutes')
          .in('student_id', ids)
          .gte('created_at', prevStart)
          .lt('created_at', nextStart)
      : Promise.resolve({ data: [] as { created_at: string; duration_minutes: number | null }[] }),
    supabase
      .from('assignments')
      .select('created_at')
      .eq('teacher_id', teacherId)
      .is('deleted_at', null)
      .gte('created_at', prevStart)
      .lt('created_at', nextStart),
  ]);
  const split = <T>(rows: T[] | null | undefined, at: (r: T) => string, val: (r: T) => number) =>
    (rows ?? []).reduce(
      (acc, r) => {
        const bucket = at(r) >= currStart ? 'curr' : 'prev';
        acc[bucket] += val(r);
        return acc;
      },
      { curr: 0, prev: 0 }
    );
  const round1 = (v: { curr: number; prev: number }) => ({
    curr: Math.round(v.curr * 10) / 10,
    prev: Math.round(v.prev * 10) / 10,
  });
  return {
    teachingHours: round1(
      split(
        (lessons.data ?? []).filter((l) => String(l.status).toUpperCase() !== 'CANCELLED'),
        (l) => l.scheduled_at as string,
        (l) => ((l.duration_minutes as number | null) ?? 45) / 60
      )
    ),
    practiceHours: round1(
      split(
        practice.data,
        (p) => p.created_at as string,
        (p) => ((p.duration_minutes as number | null) ?? 0) / 60
      )
    ),
    songsAssigned: split(
      assigned.data,
      (a) => a.created_at as string,
      () => 1
    ),
  };
}

export async function getLibraryQuickAssign(
  teacherId: string,
  limit = 5
): Promise<{ total: number; songs: LibrarySong[] }> {
  const supabase = await createClient();
  const ids = await studentIdsFor(teacherId);
  const [total, reps] = await Promise.all([
    supabase.from('songs').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    ids.length
      ? supabase
          .from('student_repertoire')
          .select('song_id, songs(id, title, author, key, capo_fret)')
          .in('student_id', ids)
          .limit(1000)
      : Promise.resolve({ data: [] as { song_id: string; songs: unknown }[] }),
  ]);
  const bySong = new Map<string, LibrarySong>();
  for (const r of reps.data ?? []) {
    const s = (Array.isArray(r.songs) ? r.songs[0] : r.songs) as {
      id: string;
      title: string;
      author: string | null;
      key: string | null;
      capo_fret: number | null;
    } | null;
    if (!s) continue;
    const row = bySong.get(s.id) ?? {
      id: s.id,
      title: s.title,
      author: s.author,
      key: s.key,
      capo: s.capo_fret,
      learners: 0,
    };
    row.learners += 1;
    bySong.set(s.id, row);
  }
  const songs = Array.from(bySong.values())
    .sort((a, b) => b.learners - a.learners)
    .slice(0, limit);
  return { total: total.count ?? 0, songs };
}
