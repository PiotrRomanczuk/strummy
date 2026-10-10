import { test, expect, type Page } from '../../fixtures';
import { pickFirstLessonSong, pickLessonStudent } from '../../helpers/lesson-form';

/**
 * Lesson Notes AI
 *
 * The lesson form was rebuilt as LessonForm (components/lessons/form).
 * It drives the Claude Design form: student pills, #lesson-title (input), song cards
 * (role="checkbox"),
 * #lesson-notes (textarea), and the AI action wrapped in [data-testid="lesson-notes-ai"].
 *
 * The AI button is always rendered but disabled until a student + at least one song + a title
 * are set. Generation needs a reachable AI provider; without one the stream errors and writes
 * a fallback string into the notes — so the wiring is verifiable with just the DB, and only
 * the "meaningful content" assertion is gated behind E2E_AI_PROVIDER.
 */

const AI_ERROR_FALLBACK = 'Error generating notes. Please try again.';

/** Select the first student pill. Returns false when the teacher has no students. */
async function selectFirstStudent(page: Page): Promise<boolean> {
  if ((await page.getByTestId('student-pill').count()) === 0) return false;
  await pickLessonStudent(page);
  return true;
}

/** Tick the first song card. Returns false when none are seeded. */
const selectFirstSong = (page: Page): Promise<boolean> => pickFirstLessonSong(page);

test.describe('Lesson Notes AI', { tag: ['@ai', '@lessons'] }, () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/dashboard/lessons/new');
    await page.waitForLoadState('networkidle');
  });

  test('AI button is disabled before student, songs, and title are set', async ({ page }) => {
    const aiBtn = page.getByTestId('lesson-notes-ai').getByRole('button');
    await expect(aiBtn).toBeVisible();
    await expect(aiBtn).toBeDisabled();
  });

  test('AI button becomes enabled after selecting a student, a song, and a title', async ({
    page,
  }) => {
    if (!(await selectFirstStudent(page))) {
      test.skip(true, 'No seeded students available');
      return;
    }
    if (!(await selectFirstSong(page))) {
      test.skip(true, 'No seeded songs available');
      return;
    }
    await page.fill('#lesson-title', 'Chord Progressions');

    const aiBtn = page.getByTestId('lesson-notes-ai').getByRole('button');
    await expect(aiBtn).toBeEnabled({ timeout: 5_000 });
  });

  test('AI button is disabled when the lesson title is empty', async ({ page }) => {
    if (!(await selectFirstStudent(page))) {
      test.skip(true, 'No seeded students available');
      return;
    }
    if (!(await selectFirstSong(page))) {
      test.skip(true, 'No seeded songs available');
      return;
    }
    // Title empty → not enough to generate.
    await page.fill('#lesson-title', '');

    const aiBtn = page.getByTestId('lesson-notes-ai').getByRole('button');
    await expect(aiBtn).toBeDisabled();
  });

  test('AI button triggers generation', async ({ page }) => {
    test.slow();

    if (!(await selectFirstStudent(page))) {
      test.skip(true, 'No seeded students available');
      return;
    }
    if (!(await selectFirstSong(page))) {
      test.skip(true, 'No seeded songs available');
      return;
    }
    await page.fill('#lesson-title', 'Fingerpicking Basics');

    const aiBtn = page.getByTestId('lesson-notes-ai').getByRole('button');
    await expect(aiBtn).toBeEnabled({ timeout: 5_000 });
    await aiBtn.click();

    // Clicking wires into the notes field: non-empty whether generation succeeds or errors.
    const notes = page.locator('#lesson-notes');
    await expect(async () => {
      expect((await notes.inputValue()).trim().length).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000 });
  });

  test('generated content populates the notes field', async ({ page }) => {
    test.slow();

    if (!(await selectFirstStudent(page))) {
      test.skip(true, 'No seeded students available');
      return;
    }
    if (!(await selectFirstSong(page))) {
      test.skip(true, 'No seeded songs available');
      return;
    }
    await page.fill('#lesson-title', 'Strumming Patterns');

    const aiBtn = page.getByTestId('lesson-notes-ai').getByRole('button');
    await expect(aiBtn).toBeEnabled({ timeout: 5_000 });
    await aiBtn.click();

    const notes = page.locator('#lesson-notes');
    await expect(async () => {
      expect((await notes.inputValue()).trim().length).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000 });

    // Real, non-error content only when a provider is configured.
    if (process.env.E2E_AI_PROVIDER) {
      expect((await notes.inputValue()).trim()).not.toBe(AI_ERROR_FALLBACK);
    }
  });
});
