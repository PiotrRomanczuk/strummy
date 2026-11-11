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
 * Shows wizard step `step` of the new-song form on phones, where every other
 * step is display:none — step II holds the external links, step III/IV the
 * rest. A no-op on desktop, which renders every section at once.
 */
export async function showSongFormStep(page: Page, step: 1 | 2 | 3 | 4): Promise<void> {
  const stepper = page.getByRole('button', { name: `Go to step ${step}`, exact: true });
  if (await stepper.isVisible()) await stepper.click();
}

/**
 * Submits the new-song form on any viewport. Desktop shows "Create song" in
 * the page header; phones get the Claude Design wizard (`md:hidden`), where
 * the submit button only exists on step IV — a spec that reaches for the
 * header button times out on every phone project. Works from any step.
 */
export async function submitSongForm(page: Page): Promise<void> {
  const headerSubmit = page.getByTestId('song-save');
  if (await headerSubmit.isVisible()) return headerSubmit.click();
  // Count the Next clicks up front: polling Next's visibility races the
  // re-render that swaps it for the submit button on step IV.
  const current = await page.locator('button[aria-current="step"]').getAttribute('aria-label');
  const step = Number(current?.match(/\d+/)?.[0] ?? 1);
  for (let i = step; i < 4; i++) await page.getByRole('button', { name: /^Next/ }).click();
  await page.getByTestId('song-save-mobile').click();
}
