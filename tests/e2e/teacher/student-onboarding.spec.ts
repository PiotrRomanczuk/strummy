import { randomUUID } from 'crypto';

import { createClient } from '@supabase/supabase-js';

import { test, expect } from '../../fixtures';
import { adminClient as seedAdminClient, getStudentId } from '../../helpers/seed-ids';

/**
 * Student Onboarding UI E2E Tests (A7.*)
 *
 * Tests the three UI pieces that complete the v1 onboarding workflow:
 *  A7.1 — Users list: "+ New student" button visible
 *  A7.2 — Create student form: renders, validates, submits
 *  A7.3 — Student detail: "Import songs" link visible
 *  A7.4 — Song import page: loads, parses textarea, shows preview
 *  A7.5 — Shadow row in users list: shows "Invite →" inline button
 *
 * Mutations create real shadow profiles (no email = no Supabase auth entry).
 * afterAll deletes them via the service role client.
 */

test.describe.configure({ mode: 'serial' });

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

const CREATED_IDS: string[] = [];

// Known existing student reachable by admin (used for read-only tests).
// Resolved from the configured test account: the old literal
// 'student@example.com' has not existed since the accounts moved to @dev.local,
// so this fell through to a hard-coded UUID that 404s and every read-only test
// below saw an empty page.
let EXISTING_STUDENT_ID = '';

test.describe('Student Onboarding UI', { tag: ['@admin', '@onboarding'] }, () => {
  test.beforeAll(async () => {
    EXISTING_STUDENT_ID = await getStudentId(seedAdminClient());
  });

  test.afterAll(async () => {
    if (CREATED_IDS.length === 0) return;
    const db = adminClient();
    await db.from('profiles').delete().in('id', CREATED_IDS);
  });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('admin');
  });

  // ── A7.1 ─────────────────────────────────────────────────────────────────
  test('A7.1 users list shows "+ New student" button', async ({ page }) => {
    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /\+ New student/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── A7.2 ─────────────────────────────────────────────────────────────────
  test('A7.2 /dashboard/users/new renders the create form', async ({ page }) => {
    await page.goto('/dashboard/users/new');
    await page.waitForLoadState('networkidle');

    // No longer "Coming soon"
    await expect(page.locator('text=/Coming soon/i')).not.toBeVisible();

    // Heading — the h1 reads "Add a student"; /Add student/i missed the article.
    await expect(page.getByRole('heading', { name: /add a student/i })).toBeVisible({
      timeout: 10_000,
    });

    // Required fields present
    // Two email inputs on this form (student and parent), so scope to one.
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="submit"], button[type="submit"]')).toBeVisible();
  });

  test('A7.2 create form requires first name, last name, and invite email', async ({ page }) => {
    await page.goto('/dashboard/users/new');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Browser native validation prevents submission (required inputs)
    // — page URL should NOT change to /dashboard/users/<uuid>
    await expect(page).toHaveURL('/dashboard/users/new');
  });

  test('A7.2 create form submits and redirects to student profile', async ({ page }) => {
    test.setTimeout(30_000);

    await page.goto('/dashboard/users/new');
    await page.waitForLoadState('networkidle');

    const ts = Date.now();
    // Target fields by placeholder rather than input index. The form has one
    // "Student name" field (not first/last) and two email inputs, so nth(0)/
    // nth(1) landed on typed inputs — hence "Malformed value" — and the bare
    // email locator matched twice.
    await page.getByPlaceholder('e.g. Emma Johnson').fill(`E2EFirst E2ELast${ts}`);
    await page
      .getByPlaceholder('student@email.com')
      .fill(`e2e-shadow-${ts}@noreply-test.invalid`);

    await page.locator('button[type="submit"]').click();

    // Should redirect to /dashboard/users/<uuid>
    await page.waitForURL(/\/dashboard\/users\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    const url = new URL(page.url());
    const createdId = url.pathname.split('/').pop() ?? '';
    if (createdId) CREATED_IDS.push(createdId);

    // Student detail page renders their name
    await expect(page.locator(`text=E2EFirst`).first()).toBeVisible({ timeout: 10_000 });
  });

  // ── A7.3 ─────────────────────────────────────────────────────────────────
  test('A7.3 student detail page shows "Import songs" link', async ({ page }) => {
    const studentId = EXISTING_STUDENT_ID;
    await page.goto(`/dashboard/users/${studentId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /Import songs/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── A7.4 ─────────────────────────────────────────────────────────────────
  test('A7.4 song import page loads and parses textarea into preview', async ({ page }) => {
    const studentId = EXISTING_STUDENT_ID;
    await page.goto(`/dashboard/users/${studentId}/import`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Import songs/i })).toBeVisible({
      timeout: 10_000,
    });

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    // Type two songs (one with date, one without)
    await textarea.fill('Wonderwall, 01.06.2026\nBlackbird');

    // Preview header should appear (e.g. "Preview — 2 songs")
    await expect(page.locator('text=Preview').first()).toBeVisible({ timeout: 5_000 });
    // Use .first() because "2 songs" matches both the header and the import button
    await expect(page.locator('text=2 songs').or(page.locator('text=2 song')).first()).toBeVisible({
      timeout: 5_000,
    });

    // One row should have "Lesson" and one "Repertoire"
    await expect(page.locator('text=Lesson').first()).toBeVisible();
    await expect(page.locator('text=Repertoire').first()).toBeVisible();

    // Import button should appear
    await expect(page.locator('button').filter({ hasText: /Import 2 song/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  // ── A7.5 ─────────────────────────────────────────────────────────────────
  test('A7.5 shadow user row in users list shows "Invite →" button when email is set', async ({
    page,
  }) => {
    // Create a shadow user with invite_email set directly via service role.
    // Must supply an explicit id — profiles.id has no default.
    const db = adminClient();
    const ts = Date.now();
    const id = randomUUID();
    const shadowEmail = `shadow_e2e_${ts}@placeholder.com`;
    const inviteEmail = `invite-e2e-${ts}@noreply-test.invalid`;

    const { data, error } = await db
      .from('profiles')
      .insert({
        id,
        email: shadowEmail,
        full_name: `E2E Shadow ${ts}`,
        is_shadow: true,
        is_student: true,
        invite_email: inviteEmail,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Shadow insert failed: ${error.message}`);

    if (data?.id) CREATED_IDS.push(data.id);

    await page.goto('/dashboard/users?role=shadow');
    await page.waitForLoadState('networkidle');

    // The shadow row should show "Invite →" button
    await expect(
      page
        .getByRole('button', { name: /Invite →/i })
        .or(page.locator('button:has-text("Invite")'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
