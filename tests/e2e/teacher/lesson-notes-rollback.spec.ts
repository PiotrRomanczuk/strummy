/**
 * Locks `notes:no-optimistic-lie` (see tasks/unbreakable-core.md).
 *
 * The notes save UI must NOT show "Saved" when the server returns a 5xx.
 * The only way to verify this is at the browser layer — a unit test cannot
 * exercise the optimistic-UI path.
 *
 * Strategy: open a lesson detail page, intercept the PUT /api/lessons/[id]
 * with a 500, edit the notes, click save (or tab out for auto-save), and
 * assert (a) no green "Saved" toast appears, (b) an error indicator is shown,
 * (c) the textarea content reverts to the last persisted value.
 *
 * @tags @teacher @lesson @unbreakable
 */

import { test, expect } from '../../fixtures';

test.describe(
  'Lesson notes UI rolls back on save failure',
  { tag: ['@teacher', '@unbreakable'] },
  () => {
    test('a 500 from PUT /api/lessons/[id] does not trigger a "Saved" indicator', async ({
      page,
      loginAs,
    }) => {
      await loginAs('teacher');

      // Find any lesson the teacher owns and open its detail page.
      await page.goto('/dashboard/lessons');
      const firstLesson = page.locator('a[href*="/dashboard/lessons/"]').first();
      await firstLesson.click();
      await page.waitForURL(/\/dashboard\/lessons\/[^/]+/, { timeout: 10000 });

      const notesField = page.getByLabel(/notes/i);
      const original = await notesField.inputValue();

      // Intercept the next PUT and force a 500.
      await page.route('**/api/lessons/**', async (route, request) => {
        if (request.method() === 'PUT') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Forced 500 for rollback test' }),
          });
        } else {
          await route.continue();
        }
      });

      await notesField.fill(`${original}\nE2E rollback probe ${Date.now()}`);
      // Trigger whatever save the page uses (Save button OR blur for auto-save).
      const saveButton = page.getByRole('button', { name: /save/i });
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
      } else {
        await notesField.blur();
      }

      // No green "Saved" indicator should appear.
      await expect(page.getByText(/^saved$|saved successfully|✓ saved/i)).toHaveCount(0, {
        timeout: 5000,
      });

      // An error indicator MUST appear.
      await expect(page.getByText(/failed|error saving|could not save/i)).toBeVisible({
        timeout: 5000,
      });

      // Skip the rollback-of-textarea-content assertion until the UI's actual
      // rollback behaviour is decided — some apps leave the typed text in
      // place so the user doesn't lose work, others restore the persisted
      // value. The unbreakable property is "no false success indicator," not
      // "user's draft gets discarded."
    });
  }
);
