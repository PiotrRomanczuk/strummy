import type { Page } from '@playwright/test';

/**
 * Drives the Claude Design assignment form (2026-10-10): students are avatar
 * pills (several can be picked), and Title / template / checklist sit in the
 * collapsed "V · Extras" section. Submit is the header's "Send assignment".
 */

/** Pick the first student pill. Returns false when no students are seeded. */
export async function pickFirstAssignmentStudent(page: Page): Promise<boolean> {
  const pills = page.getByTestId('student-pill');
  await pills
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {});
  if ((await pills.count()) === 0) return false;
  await pills.first().click();
  return true;
}

/** Expand "Title, checklist & drills" (idempotent). */
export async function openAssignmentExtras(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: /Title, checklist & drills/ });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}

export const sendAssignmentButton = (page: Page) =>
  page.getByRole('button', { name: /send assignment/i }).first();
