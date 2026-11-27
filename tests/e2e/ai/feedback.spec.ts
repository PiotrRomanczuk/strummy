import { test, expect } from '../../fixtures';
import { purgeOwnedSince } from '../../helpers/purge';
import { adminClient, getAdminId } from '../../helpers/seed-ids';

/**
 * AIA-2 (docs/app-blueprint/08-ai-assistant.md, Tranche 5) — is_helpful
 * feedback. Requires a real AI provider to produce an actual assistant
 * message to react to; run with E2E_AI_PROVIDER set (see tests/e2e/ai/
 * for the shared gating pattern).
 */
test.describe('AI chat feedback', { tag: ['@ai', '@admin'] }, () => {
  // A few seconds back, so a clock that differs from the database's cannot hide a row.
  const startedAt = new Date(Date.now() - 5_000);

  // Every message sent here opens a conversation of the admin account; the chat
  // gives the spec no id to keep. The two AI specs are the only ones that chat
  // as admin, and each purge can only remove threads newer than its own start.
  test.afterAll(async () => {
    const db = adminClient();
    await purgeOwnedSince('ai_conversations', 'profile_id', await getAdminId(db), startedAt);
  });

  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/dashboard/ai/chat');
    await page.waitForLoadState('networkidle');
  });

  test('thumbs up on a completed response persists is_helpful=true', async ({ page }) => {
    test.skip(!process.env.E2E_AI_PROVIDER, 'Needs a live AI provider — see E2E_AI_PROVIDER');
    // A real-provider generation plus a fresh CI login cannot fit the default
    // 30s test budget — the 30s response wait alone can exhaust it.
    test.slow();

    const input = page.locator('[data-testid="ai-assistant-input"]');
    await input.fill('Reply with exactly one word: OK');
    await page.locator('[data-testid="ai-assistant-send"]').click();

    const feedbackButtons = page.getByTestId('ai-feedback-buttons').last();
    await expect(feedbackButtons).toBeVisible({ timeout: 30_000 });

    await feedbackButtons.getByRole('button', { name: 'This response was helpful' }).click();
    await expect(page.getByTestId('ai-feedback-thanks').last()).toBeVisible({ timeout: 10_000 });

    const db = adminClient();
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('ai_messages')
            .select('is_helpful')
            .eq('role', 'assistant')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          return data?.is_helpful;
        },
        { timeout: 10_000 }
      )
      .toBe(true);
  });
});
