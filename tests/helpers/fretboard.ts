import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Shared vocabulary for the Fretboard Explorer specs.
 *
 * The board is one SVG: six strings × (open + 15 frets), each position a
 * focusable `fb-cell-{row}-{fret}` group carrying `data-note`, `data-active`,
 * `data-root`, `data-interval`, `data-hidden` and `data-marker`. Row 0 is the
 * high E string, row 5 the low E — the order they are drawn in.
 *
 * Cell positions are deterministic from music theory, so the specs name them
 * by string and fret rather than by fixture data. On the high E string the
 * note at fret f is CHROMATIC[(4 + f) % 12]:
 *   fret 0 → E, 3 → G, 5 → A, 8 → C, 9 → C#, 10 → D, 12 → E
 */

export const HIGH_E = 0;
export const B_STRING = 1;
export const G_STRING = 2;
export const D_STRING = 3;
export const A_STRING = 4;
export const LOW_E = 5;

/** 6 strings × (open + 15 frets). */
export const TOTAL_CELLS = 96;

/** Open the tool and wait for the board to be painted. */
export async function openFretboard(page: Page, query = ''): Promise<void> {
  await page.goto(`/dashboard/fretboard${query}`);
  await expect(page.locator('[data-testid="fb-board"]')).toBeVisible({ timeout: 45_000 });
}

/** One position on the neck. */
export function cell(page: Page, row: number, fret: number): Locator {
  return page.locator(`[data-testid="fb-cell-${row}-${fret}"]`);
}

/** How a position is drawn: root · active · chromatic · dim · hidden. */
export async function markerOf(page: Page, row: number, fret: number): Promise<string | null> {
  return cell(page, row, fret).getAttribute('data-marker');
}

/** The scale/chord tone chips in the info rail. */
export function noteChips(page: Page): Locator {
  return page.locator('[data-testid="fb-note-chip"]');
}
