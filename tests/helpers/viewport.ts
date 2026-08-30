import type { Page } from '@playwright/test';

/**
 * The two widths the app actually changes layout at, and the predicates that
 * ask about them.
 *
 * Playwright's `isMobile` fixture is NOT one of these. It means "emulate a
 * touch device with a mobile user agent", and it is `true` for tablets: the
 * `iPad Pro` project is `isMobile: true` at 834px, which is *wider* than the
 * app's `md` breakpoint. So `test.skip(!isMobile, 'Mobile-only test')` on a
 * spec that asserts the phone drawer ran that spec on a tablet, where the
 * persistent sidebar is correctly showing and `sidebar-mobile-trigger` is
 * correctly `md:hidden` — the app was right and the guard was wrong. That cost
 * two failures in the 2026-08-28 nightly. Guard on the width the layout keys
 * off, never on `isMobile`.
 */

/** Tailwind's `md`. Below it the sidebar collapses into the topbar Sheet. */
export const MD_BREAKPOINT = 768;

/**
 * Where `.ui-datalist-desktop` cells stop rendering and `ListDetailPanel`
 * becomes a bottom sheet with a full-screen backdrop.
 * @see app/design-tokens.css — `@media (max-width: 860px)`
 */
export const DATALIST_DESKTOP_MIN = 861;

/** True when the viewport is narrower than `md` — i.e. the phone layout. */
export function isPhoneViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport ? viewport.width < MD_BREAKPOINT : false;
}

/**
 * True when the list surfaces render their desktop form: the column-header
 * strip (and its sort links) and the side panel rather than the bottom sheet.
 */
export function isDesktopListLayout(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport ? viewport.width >= DATALIST_DESKTOP_MIN : true;
}
