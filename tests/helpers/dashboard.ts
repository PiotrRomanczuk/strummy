import { expect, type Page } from '@playwright/test';
import { loginAsAdmin, loginAsStudent, loginAsTeacher } from './auth';
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

/**
 * Logs into the dashboard as the given role.
 * Uses the existing role-specific helpers in `tests/helpers/auth.ts`.
 */
export async function loginAs(page: Page, role: DashboardRole): Promise<void> {
  if (role === 'admin') return loginAsAdmin(page);
  if (role === 'teacher') return loginAsTeacher(page);
  return loginAsStudent(page);
}

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
