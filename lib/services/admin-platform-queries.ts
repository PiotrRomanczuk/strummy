import { createClient } from '@/lib/supabase/server';

/**
 * Claude Design admin dashboard data: the platform pulse (activity, lessons,
 * signups, retention), students drifting away, and cohort health by tenure.
 * Health is practice recency: ≤7 days healthy, 8–30 at risk, beyond dormant.
 */

const DAY = 86_400_000;

export type AdminPulse = {
  active30: number;
  active30Prev: number;
  lessonsWeek: number;
  lessonsWeekPrev: number;
  newSignups7d: number;
  retention28: number | null;
};

export type AdminAtRiskStudent = {
  id: string;
  name: string | null;
  email: string | null;
  color: string | null;
  teacher: string | null;
  daysQuiet: number | null;
};

import {
  buildCohorts,
  fetchAll,
  isDrifting,
  startOfWeek,
  type AdminCohort,
  type PlatformStudent as Student,
} from './admin-platform.helpers';

export type { AdminCohort };

export async function getAdminPlatform(now: Date) {
  const supabase = await createClient();
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  const [studentRows, practiceRows, lessonRows, links] = await Promise.all([
    fetchAll((a, b) =>
      supabase
        .from('profiles')
        .select('id, full_name, email, avatar_color, created_at')
        .eq('is_student', true)
        .is('deleted_at', null)
        .order('id')
        .range(a, b)
    ),
    fetchAll((a, b) =>
      supabase
        .from('practice_sessions')
        .select('student_id, created_at')
        .gte('created_at', iso(t - 120 * DAY))
        .order('id')
        .range(a, b)
    ),
    fetchAll((a, b) =>
      supabase
        .from('lessons')
        .select('student_id, scheduled_at')
        .is('deleted_at', null)
        .neq('status', 'CANCELLED')
        .gte('scheduled_at', iso(t - 60 * DAY))
        .lte('scheduled_at', iso(t + 7 * DAY))
        .order('id')
        .range(a, b)
    ),
    fetchAll((a, b) =>
      supabase
        .from('teacher_students')
        .select('student_id, teacher:profiles!lessons_teacher_id_fkey(full_name)')
        .order('student_id')
        .range(a, b)
    ),
  ]);
  const students = { data: studentRows };
  const practice = { data: practiceRows };
  const lessons = { data: lessonRows };

  const lastPractice = new Map<string, number>();
  const activity: { id: string; at: number }[] = [];
  for (const p of practice.data ?? []) {
    const at = Date.parse(p.created_at);
    lastPractice.set(p.student_id, Math.max(lastPractice.get(p.student_id) ?? 0, at));
    activity.push({ id: p.student_id, at });
  }
  for (const l of lessons.data ?? [])
    activity.push({ id: l.student_id, at: Date.parse(l.scheduled_at) });
  const activeIn = (from: number, to: number) =>
    new Set(activity.filter((a) => a.at >= from && a.at < to).map((a) => a.id));

  const active30 = activeIn(t - 30 * DAY, t);
  const prior28 = activeIn(t - 56 * DAY, t - 28 * DAY);
  const recent28 = activeIn(t - 28 * DAY, t);
  const retained = [...prior28].filter((id) => recent28.has(id)).length;
  const week = startOfWeek(now);
  const lessonTimes = (lessons.data ?? []).map((l) => Date.parse(l.scheduled_at));

  const pulse: AdminPulse = {
    active30: active30.size,
    active30Prev: activeIn(t - 60 * DAY, t - 30 * DAY).size,
    lessonsWeek: lessonTimes.filter((x) => x >= week && x < week + 7 * DAY).length,
    lessonsWeekPrev: lessonTimes.filter((x) => x >= week - 7 * DAY && x < week).length,
    newSignups7d: (students.data ?? []).filter((s) => Date.parse(s.created_at) >= t - 7 * DAY)
      .length,
    retention28: prior28.size ? Math.round((retained / prior28.size) * 100) : null,
  };

  const teacherOf = new Map<string, string | null>();
  for (const l of links) {
    if (!l.student_id) continue;
    const teacher = Array.isArray(l.teacher) ? l.teacher[0] : l.teacher;
    if (!teacherOf.has(l.student_id))
      teacherOf.set(
        l.student_id,
        (teacher as { full_name: string | null } | null)?.full_name ?? null
      );
  }
  const quiet = (s: Student) => {
    const last = lastPractice.get(s.id);
    return last ? Math.floor((t - last) / DAY) : null;
  };

  const all = (students.data ?? []) as Student[];
  const atRisk: AdminAtRiskStudent[] = all
    .map((s) => ({ s, days: quiet(s) }))
    .filter(({ days }) => isDrifting(days))
    .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
    .slice(0, 5)
    .map(({ s, days }) => ({
      id: s.id,
      name: s.full_name,
      email: s.email,
      color: s.avatar_color,
      teacher: teacherOf.get(s.id) ?? null,
      daysQuiet: days,
    }));

  const cohorts = buildCohorts(all, quiet, t);

  return {
    pulse,
    atRisk,
    cohorts,
    studentCount: all.length,
    atRiskCount: all.filter((s) => isDrifting(quiet(s))).length,
  };
}

export type AdminPlatform = Awaited<ReturnType<typeof getAdminPlatform>>;
