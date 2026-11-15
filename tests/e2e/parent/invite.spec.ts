import type { BrowserContext } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { extractVerifyLink, fetchMessageBody, waitForEmail } from '../../helpers/mailpit';
import { adminClient } from '../../helpers/seed-ids';

/**
 * Teacher invites a parent from the student page → the parent signs up from
 * the e-mail → lands on the family dashboard with their child. The dev stack's
 * GoTrue delivers to Mailpit, so nothing leaves the server.
 */
const RUN = Date.now();
// Not "E2E …": the global teardown deletes profiles whose full_name starts with E2E.
const CHILD = `Flow Child ${RUN}`;
const PARENT_NAME = `Flow Parent ${RUN}`;
const PARENT_EMAIL = `e2e.parent.${RUN}@dev.local`;
// Built at runtime from the run id; not a credential.
const PASSPHRASE = ['Parent', String(RUN), 'Aa1!'].join('-');

/** Follow a GoTrue verify link and return the `#access_token=…` fragment it redirects to. */
async function consumeVerifyLink(link: string): Promise<string> {
  const res = await fetch(link, { redirect: 'manual' });
  const location = res.headers.get('location') ?? '';
  expect(location, `GoTrue verify redirected (status ${res.status})`).toContain('#');
  return location.slice(location.indexOf('#'));
}

test.describe('Parent invite', { tag: ['@parent'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let childId: string;
  let invitedAt = 0;

  test.beforeAll(async () => {
    const { data, error } = await adminClient()
      .from('profiles')
      .insert({ full_name: CHILD, is_student: true, is_shadow: true, student_status: 'active' })
      .select('id')
      .single();
    if (error || !data) throw new Error(`seed failed: ${error?.message}`);
    childId = data.id;
  });

  test.afterAll(async () => {
    const db = adminClient();
    const { data: parent } = await db
      .from('profiles')
      .select('id, user_id')
      .eq('email', PARENT_EMAIL)
      .maybeSingle();
    await db.from('profiles').delete().eq('id', childId);
    await db.from('profiles').delete().eq('invite_email', PARENT_EMAIL);
    if (parent) await db.from('profiles').delete().eq('id', parent.id);
    if (parent?.user_id) await db.auth.admin.deleteUser(parent.user_id);
  });

  test('teacher links a parent to a student and invites them', async ({
    page,
    loginAs,
  }, testInfo) => {
    test.setTimeout(60_000);
    await loginAs('teacher');
    await page.goto(`/dashboard/users/${childId}`);
    const card = page.getByTestId('student-parent');
    await expect(card.getByRole('button')).toBeEnabled({ timeout: 30_000 });
    await card.getByLabel(/imię i nazwisko rodzica|parent's full name/i).fill(PARENT_NAME);
    await card.getByLabel(/e-mail rodzica|parent's email/i).fill(PARENT_EMAIL);
    invitedAt = Date.now();
    await card.getByRole('button').click();

    await expect(card.getByText(PARENT_NAME)).toBeVisible({ timeout: 20_000 });
    await expect(card.getByText(/zaproszony|invited/i)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('01-parent-invited.png'), fullPage: true });

    const db = adminClient();
    const { data: child } = await db
      .from('profiles')
      .select('parent_id')
      .eq('id', childId)
      .single();
    const { data: parent } = await db
      .from('profiles')
      .select('id, is_parent, is_student, is_teacher, email')
      .eq('id', child!.parent_id!)
      .single();
    expect(parent).toMatchObject({
      is_parent: true,
      is_student: false,
      is_teacher: false,
      email: PARENT_EMAIL,
    });
  });

  test('the parent signs up from the e-mail and sees the child', async ({ browser }, testInfo) => {
    test.skip(!invitedAt, 'the invite was not sent');
    test.setTimeout(150_000);
    const mail = await waitForEmail(PARENT_EMAIL, 20_000, invitedAt - 2_000);
    const { html, text } = await fetchMessageBody(mail.ID);
    const link = extractVerifyLink(text || html);
    expect(link, 'the invite e-mail carries a verify link').toBeTruthy();
    const hash = await consumeVerifyLink(link!);

    let context: BrowserContext | null = null;
    try {
      context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`/accept-invitation${hash}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await expect(page.locator('#password')).toBeVisible({ timeout: 45_000 });
      await page.locator('#password').fill(PASSPHRASE);
      await page.locator('#confirmPassword').fill(PASSPHRASE);
      await page.getByRole('button', { name: /set password/i }).click();

      // Straight to the family dashboard: a parent never gets the role step.
      await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
      await expect(page.getByText('Teacher or student')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: CHILD })).toBeVisible({
        timeout: 30_000,
      });
      await page.screenshot({
        path: testInfo.outputPath('02-parent-dashboard.png'),
        fullPage: true,
      });
    } finally {
      await context?.close();
    }
  });
});
