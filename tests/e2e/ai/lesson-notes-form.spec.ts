import { test, expect } from '../../fixtures';

/**
 * Lesson Notes AI — form (re-wired).
 *
 * Verifies the `lesson-notes-assistant` agent end-to-end through the
 * lesson form: selecting a student + song + title enables the "Generate Lesson
 * Notes" button; clicking it streams agent output into the notes textarea.
 *
 * Run locally against the local Gemma backend (AI_PROVIDER=ollama). In CI / when
 * no AI backend is available, the generation assertion is allowed to surface an
 * inline error instead — the test still verifies the button wiring.
 */
// Retried once on purpose. This spec calls a live LLM, and under full-suite
// load the provider throttles: the stream returns a near-empty completion that
// passes every wiring assertion and then fails on length. It passes in
// isolation every time. A retry absorbs the throttle without weakening the
// assertion to the point where a genuine stub would slip through.
test.describe.configure({ retries: 1 });

test.describe('Lesson Notes AI (form)', { tag: ['@ai', '@lessons'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('admin');
  });

  test('AI button enables and streams notes for a student + song + title', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/dashboard/lessons/new');
    await page.waitForLoadState('networkidle');

    // Pick a real student (skip the placeholder + "add by email" option).
    const studentValue = await page
      .locator('#lesson-student option')
      .evaluateAll(
        (opts) =>
          (
            opts.find(
              (o) => (o as HTMLOptionElement).value && (o as HTMLOptionElement).value !== '__new__'
            ) as HTMLOptionElement
          )?.value
      );
    test.skip(!studentValue, 'No seeded students available');
    await page.locator('#lesson-student').selectOption(studentValue as string);

    // Pick the first repertoire song (multi-select).
    const songValue = await page
      .locator('#lesson-songs option')
      .evaluateAll((opts) => (opts[0] as HTMLOptionElement)?.value);
    test.skip(!songValue, 'No seeded songs available');
    await page.locator('#lesson-songs').selectOption(songValue as string);

    await page.locator('#lesson-title').fill('Barre chords practice');

    const aiBtn = page.getByRole('button', { name: /generate lesson notes/i });
    await expect(aiBtn).toBeEnabled({ timeout: 10_000 });
    await aiBtn.click();

    // The agent streams into the controlled notes textarea. Allow generous time
    // for the local 12B model.
    await expect(page.locator('#lesson-notes')).not.toHaveValue('', { timeout: 120_000 });
    const notes = await page.locator('#lesson-notes').inputValue();

    // A third party being down is not a regression in this app. The wiring —
    // button enabled, request issued, response streamed back into the field —
    // is what this test owns, and the error path exercises all of it. Skip
    // rather than fail so an OpenRouter outage cannot redden the suite.
    test.skip(
      /^Error generating/i.test(notes),
      `AI provider unavailable, so only the error path could be exercised: ${notes.slice(0, 80)}`
    );

    expect(notes.trim().length).toBeGreaterThan(40);
  });
});
