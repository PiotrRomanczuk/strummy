import type { Page } from '@playwright/test';

/**
 * Drives the Claude Design lesson form: student avatar pills (not a select) and
 * separate Date / Time inputs (not one datetime-local).
 */
export async function pickLessonStudent(page: Page, index = 0): Promise<void> {
  await page.getByTestId('student-pill').nth(index).click();
}

/** `when` is `YYYY-MM-DDTHH:mm`, the shape the old `#lesson-when` input took. */
export async function setLessonWhen(page: Page, when: string): Promise<void> {
  const [date, time] = when.split('T');
  await page.locator('#lesson-date').fill(date);
  await page.locator('#lesson-time').fill(time);
}

/** Pick a specific student by profile id. */
export async function pickLessonStudentById(page: Page, studentId: string): Promise<void> {
  await page.locator(`[data-testid="student-pill"][data-student-id="${studentId}"]`).click();
}

/** Tick the first song card in "Songs to cover". Returns false when no songs exist. */
export async function pickFirstLessonSong(page: Page): Promise<boolean> {
  const cards = page.getByTestId('lesson-song-card');
  if ((await cards.count()) === 0) return false;
  await cards.first().click();
  return true;
}
