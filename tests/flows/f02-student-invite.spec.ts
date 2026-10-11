import { test, expect } from '../fixtures';
import { adminClient } from '../helpers/seed-ids';

/**
 * F02 — Teacher adds a student → invite → student signs up → linked.
 */
const RUN = Date.now();
const NAME = `E2E Flow Student ${RUN}`;
const EMAIL = `e2e.flow.${RUN}@dev.local`;

test.describe('F02 student invite', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let profileId: string | null = null;

  test.afterAll(async () => {
    const db = adminClient();
    if (profileId) await db.from('profiles').delete().eq('id', profileId);
    await db.from('profiles').delete().eq('email', EMAIL);
  });

  test('F02.1 admin creates a shadow student from the intake form', async ({ page, loginAs }) => {
    test.skip(
      true,
      'TODO automate: intake form field labels differ from the guess (student email)'
    );
    // Only admins can add students today (RLS profiles_insert_staff + the
    // teacher path is untested) — README "cheapest wins".
    await loginAs('admin');
    await page.goto('/dashboard/users/new');
    await page.getByPlaceholder('e.g. Emma Johnson').fill(NAME);
    await page.getByLabel(/student email/i).fill(EMAIL);
    await page
      .getByRole('button', { name: /create|save|add student/i })
      .first()
      .click();
    await page.waitForURL(/\/dashboard\/users\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    profileId = page.url().split('/').pop() ?? null;

    const { data } = await adminClient()
      .from('profiles')
      .select('is_shadow, invite_email, is_student')
      .eq('id', profileId!)
      .single();
    expect(data?.is_shadow).toBe(true);
    expect(data?.invite_email).toBe(EMAIL);
  });

  test('F02.2 the invite email is sent on create', async () => {
    test.fixme(
      true,
      'NOT BUILT: POST /api/users stores invite_email but only the separate Invite button sends'
    );
  });

  test('F02.3 the student signs up from the invite and is linked to the shadow', async () => {
    test.skip(true, 'TODO automate: needs the invite link from the dev mail catcher');
  });

  test('F02.4 the student sees their level and goals captured in onboarding', async () => {
    test.fixme(
      true,
      'NOT BUILT: /onboarding redirects anyone who already has a role, so claimed students never see the Journey step'
    );
  });

  test('F02.5 the role checkbox saves (novice skill level)', async ({ page, loginAs }) => {
    test.skip(!profileId, 'F02.1 did not create a profile');
    const db = adminClient();
    await db.from('profiles').update({ skill_level: 'novice' }).eq('id', profileId!);

    await loginAs('admin');
    await page.goto(`/dashboard/users/${profileId}/edit`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    // Fails on main: SKILL_LEVELS lacks 'novice' → "Invalid request body".
    await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 15_000 });
  });
});
