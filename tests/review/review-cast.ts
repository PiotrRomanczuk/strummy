import type { SupabaseClient } from '@supabase/supabase-js';
import { castFromCopy, latestAssignmentId, type Cast } from '../helpers/copy-cast';

/**
 * Who the review gallery signs in as, and which screens it opens for each.
 *
 * REVIEW_CAST=copy (default on StrummyTest, E2E_TARGET=test): the copy's own
 * people, picked by tests/helpers/copy-cast.ts. REVIEW_CAST=roles: the seeded
 * role accounts — that is what runs against the dev stack, where there is no
 * production copy.
 *
 * A step is a URL, nothing more: the same list runs against `main`'s build
 * and `test`'s, and a click that exists only on one side would break the other.
 */

export type ReviewStep = { key: string; title: string; path: string };
export type Credentials = { email: string; password: string };
export type ReviewPersona = {
  key: string;
  label: string;
  credentials: Credentials | null;
  steps: ReviewStep[];
};

const step = (key: string, title: string, path: string): ReviewStep => ({ key, title, path });

export function castMode(): 'copy' | 'roles' {
  const mode = process.env.REVIEW_CAST ?? (process.env.E2E_TARGET === 'test' ? 'copy' : 'roles');
  if (mode !== 'copy' && mode !== 'roles') throw new Error(`REVIEW_CAST must be copy or roles`);
  return mode;
}

function env(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

async function profileId(db: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await db.from('profiles').select('id').eq('email', email).single();
  if (error || !data) throw new Error(`no profile for ${email}: ${error?.message ?? 'not found'}`);
  return data.id as string;
}

/** The seeded role accounts, shaped like a cast from the copy. */
async function castFromRoles(db: SupabaseClient): Promise<Cast> {
  const teacher = env('TEST_TEACHER_EMAIL', 'teacher@dev.local');
  const student = env('TEST_STUDENT_EMAIL', 'student@dev.local');
  const parent = env('TEST_PARENT_EMAIL', 'parent@dev.local');
  const [teacherId, studentId, parentId] = await Promise.all(
    [teacher, student, parent].map((email) => profileId(db, email))
  );
  const { data: lessons } = await db
    .from('lessons')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: false })
    .limit(1);
  return {
    teacher: { profileId: teacherId, email: teacher },
    student: { profileId: studentId, email: student },
    lessonId: (lessons?.[0]?.id as string | undefined) ?? '',
    assignmentId: await latestAssignmentId(db, studentId),
    parent: { profileId: parentId, email: parent },
  };
}

function password(role: 'TEACHER' | 'STUDENT' | 'PARENT', mode: 'copy' | 'roles'): string {
  if (mode === 'copy') return process.env.E2E_COPY_PASSWORD ?? '';
  return env(`TEST_${role}_PASSWORD`, `test123_${role.toLowerCase()}`);
}

export async function reviewPersonas(db: SupabaseClient): Promise<ReviewPersona[]> {
  const mode = castMode();
  const cast = mode === 'copy' ? await castFromCopy(db) : await castFromRoles(db);
  const lesson = cast.lessonId
    ? [step('lekcja', 'Lekcja', `/dashboard/lessons/${cast.lessonId}`)]
    : [];
  const assignment = cast.assignmentId
    ? [step('zadanie', 'Zadanie', `/dashboard/assignments/${cast.assignmentId}`)]
    : [];

  const personas: ReviewPersona[] = [
    {
      key: 'publiczne',
      label: 'Przed zalogowaniem',
      credentials: null,
      steps: [step('start', 'Strona główna', '/'), step('logowanie', 'Logowanie', '/sign-in')],
    },
    {
      key: 'nauczyciel',
      label: 'Nauczyciel',
      credentials: { email: cast.teacher.email, password: password('TEACHER', mode) },
      steps: [
        step('pulpit', 'Pulpit', '/dashboard'),
        step('uczniowie', 'Uczniowie', '/dashboard/users'),
        step('uczen', 'Karta ucznia', `/dashboard/users/${cast.student.profileId}`),
        step('lekcje', 'Lekcje', '/dashboard/lessons'),
        ...lesson,
        step('zadania', 'Zadania', '/dashboard/assignments'),
        step('piosenki', 'Piosenki', '/dashboard/songs'),
        step('kalendarz', 'Kalendarz', '/dashboard/calendar'),
      ],
    },
    {
      key: 'uczen',
      label: 'Uczeń',
      credentials: { email: cast.student.email, password: password('STUDENT', mode) },
      steps: [
        step('pulpit', 'Pulpit', '/dashboard'),
        step('lekcje', 'Lekcje', '/dashboard/lessons'),
        ...lesson,
        step('zadania', 'Zadania', '/dashboard/assignments'),
        ...assignment,
        step('repertuar', 'Repertuar', '/dashboard/repertoire'),
        step('cwiczenia', 'Ćwiczenia', '/dashboard/practice'),
      ],
    },
  ];
  if (cast.parent) {
    personas.push({
      key: 'rodzic',
      label: 'Rodzic',
      credentials: { email: cast.parent.email, password: password('PARENT', mode) },
      steps: [step('pulpit', 'Pulpit rodziny', '/dashboard')],
    });
  }
  return personas;
}
