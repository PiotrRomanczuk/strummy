import { test, expect } from '../../fixtures';
import { DASHBOARD_GREETING } from '../../helpers/dashboard';

// Must match lib/auth/test-account-guard.ts — not imported because E2E tests
// are excluded from tsconfig and don't resolve @/ paths.
const TEST_ACCOUNT_MUTATION_ERROR = 'This action is not available on test accounts';

/**
 * Demo Account Mutation Guards E2E Tests
 *
 * Verifies that demo accounts (sarah@strummy.app) can browse all pages
 * but are blocked from any data mutations, with proper error messages.
 *
 * 8 tests total (under the 10-test project limit).
 */
test.describe('Demo Account Mutation Guards', { tag: ['@demo', '@security'] }, () => {
  // ── Test 1: Read-only browsing (Mobile) ────────────────────────────
  test('demo user can browse all pages without errors', async ({ page, loginAs }) => {
    test.setTimeout(120_000);
    await loginAs('demo');

    // Dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // The greeting varies by hour ("Late night, Sarah." after 22:00), so match
    // every variant rather than only the daytime ones.
    const heading = page.locator('h1, h2').filter({ hasText: DASHBOARD_GREETING }).first();
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // Songs list — mobile uses card layout, desktop uses table
    await page.goto('/dashboard/songs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').filter({ hasText: /songs/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Lessons list
    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /lessons/i })
        .first()
    ).toBeVisible({ timeout: 15_000 });

    // Assignments — page shows filter tabs directly (no heading on mobile)
    await page.goto('/dashboard/assignments');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/all|overdue|in progress/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // AI page
    await page.goto('/dashboard/ai/chat');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="ai-assistant-input"]')).toBeVisible({
      timeout: 15_000,
    });
  });

  // ── Test 2: Song creation blocked (Mobile) ─────────────────────────
  test('demo user cannot create a song', async ({ page, loginAs }) => {
    // Rewritten: this drove a multi-step wizard via `field-*` testids and waited
    // for a POST /api/song. The form is a single page now and submits through
    // the `createSongAction` SERVER ACTION, so that response never arrived and
    // the testids do not exist. Assert the guard's message instead.
    await loginAs('demo');

    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('input[name="title"]').fill('Demo Test Song');
    await page.locator('input[name="author"]').fill('Demo Artist');

    await page.getByRole('button', { name: /create song/i }).click();

    await expect(page.getByText(TEST_ACCOUNT_MUTATION_ERROR).first()).toBeVisible({
      timeout: 15_000,
    });

    // Refused means refused: still on the form, nothing created.
    await expect(page).toHaveURL(/\/songs\/new/);
  });

  // ── Test 3: Lesson creation blocked via API (Mobile) ────────────────
  test('demo user cannot create a lesson', async ({ page, loginAs }) => {
    await loginAs('demo');

    // Navigate to establish auth context
    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');

    // Directly call the lesson create API with auth cookies
    const baseUrl = page.url().split('/dashboard')[0];
    const response = await page.request.fetch(`${baseUrl}/api/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        title: 'Demo Test Lesson',
        student_id: 'test-student-id',
        scheduled_at: new Date().toISOString(),
      }),
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain(TEST_ACCOUNT_MUTATION_ERROR);
  });

  // ── Test 4: Assignment creation blocked via API (Mobile) ────────────
  test('demo user cannot create an assignment', async ({ page, loginAs }) => {
    await loginAs('demo');

    // Navigate to establish auth context
    await page.goto('/dashboard/assignments');
    await page.waitForLoadState('networkidle');

    // Directly call the assignments API with auth cookies
    const baseUrl = page.url().split('/dashboard')[0];
    const response = await page.request.fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        title: 'Demo Test Assignment',
        student_id: 'test-student-id',
        due_date: new Date().toISOString(),
      }),
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain(TEST_ACCOUNT_MUTATION_ERROR);
  });

  // ── Test 5: API key + drive mutations blocked via API (Mobile) ──────
  test('demo user cannot create API keys or upload files', async ({ page, loginAs }) => {
    await loginAs('demo');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const baseUrl = page.url().split('/dashboard')[0];

    // Test API key creation
    const apiKeyResponse = await page.request.fetch(`${baseUrl}/api/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ name: 'Demo Test Key' }),
    });
    expect(apiKeyResponse.status(), 'POST /api/api-keys should return 403').toBe(403);
    const apiKeyBody = await apiKeyResponse.json();
    expect(apiKeyBody.error).toContain(TEST_ACCOUNT_MUTATION_ERROR);

    // Test drive file upload
    const driveResponse = await page.request.fetch(`${baseUrl}/api/drive/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({}),
    });
    expect(driveResponse.status(), 'POST /api/drive/files should return 403').toBe(403);
    const driveBody = await driveResponse.json();
    expect(driveBody.error).toContain(TEST_ACCOUNT_MUTATION_ERROR);
  });

  // ── Test 6: Bulk API endpoint verification (Mobile) ────────────────
  test('demo user is blocked by all mutation API endpoints', async ({ page, loginAs }) => {
    await loginAs('demo');

    // Wait for auth cookies to be available
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const endpoints = [
      { method: 'POST', path: '/api/lessons' },
      { method: 'POST', path: '/api/assignments' },
      { method: 'POST', path: '/api/api-keys' },
      { method: 'POST', path: '/api/drive/files' },
      { method: 'POST', path: '/api/song/test-id/videos' },
    ];

    for (const { method, path } of endpoints) {
      const response = await page.request.fetch(`${page.url().split('/dashboard')[0]}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({}),
      });

      expect(response.status(), `${method} ${path} should return 403`).toBe(403);

      const body = await response.json();
      expect(body.error, `${method} ${path} should contain error message`).toContain(
        TEST_ACCOUNT_MUTATION_ERROR
      );
    }
  });

  // ── Test 7: AI conversation mutations blocked (Desktop only) ────────
  test('demo user cannot send AI messages', async ({ page, loginAs, browserName }) => {
    // Skip on mobile — bottom nav overlaps the chat input fixed footer
    test.skip(
      !!page.viewportSize() && page.viewportSize()!.width < 768,
      'Mobile nav overlaps AI chat input'
    );
    test.slow(); // AI page may be slow to load
    await loginAs('demo');

    await page.goto('/dashboard/ai/chat');
    await page.waitForLoadState('networkidle');

    // Verify chat interface loads
    await expect(page.locator('[data-testid="ai-messages"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="ai-assistant-input"]')).toBeVisible();

    // Type a message and attempt to send
    const input = page.locator('[data-testid="ai-assistant-input"]');
    await input.fill('Hello from demo');

    const sendButton = page.locator('[data-testid="ai-assistant-send"]');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // createConversation() is called first and returns error
    // The error surfaces as a system message in chat or a toast
    await expect(
      page
        .getByText(TEST_ACCOUNT_MUTATION_ERROR)
        .first()
        .or(
          page.locator('[data-testid="ai-messages"]').locator(`text=${TEST_ACCOUNT_MUTATION_ERROR}`)
        )
        .or(page.locator('[data-sonner-toast]').filter({ hasText: /test accounts/ }))
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── Test 8: Non-demo teacher can still mutate (Desktop, control) ───
  test('non-demo teacher can create a song via API', async ({ page, loginAs }) => {
    await loginAs('teacher');

    // Navigate to establish auth context
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const baseUrl = page.url().split('/dashboard')[0];
    const timestamp = Date.now();

    // Call the same API endpoint that demo gets 403 on — teacher should succeed
    const response = await page.request.fetch(`${baseUrl}/api/song`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        title: `Control Song ${timestamp}`,
        author: 'Control Artist',
        level: 'Beginner',
        key: 'C',
      }),
    });

    // Teacher should NOT get 403
    expect(response.status(), 'Teacher POST /api/song should not be 403').not.toBe(403);

    // Cleanup: delete the created song if it succeeded
    if (response.ok()) {
      const body = await response.json();
      const songId = body?.id || body?.song?.id;
      if (songId) {
        await page.request.fetch(`${baseUrl}/api/song?id=${songId}`, {
          method: 'DELETE',
        });
      }
    }
  });
});
