import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * Cross-Role Tests: AI Prompt Admin
 * Verifies that only Admin roles can access the AI Prompt templates dashboard.
 */

test.describe('AI Prompts Administration', { tag: ['@cross-role', '@prompts'] }, () => {
  const adminUrl = '/dashboard/admin/prompts';

  test.beforeAll(async () => {
    const db = adminClient();

    // Ensure at least one AI prompt exists for the UI test
    const { data: existingPrompts } = await db.from('ai_prompt_templates').select('id').limit(1);
    if (!existingPrompts || existingPrompts.length === 0) {
      await db.from('ai_prompt_templates').insert({
        name: 'e2e-test-prompt',
        description: 'E2E Test Prompt',
        category: 'custom',
        prompt_template: 'You are an AI assistant for tests. Hello {{name}}',
        variables: ['name'],
        is_system: false,
        is_active: true,
      });
    }
  });

  test('Admin can access and edit AI prompts', async ({ page, loginAs }) => {
    await loginAs('admin');

    await page.goto(adminUrl);
    await page.waitForLoadState('networkidle');

    // Verify page loaded successfully for admin
    await expect(page.getByRole('heading', { name: 'AI Prompt Templates' })).toBeVisible();

    // Verify edit functionality
    const editButton = page.getByRole('button', { name: 'Edit' }).first();
    await editButton.click();

    const textArea = page.locator('textarea').first();
    await expect(textArea).toBeVisible();

    // We just verify the UI elements exist without modifying production prompts
    const saveButton = page.getByRole('button', { name: 'Save Changes' });
    const cancelButton = page.getByRole('button', { name: 'Cancel' });

    await expect(saveButton).toBeVisible();
    await expect(cancelButton).toBeVisible();

    await cancelButton.click();
  });

  test('Teacher is denied access to AI prompts', async ({ page, loginAs }) => {
    await loginAs('teacher');

    await page.goto(adminUrl);
    await page.waitForLoadState('networkidle');

    // Verify redirect to /dashboard
    expect(page.url()).not.toContain(adminUrl);
    expect(new URL(page.url()).pathname).toBe('/dashboard');
  });

  test('Student is denied access to AI prompts', async ({ page, loginAs }) => {
    await loginAs('student');

    await page.goto(adminUrl);
    await page.waitForLoadState('networkidle');

    // Verify redirect to /dashboard or sign-in depending on exact app logic for students
    expect(page.url()).not.toContain(adminUrl);
    expect(['/dashboard', '/dashboard/practice', '/dashboard/lessons', '/sign-in']).toContain(
      new URL(page.url()).pathname
    );
  });
});
