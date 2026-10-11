import { test, expect } from '../../fixtures';
import { adminClient, getStudentId, studentEmail } from '../../helpers/seed-ids';

/**
 * Users Management E2E Tests (A6.1 / A6.2 / A6.4)
 *
 * Journeys tested:
 *  A6.1 — Users list: loads, search filters roster, role filter works
 *  A6.2 — Student detail: renders profile/stats/lessons/assignments
 *  A6.4 — Edit student profile: admin-only, name change persists
 *
 * Teacher sees students they have lessons with (RLS-scoped). The E2E student
 * (TEST_STUDENT_EMAIL) has seeded lessons with the E2E teacher, so they appear
 * in the roster and are reachable by direct URL — both the search (A6.1) and
 * the detail (A6.2) journeys use that one account.
 * A6.4 requires admin account because only admins can edit profiles.
 */

test.describe.configure({ mode: 'serial' });

// All three derived in beforeAll. This spec used to pin two hard-coded
// `@example.com` addresses and the literal name 'Test Student 1'; the accounts
// have since moved to `@dev.local` and the student is named something else
// entirely, so each literal was a separate piece of rot. There is one E2E
// student, it is the one the teacher has lessons with, and it is whoever
// TEST_STUDENT_EMAIL points at.
let STUDENT_ID = '';
let STUDENT_NAME = '';

test.describe('Users Management', { tag: ['@teacher', '@users'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);
    const { data } = await db.from('profiles').select('full_name').eq('id', STUDENT_ID).single();
    STUDENT_NAME = (data?.full_name as string) ?? '';
    expect(STUDENT_NAME, 'the E2E student needs a display name to search for').toBeTruthy();
  });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('A6.1 users list loads and renders rows', async ({ page }) => {
    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /people|users|students/i }).first()).toBeVisible(
      {
        timeout: 15_000,
      }
    );
    // User rows are rendered as <a> links to /dashboard/users/<id>
    await expect(page.locator('a[href*="/dashboard/users/"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('A6.1 search filters roster by name/email', async ({ page }) => {
    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[name="search"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // Search for a student that IS in the teacher's lesson list.
    // Filters apply live (debounced ~350ms) — there is no submit button.
    await searchInput.fill(studentEmail());
    await page.waitForLoadState('networkidle');

    await expect(page.locator(`text=${studentEmail()}`).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('A6.1 role filter shows only students', async ({ page }) => {
    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');

    const roleFilter = page.locator('select[name="role"]');
    await expect(roleFilter).toBeVisible({ timeout: 10_000 });
    // Selects apply immediately (live filters) — no submit button.
    await roleFilter.selectOption('student');
    await page.waitForLoadState('networkidle');

    // List renders without error
    await expect(page.locator('text=/something went wrong|error/i')).not.toBeVisible();
  });

  test('A6.2 student detail page renders profile', async ({ page }) => {
    // Fall back to the hard-coded UUID only if the DB lookup failed (offline CI)
    const studentId = STUDENT_ID;
    await page.goto(`/dashboard/users/${studentId}`);
    await page.waitForLoadState('networkidle');

    // Student name or email should appear
    await expect(
      page
        .locator(`text=${STUDENT_NAME}`)
        .or(page.locator(`text=${studentEmail()}`))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('A6.4 admin can edit and revert a student profile name', async ({ page, loginAs }) => {
    test.setTimeout(60_000);
    const db = adminClient();
    const nameInDb = async () =>
      (await db.from('profiles').select('full_name').eq('id', STUDENT_ID).single()).data?.full_name;
    const editedName = `${STUDENT_NAME} E2E`;

    // Only admins reach /dashboard/users/:id/edit; teachers are redirected.
    await page.context().clearCookies();
    await loginAs('admin');

    try {
      await page.goto(`/dashboard/users/${STUDENT_ID}/edit`);
      const nameInput = page.getByPlaceholder('e.g. Emma Johnson');
      await expect(nameInput).toHaveValue(STUDENT_NAME, { timeout: 15_000 });

      await nameInput.fill(editedName);
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 15_000 });
      await expect.poll(nameInDb, { timeout: 10_000 }).toBe(editedName);
    } finally {
      // A rename left behind would break every later search for this student.
      await db.from('profiles').update({ full_name: STUDENT_NAME }).eq('id', STUDENT_ID);
    }
  });

  test('A6.4 a teacher is redirected away from the edit route', async ({ page }) => {
    await page.goto(`/dashboard/users/${STUDENT_ID}/edit`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/users/${STUDENT_ID}$`), {
      timeout: 15_000,
    });
  });
});
