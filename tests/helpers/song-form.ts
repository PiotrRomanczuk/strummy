import type { Page } from '@playwright/test';

/**
 * Picks a difficulty level in the song form. Since 2026-10-21 the form has no
 * preselected level (a default "beginner" was saved as if chosen), so a spec
 * that submits the form must choose one or the server rejects it.
 */
export async function pickSongLevel(page: Page, level = 'Beginner'): Promise<void> {
  await page
    .locator('.ui-song-level-btn', { hasText: level })
    .filter({ visible: true })
    .first()
    .click();
}

/**
 * Submits the new-song form on any viewport. Desktop shows "Create song" in
 * the page header; phones get the Claude Design wizard (`md:hidden`), where
 * the submit button only exists on step IV — a spec that reaches for the
 * header button times out on every phone project.
 */
export async function submitSongForm(page: Page): Promise<void> {
  const headerSubmit = page.getByTestId('song-save');
  if (await headerSubmit.isVisible()) return headerSubmit.click();
  for (let step = 0; step < 3; step++) await page.getByRole('button', { name: /^Next/ }).click();
  await page.getByTestId('song-save-mobile').click();
}
