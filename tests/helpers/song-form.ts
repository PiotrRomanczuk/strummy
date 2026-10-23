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
