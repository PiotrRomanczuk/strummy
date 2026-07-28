import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * Wave feature: full student intake form (migration 20260723120200 — identity,
 * contact, schedule, billing on profiles). The intake fields aren't rendered on
 * the student detail page, so we assert persistence at the DB layer. Proves the
 * "Add student" form → /api/users → profiles flow that shipped uncovered and
 * referenced columns prod was missing.
 */
const ts = Date.now();
const NAME = `E2E Student ${ts}`; // teardown-matched (firstName /^E2E/)
const PARENT_EMAIL = `e2e.parent.${ts}@example.com`;
const STUDENT_EMAIL = `e2e.student.${ts}@example.com`; // teardown-matched email pattern
const GOAL = `E2E goal ${ts}: barre chords`;

// Logs in as ADMIN: the studio owner is admin+teacher, so real "add student"
// usage runs with is_admin(). Teacher-ONLY accounts currently can't insert a
// profile — dev's `has_role('teacher')` RLS policy isn't satisfied by the
// profile-flag teacher account, and /api/users inserts the shadow profile with
// the RLS client instead of its available admin client. Flagged separately.
test.describe('Student intake form', { tag: ['@admin', '@students'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('admin');
  });

  test('add a student with identity/contact/schedule/billing → persists to profile', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await page.goto('/dashboard/users/new');
    await expect(page.getByPlaceholder('e.g. Emma Johnson')).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder('e.g. Emma Johnson').fill(NAME);
    await page.getByRole('button', { name: /intermediate/i }).click();
    await page.getByPlaceholder('student@email.com').fill(STUDENT_EMAIL);
    await page.getByPlaceholder('e.g. Karen Johnson').fill('E2E Parent');
    await page.getByPlaceholder('parent@email.com').fill(PARENT_EMAIL);
    // The schedule field is <input type="time">: no placeholder, and it holds
    // 24h "HH:MM". It used to be free text, which is where '4:00 PM' came from.
    await page.locator('input[type="time"]').fill('17:30');
    await page.getByPlaceholder('65').fill('80');
    await page.getByPlaceholder(/Wants to play/).fill(GOAL);

    await page.getByRole('button', { name: 'Add student' }).click();
    await page.waitForURL(/\/dashboard\/users\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    const id = page.url().split('/').pop();
    await expect(page.getByText(NAME).first()).toBeVisible({ timeout: 10_000 });

    // Intake fields have no post-create UI surface — assert they persisted.
    const db = adminClient();
    const { data, error } = await db
      .from('profiles')
      .select('skill_level, parent_name, parent_email, lesson_time_local, lesson_rate, notes')
      .eq('full_name', NAME)
      .single();
    expect(error, 'profiles query').toBeNull();
    expect(data?.skill_level).toBe('intermediate');
    expect(data?.parent_name).toBe('E2E Parent');
    expect(data?.parent_email).toBe(PARENT_EMAIL);
    // Column renamed by 20260727123000 (typed schedule); a `time` column
    // comes back with seconds.
    expect(data?.lesson_time_local).toMatch(/^17:30(:00)?$/);
    expect(Number(data?.lesson_rate)).toBe(80);
    expect(data?.notes).toBe(GOAL); // "Goals / notes" maps to profiles.notes

    const res = await page.request.delete(`/api/users/${id}`);
    expect(res.status(), 'user delete').toBeLessThan(400);
  });
});
