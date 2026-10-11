import { test, expect } from '../fixtures';
import { adminClient } from '../helpers/seed-ids';

/**
 * F11 — Admin: users list, edit, deactivate, lock/unlock, invite a teacher.
 *
 * Every step works on a throwaway student created in `beforeAll` (auth user +
 * the profile the `handle_new_user` trigger mints for it) and deleted by id in
 * `afterAll`. Deactivating or locking the shared `student@dev.local` would log
 * out every other spec running as that student at the same time.
 */
const RUN = Date.now().toString(36);
const EMAIL = `e2e-flow-f11-${RUN}@example.test`;
const FULL_NAME = `E2E Flow F11 ${RUN}`;
const TEACHER_EMAIL = `e2e-flow-f11-teacher-${RUN}@dev.local`;
const TEACHER_NAME = `Flow Teacher ${RUN}`;

test.describe('F11 admin', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let profileId = '';
  let authId = '';

  const profile = async () =>
    (
      await adminClient()
        .from('profiles')
        .select('is_active, is_teacher, failed_login_attempts, locked_until')
        .eq('id', profileId)
        .single()
    ).data;

  test.beforeAll(async () => {
    const db = adminClient();
    const { data, error } = await db.auth.admin.createUser({
      email: EMAIL,
      // Run-scoped throwaway credential, built at runtime (GitGuardian flags literal patterns).
      password: ['Flow', String(RUN), 'pw!'].join('-'),
      email_confirm: true,
      user_metadata: { first_name: 'E2E', last_name: `Flow F11 ${RUN}` },
    });
    expect(error, `createUser failed: ${error?.message}`).toBeNull();
    authId = data.user!.id;

    // The profile's own id is a fresh uuid (S2), so look it up by user_id.
    const { data: created, error: lookupError } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', authId)
      .single();
    expect(lookupError, `profile lookup failed: ${lookupError?.message}`).toBeNull();
    profileId = created!.id as string;

    // A locked student for F11.3; the lock is what the dashboard widget lists.
    const { error: seedError } = await db
      .from('profiles')
      .update({
        full_name: FULL_NAME,
        is_admin: false,
        is_teacher: false,
        is_student: true,
        // The level onboarding writes; the edit form re-sends it on every save
        // (F11.4 proves the Zod schema now accepts it).
        skill_level: 'novice',
        failed_login_attempts: 5,
        locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .eq('id', profileId);
    expect(seedError, `profile seed failed: ${seedError?.message}`).toBeNull();
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (profileId) await db.from('profiles').delete().eq('id', profileId);
    if (authId) await db.auth.admin.deleteUser(authId);
    // F11.5 invites a teacher: GoTrue mints the auth user, the trigger the profile.
    const { data: invited } = await db
      .from('profiles')
      .select('id, user_id')
      .eq('email', TEACHER_EMAIL)
      .maybeSingle();
    if (invited) {
      await db.from('profiles').delete().eq('id', invited.id);
      if (invited.user_id) await db.auth.admin.deleteUser(invited.user_id);
    }
  });

  test('F11.1 the users list shows the roster and opens a student', async ({ page, loginAs }) => {
    test.setTimeout(60_000);
    await loginAs('admin');
    await page.goto('/dashboard/users');
    // Filters apply live; the roster is capped at 200 rows, so find the row by search.
    // The search debounces into a `router.replace(?search=…)` — let that
    // navigation land first, or it cancels the row click's navigation.
    await page.locator('input[name="search"]').fill(EMAIL);
    await page.waitForURL(/[?&]search=/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle');
    const row = page.locator(`a[href="/dashboard/users/${profileId}"]`).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText(FULL_NAME);
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/users/${profileId}$`), {
      timeout: 15_000,
    });
    await expect(page.getByText(EMAIL).first()).toBeVisible({ timeout: 15_000 });
  });

  test('F11.2 deactivate and reactivate a student', async ({ page, loginAs }) => {
    test.setTimeout(90_000);
    await loginAs('admin');

    await page.goto(`/dashboard/users/${profileId}/edit`);
    const active = page.getByLabel('Active (login enabled)');
    await expect(active).toBeChecked({ timeout: 15_000 });
    // Unticking opens a confirmation; only "Deactivate" flips the toggle.
    await active.click();
    await page.getByRole('button', { name: 'Deactivate' }).click();
    await expect(active).not.toBeChecked();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await profile())?.is_active, { timeout: 10_000 }).toBe(false);

    // Reactivate from a fresh load of the form, so the saved state is what is shown.
    await page.goto(`/dashboard/users/${profileId}/edit`);
    const inactive = page.getByLabel('Active (login enabled)');
    await expect(inactive).not.toBeChecked({ timeout: 15_000 });
    await inactive.click();
    await expect(inactive).toBeChecked();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await profile())?.is_active, { timeout: 10_000 }).toBe(true);
  });

  test('F11.3 a locked account shows on the dashboard and can be unlocked', async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(60_000);
    await loginAs('admin');
    // The admin dashboard fans out into several queries; on a busy dev server
    // its load event can pass 30s. The row assertion below is the real wait.
    await page.goto('/dashboard?view=admin', { waitUntil: 'domcontentloaded', timeout: 60_000 });

    const row = page.getByTestId(`locked-account-${profileId}`);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText('5 failed attempts');

    // A click that lands before hydration is dropped (the button focuses, the
    // handler never runs), so press until the row goes away.
    await expect(async () => {
      const unlock = page.getByTestId(`unlock-account-${profileId}`);
      if (await unlock.isVisible()) await unlock.click();
      await expect(row).not.toBeVisible({ timeout: 8_000 });
    }).toPass({ timeout: 40_000 });
    await expect
      .poll(
        async () => {
          const p = await profile();
          return { failed_login_attempts: p?.failed_login_attempts, locked_until: p?.locked_until };
        },
        { timeout: 10_000 }
      )
      .toEqual({ failed_login_attempts: 0, locked_until: null });
  });

  test("F11.4 edit a student's roles", async ({ page, loginAs }) => {
    test.setTimeout(90_000);
    await loginAs('admin');

    // Grant Teacher. The student intake fields (incl. the seeded `novice`
    // skill level) are re-sent with the roles, which is what used to fail with
    // "Invalid request body" — so a green save here proves that fix too.
    await page.goto(`/dashboard/users/${profileId}/edit`);
    const teacher = page.getByLabel('Teacher', { exact: true });
    await expect(teacher).not.toBeChecked({ timeout: 15_000 });
    await teacher.click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await profile())?.is_teacher, { timeout: 10_000 }).toBe(true);

    // And revoke it again through the same form.
    await page.goto(`/dashboard/users/${profileId}/edit`);
    const grantedTeacher = page.getByLabel('Teacher', { exact: true });
    await expect(grantedTeacher).toBeChecked({ timeout: 15_000 });
    await grantedTeacher.click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await profile())?.is_teacher, { timeout: 10_000 }).toBe(false);
  });

  test('F11.5 invite a teacher', async ({ page, loginAs }) => {
    test.setTimeout(90_000);
    await loginAs('admin');
    await page.goto('/dashboard/users');
    await page.getByTestId('invite-teacher-open').click();
    await page.getByTestId('invite-teacher-name').fill(TEACHER_NAME);
    await page.getByTestId('invite-teacher-email').fill(TEACHER_EMAIL);
    await page.getByTestId('invite-teacher-send').click();
    await expect(page.getByTestId('invite-teacher-sent')).toBeVisible({ timeout: 30_000 });

    const { data } = await adminClient()
      .from('profiles')
      .select('is_teacher, is_student, is_admin, full_name, user_id')
      .eq('email', TEACHER_EMAIL)
      .single();
    expect(data).toMatchObject({
      is_teacher: true,
      is_student: false,
      is_admin: false,
      full_name: TEACHER_NAME,
    });
    // GoTrue minted the auth user for the invite; F02.2 proves the mail itself.
    expect(data?.user_id).toBeTruthy();
  });
});
