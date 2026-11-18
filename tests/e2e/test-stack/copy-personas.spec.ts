import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { test, expect } from '../../fixtures';
import { login } from '../../helpers/auth';
import { adminClient } from '../../helpers/seed-ids';

/**
 * @copy — people from the anonymised production copy. StrummyTest only.
 *
 * The rest of the suite signs in as four seeded role accounts and creates its
 * own rows, so it never sees production's shape: hundreds of lessons, years of
 * history, students set up the way a real teacher set them up. This spec signs
 * in as the copy's own people — the teacher with the most recent lessons, that
 * teacher's busiest student, a parent with a linked child — and opens their
 * main pages. It asserts only that each page renders: a document under 400, no
 * error boundary, no uncaught exception, no bounce to sign-in or onboarding.
 *
 * Runs when E2E_TARGET=test (scripts/test-stack/e2e-env.sh sets it). Every
 * account on the copy shares E2E_COPY_PASSWORD (anonymize-auth.sql).
 */

const SEEDED = /@(dev\.local|seed\.dev\.local|strummy\.app)$/i;
const ERROR_TEXT = /Something went wrong|Error loading |Application error/;

type Profile = {
  id: string;
  user_id: string | null;
  email: string | null;
  is_teacher: boolean | null;
  is_parent: boolean | null;
  parent_id: string | null;
};
type Person = { profileId: string; email: string };
type Cast = { teacher: Person; student: Person; lessonId: string; parent: Person | null };

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

/** The copy's busiest people, by the most recent 1000 lessons (PostgREST's row cap). */
async function castFromCopy(db: SupabaseClient): Promise<Cast> {
  const [{ data: people, error: e1 }, { data: lessons, error: e2 }] = await Promise.all([
    db.from('profiles').select('id, user_id, email, is_teacher, is_parent, parent_id'),
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
      .filter((p) => p.user_id && !SEEDED.test(p.email ?? ''))
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
    parent: parent ? await person(db, parent) : null,
  };
}

async function expectRenders(page: Page, path: string): Promise<void> {
  const exceptions: string[] = [];
  const onError = (e: Error) => exceptions.push(e.message);
  page.on('pageerror', onError);
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);
  page.off('pageerror', onError);
  expect.soft(response?.status() ?? 0, `${path}: HTTP status`).toBeLessThan(400);
  expect.soft(page.url(), `${path}: kept the session`).not.toMatch(/\/(sign-in|onboarding)/);
  await expect.soft(page.getByText(ERROR_TEXT), `${path}: error boundary`).toHaveCount(0);
  expect.soft(exceptions, `${path}: uncaught exceptions`).toEqual([]);
}

test.describe('@copy people from the production copy', () => {
  test.skip(process.env.E2E_TARGET !== 'test', 'StrummyTest only (E2E_TARGET=test)');
  test.describe.configure({ timeout: 180_000 });

  let cast: Cast;
  const password = () => process.env.E2E_COPY_PASSWORD ?? '';

  test.beforeAll(async () => {
    cast = await castFromCopy(adminClient());
  });

  test('the busiest teacher sees their studio', async ({ page }) => {
    await login(page, { email: cast.teacher.email, password: password() });
    for (const path of [
      '/dashboard',
      '/dashboard/users',
      `/dashboard/users/${cast.student.profileId}`,
      '/dashboard/lessons',
      `/dashboard/lessons/${cast.lessonId}`,
      '/dashboard/assignments',
      '/dashboard/songs',
      '/dashboard/calendar',
    ]) {
      await expectRenders(page, path);
    }
  });

  test("that teacher's busiest student sees their lessons", async ({ page }) => {
    await login(page, { email: cast.student.email, password: password() });
    for (const path of [
      '/dashboard',
      '/dashboard/lessons',
      '/dashboard/assignments',
      '/dashboard/repertoire',
    ]) {
      await expectRenders(page, path);
    }
  });

  test('a parent sees their child', async ({ page }) => {
    test.skip(!cast.parent, 'the copy has no parent linked to a student');
    await login(page, { email: (cast.parent as Person).email, password: password() });
    await expectRenders(page, '/dashboard');
  });
});
