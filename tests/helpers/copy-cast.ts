import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * People from the anonymised production copy (StrummyTest), shared by the
 * @copy spec and the review gallery (tests/review/): the teacher with the most
 * recent lessons, that teacher's busiest student and a parent with a linked
 * child. Every account on the copy shares E2E_COPY_PASSWORD
 * (anonymize-auth.sql).
 *
 * Left out: the seeded role accounts (by address — e2e-accounts.sql keeps
 * theirs) and the public demo cohort (by `is_development`). The demo's address
 * is anonymised like everyone's, so `@strummy.app` no longer marks it on the
 * copy — and its studio regenerates lessons, which made "the teacher with the
 * most recent lessons" the demo teacher until 2026-11-18.
 */

export const SEEDED_EMAIL = /@(dev\.local|seed\.dev\.local|strummy\.app)$/i;

type Profile = {
  id: string;
  user_id: string | null;
  email: string | null;
  is_teacher: boolean | null;
  is_parent: boolean | null;
  is_development: boolean | null;
  parent_id: string | null;
};
export type Person = { profileId: string; email: string };
export type Cast = {
  teacher: Person;
  student: Person;
  lessonId: string;
  assignmentId: string | null;
  parent: Person | null;
};

async function person(db: SupabaseClient, profile: Profile): Promise<Person> {
  const { data, error } = await db.auth.admin.getUserById(profile.user_id ?? '');
  if (error || !data.user?.email) throw new Error(`no auth user for profile ${profile.id}`);
  return { profileId: profile.id, email: data.user.email };
}

function busiest(ids: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** The student's newest live assignment, so a review can open one. */
export async function latestAssignmentId(
  db: SupabaseClient,
  studentProfileId: string
): Promise<string | null> {
  const { data } = await db
    .from('assignments')
    .select('id')
    .eq('student_id', studentProfileId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1);
  return (data?.[0]?.id as string | undefined) ?? null;
}

/** The copy's busiest people, by the most recent 1000 lessons (PostgREST's row cap). */
export async function castFromCopy(db: SupabaseClient): Promise<Cast> {
  const [{ data: people, error: e1 }, { data: lessons, error: e2 }] = await Promise.all([
    db
      .from('profiles')
      .select('id, user_id, email, is_teacher, is_parent, is_development, parent_id'),
    db
      .from('lessons')
      .select('id, teacher_id, student_id')
      .order('scheduled_at', { ascending: false })
      .limit(1000),
  ]);
  if (e1 || e2 || !people || !lessons)
    throw new Error(`copy lookup failed: ${e1?.message ?? e2?.message}`);
  const real = new Map(
    (people as Profile[])
      .filter((p) => p.user_id && !p.is_development && !SEEDED_EMAIL.test(p.email ?? ''))
      .map((p) => [p.id, p])
  );
  const realLessons = lessons.filter((l) => real.has(l.teacher_id) && real.has(l.student_id));
  const teacherId = busiest(realLessons.map((l) => l.teacher_id));
  const own = realLessons.filter((l) => l.teacher_id === teacherId);
  const studentId = busiest(own.map((l) => l.student_id));
  if (!teacherId || !studentId)
    throw new Error('the copy has no teacher with lessons — refreshed?');
  const parent = [...real.values()].find(
    (p) => p.is_parent && [...real.values()].some((s) => s.parent_id === p.id)
  );
  return {
    teacher: await person(db, real.get(teacherId) as Profile),
    student: await person(db, real.get(studentId) as Profile),
    lessonId: own.find((l) => l.student_id === studentId)?.id as string,
    assignmentId: await latestAssignmentId(db, studentId),
    parent: parent ? await person(db, parent) : null,
  };
}
