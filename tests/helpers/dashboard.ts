import { expect, type Page } from '@playwright/test';
import { isPhoneViewport } from './viewport';

export type DashboardRole = 'admin' | 'teacher' | 'student';

/**
 * Every greeting the teacher/student dashboards can render.
 *
 * `greetingFor()` returns one of five strings by hour — including "Still
 * here"/"Still up" before 05:00 and "Late night" after 22:00. Specs that
 * matched only /good (morning|afternoon|evening)/ therefore passed by day and
 * failed by night; keep the whole set in one place so that cannot recur.
 * @see components/dashboard/teacher/format.ts
 * @see components/dashboard/student/StudentDashboard.tsx
 */
export const DASHBOARD_GREETING = /good (morning|afternoon|evening)|still (here|up)|late night/i;

// There is deliberately no `loginAs` here any more.
//
// This module used to export one that forwarded to `tests/helpers/auth.ts`,
// i.e. a full form sign-in on every call, with no session cache. The rest of
// the suite (75+ specs) signs in through the `loginAs` fixture in
// `tests/fixtures/auth.fixture.ts`, which reuses `tests/.auth/<role>.json`
// and only falls back to the form on a cold or expired cache.
//
// The three `dashboard/` specs that used this helper were therefore the only
// ones paying a real sign-in per test — fifteen of them across the directory,
// all eligible to run at once under `fullyParallel`, against one `next start`
// and one dev Supabase. That is what blew the 60s post-submit redirect budget
// on `dashboard/topbar.spec.ts` in the 2026-10-07 nightly, on all three
// attempts, while every fixture-based spec in the same job passed. Two earlier
// rounds had already chased the same failure with a bigger timeout
// (30s → 45s → 60s); the duplicate sign-in path was the cause.
//
// Use the fixture: `async ({ page, loginAs }) => { await loginAs('admin'); }`.
// `tests/helpers/auth.ts` stays for `e2e/auth/role-login.spec.ts`, which
// exercises the sign-in form itself and so must not use a cached session.

/**
 * Opens the navigation so its links are clickable, on any viewport.
 *
 * Below `md` the persistent aside is hidden and the same NavItems render
 * inside the topbar's Sheet — so a spec that clicks a sidebar link without
 * this passes on Desktop Chrome and times out on every phone project. Use it
 * before clicking any nav link.
 */
export async function openNav(page: Page): Promise<void> {
  if (!isPhoneViewport(page)) return;

  const trigger = page.getByTestId('sidebar-mobile-trigger');
  await trigger.click();
  await expect(page.getByTestId('sidebar-mobile')).toBeVisible();
}

/**
 * Asserts that a nav item with the given label is visible somewhere on
 * the page. The Sidebar tags each link with `data-nav-item="<name>"`.
 *
 * On desktop the link is in the persistent aside; on mobile we open the
 * Sheet drawer first.
 */
export async function expectNavItemVisible(page: Page, name: string): Promise<void> {
  if (isPhoneViewport(page)) {
    await page.getByTestId('sidebar-mobile-trigger').click();
  }
  const item = page.locator(`[data-nav-item="${name}"]`).first();
  await expect(item).toBeVisible();
}

/**
 * Asserts that no nav item with the given label exists on the page.
 * Opens the mobile drawer first on small viewports so we check the full
 * rendered nav, not just the desktop aside.
 */
export async function expectNavItemHidden(page: Page, name: string): Promise<void> {
  if (isPhoneViewport(page)) {
    await page.getByTestId('sidebar-mobile-trigger').click();
  }
  const item = page.locator(`[data-nav-item="${name}"]`);
  await expect(item).toHaveCount(0);
}
