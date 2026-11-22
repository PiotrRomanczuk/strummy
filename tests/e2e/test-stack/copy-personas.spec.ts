import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures';
import { login } from '../../helpers/auth';
import { castFromCopy, type Cast, type Person } from '../../helpers/copy-cast';
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
 * Runs when E2E_TARGET=test (scripts/test-stack/e2e-env.sh sets it). Who is
 * cast, and how they sign in: tests/helpers/copy-cast.ts.
 */

const ERROR_TEXT = /Something went wrong|Error loading |Application error/;

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
