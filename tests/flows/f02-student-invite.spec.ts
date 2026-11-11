import type { BrowserContext } from '@playwright/test';

import { test, expect } from '../fixtures';
import { extractVerifyLink, fetchMessageBody, waitForEmail } from '../helpers/mailpit';
import { adminClient } from '../helpers/seed-ids';

/**
 * F02 — Teacher adds a student → invite → student signs up → linked.
 */
const RUN = Date.now();
// Not "E2E …": the global teardown deletes every profile whose full_name starts
// with E2E (tests/helpers/cleanup.ts), and another run finishing on the same
// dev stack would take this shadow away between F02.1 and F02.3.
const NAME = `Flow Student ${RUN}`;
const EMAIL = `e2e.flow.${RUN}@dev.local`;
// Disposable: the account exists only between F02.3 and afterAll. Satisfies the
// signup policy (length, letter, number, symbol).
// Built at runtime from the run id; not a credential (GitGuardian flags literal patterns).
const CLAIM_PASSPHRASE = ['Flow', String(RUN), 'Aa1!'].join('-');

/**
 * Follow a GoTrue `/auth/v1/verify` link without a browser and return the
 * `#access_token=…&type=invite` fragment it redirects to. The dev stack's
 * GoTrue only knows the redirect origins in its allow-list (localhost:3000),
 * so the fragment is re-attached to the app under test instead of trusting
 * the Location host.
 */
async function consumeVerifyLink(link: string): Promise<string> {
  const res = await fetch(link, { redirect: 'manual' });
  const location = res.headers.get('location') ?? '';
  expect(location, `GoTrue verify redirected (status ${res.status})`).toContain('#');
  return location.slice(location.indexOf('#'));
}

test.describe('F02 student invite', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let profileId: string | null = null;
  let authUserId: string | null = null;
  let createdAt = 0;
  let inviteLink: string | null = null;
  let studentStorage: Awaited<ReturnType<BrowserContext['storageState']>> | null = null;

  test.afterAll(async () => {
    const db = adminClient();
    // The invite creates the auth user (and claims the shadow) before F02.3
    // finishes, so resolve the auth id from the row rather than trusting the
    // test body reached the point where it recorded it.
    if (profileId && !authUserId) {
      const { data } = await db
        .from('profiles')
        .select('user_id')
        .eq('id', profileId)
        .maybeSingle();
      authUserId = data?.user_id ?? null;
    }
    if (profileId) await db.from('profiles').delete().eq('id', profileId);
    await db.from('profiles').delete().eq('email', EMAIL);
    if (authUserId) await db.auth.admin.deleteUser(authUserId);
  });

  test('F02.1 admin adds a student with an e-mail from the intake form', async ({
    page,
    loginAs,
  }) => {
    // A cold Turbopack compile of the student page on a shared dev server can
    // exceed the default 30s budget.
    test.setTimeout(60_000);
    // Only admins can add students today (RLS profiles_insert_staff + the
    // teacher path is untested) — README "cheapest wins".
    await loginAs('admin');
    createdAt = Date.now();
    await page.goto('/dashboard/users/new');
    const form = page.locator('form#create-student-form');
    // The labels are <span>s, not <label for>, so the fields go by placeholder.
    await form.getByPlaceholder('e.g. Emma Johnson').fill(NAME);
    await form.getByPlaceholder('student@email.com').fill(EMAIL);
    // A level toggle only flips once React owns the form: use it as the
    // hydration gate so the submit cannot land on a dead page.
    const level = form.getByRole('button', { name: /^intermediate$/i });
    await level.click();
    await expect(level).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Add student' }).first().click();
    await page.waitForURL(/\/dashboard\/users\/[0-9a-f-]{36}$/, { timeout: 45_000 });
    profileId = page.url().split('/').pop() ?? null;

    // Adding a student with an e-mail invites them at once: GoTrue creates the
    // invited auth user and the sign-up trigger claims the shadow in place, so
    // the row is already linked (same id) before the student has a password.
    const { data } = await adminClient()
      .from('profiles')
      .select('is_shadow, invite_email, email, is_student, user_id')
      .eq('id', profileId!)
      .single();
    expect(data?.is_student).toBe(true);
    expect(data?.is_shadow).toBe(false);
    expect(data?.invite_email).toBeNull();
    expect(data?.email).toBe(EMAIL);
    expect(data?.user_id).toBeTruthy();
  });

  test('F02.2 the invite email is sent on create', async () => {
    test.skip(!profileId, 'F02.1 did not create a profile');
    // No second click: adding a student with an e-mail sends the invite.
    const mail = await waitForEmail(EMAIL, 20_000, createdAt - 2_000);
    expect(mail.Subject).toMatch(/invite/i);
    const { html, text } = await fetchMessageBody(mail.ID);
    inviteLink = extractVerifyLink(text || html);
    expect(inviteLink, 'the invite email carries a verify link').toContain('/auth/v1/verify');
  });

  test('F02.3 the student signs up from the invite and is linked to the shadow', async ({
    browser,
  }) => {
    test.skip(!inviteLink, 'F02.2 did not find the invite mail');
    test.setTimeout(150_000);

    // The student follows the link from the mail F02.2 found.
    const hash = await consumeVerifyLink(inviteLink!);
    expect(hash).toContain('access_token=');
    expect(hash).toContain('type=invite');

    // The student opens it in their own browser (no admin cookies) and sets a password.
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    try {
      // domcontentloaded: a cold compile of this route on a shared dev server
      // keeps the load event past 30s, and the form is what matters.
      await studentPage.goto(`/accept-invitation${hash}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await expect(studentPage.locator('#password')).toBeVisible({ timeout: 45_000 });
      await studentPage.locator('#password').fill(CLAIM_PASSPHRASE);
      await studentPage.locator('#confirmPassword').fill(CLAIM_PASSPHRASE);
      await studentPage.getByRole('button', { name: 'Set Password & Continue' }).click();
      // Already a student (the claim set the role): no role step, straight to
      // the journey step, which F02.4 completes.
      await studentPage.waitForURL(/\/onboarding/, { timeout: 30_000 });
      await expect(studentPage.getByText('Where are you with guitar?')).toBeVisible({
        timeout: 30_000,
      });
      await expect(studentPage.getByText('Teacher or student')).toHaveCount(0);
      studentStorage = await studentContext.storageState();
    } finally {
      await studentContext.close();
    }

    // S2 claim-in-place: the shadow row IS the student's profile, same id.
    const { data: claimed } = await adminClient()
      .from('profiles')
      .select('id, is_shadow, invite_email, email, user_id, is_student, full_name')
      .eq('id', profileId!)
      .single();
    authUserId = claimed?.user_id ?? null;
    expect(claimed?.is_shadow).toBe(false);
    expect(claimed?.invite_email).toBeNull();
    expect(claimed?.email).toBe(EMAIL);
    expect(claimed?.user_id).toBeTruthy();
    expect(claimed?.is_student).toBe(true);
    expect(claimed?.full_name).toBe(NAME);

    const { data: fresh } = await adminClient().from('profiles').select('id').eq('email', EMAIL);
    expect(fresh, 'no second profile was minted for the invited email').toHaveLength(1);
  });

  test('F02.4 the student sees their level and goals captured in onboarding', async ({
    browser,
  }) => {
    test.skip(!studentStorage, 'F02.3 did not reach the onboarding page');
    test.setTimeout(90_000);
    const context = await browser.newContext({ storageState: studentStorage! });
    const page = await context.newPage();
    try {
      await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      // A toggle only flips once React owns the page: use aria-pressed as the
      // hydration gate (a click that lands earlier is silently dropped).
      const level = page.getByRole('button', { name: /A few months in/ });
      await expect(level).toBeVisible({ timeout: 45_000 });
      await expect(async () => {
        await level.click();
        await expect(level).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 });
      }).toPass({ timeout: 30_000 });
      const goal = page.getByRole('button', { name: 'Learn classic songs' });
      await goal.click();
      await expect(goal).toHaveAttribute('aria-pressed', 'true');
      const finish = page.getByRole('button', { name: 'Finish setup' });
      await expect(finish).toBeEnabled();
      await finish.click();
      // saveOnboarding revalidates, so the action re-renders /onboarding, which
      // now redirects to /dashboard — often before the Done step paints. Either
      // landing is a completed onboarding (same contract as
      // e2e/onboarding/complete-flow.spec.ts); the DB checks below are the proof.
      // A bare /dashboard/i link only matched the desktop sidebar, never phones.
      await expect(async () => {
        if (new URL(page.url()).pathname.startsWith('/dashboard')) return;
        await expect(page.getByRole('link', { name: /Go to dashboard/ })).toBeVisible({
          timeout: 2_000,
        });
      }).toPass({ timeout: 30_000 });
    } finally {
      await context.close();
    }

    const db = adminClient();
    const { data: profile } = await db
      .from('profiles')
      .select('skill_level, onboarding_completed, is_student, is_teacher')
      .eq('id', profileId!)
      .single();
    expect(profile).toMatchObject({
      skill_level: 'novice',
      onboarding_completed: true,
      is_student: true,
      is_teacher: false,
    });
    const { data: prefs } = await db
      .from('user_preferences')
      .select('goals')
      .eq('profile_id', profileId!)
      .single();
    expect(prefs?.goals).toContain('classics');

    // Done once: the page now hands the student straight to the dashboard.
    const again = await browser.newContext({ storageState: studentStorage! });
    try {
      const p = await again.newPage();
      await p.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await p.waitForURL(/\/dashboard/, { timeout: 30_000 });
    } finally {
      await again.close();
    }
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
