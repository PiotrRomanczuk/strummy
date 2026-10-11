import { test, expect } from '../../fixtures';
import { type DashboardRole } from '../../helpers/dashboard';

/**
 * DASH-004 - Loading / Empty / Error state primitives.
 *
 * Smoke test: `/dashboard` renders for each role rather than erroring. It used
 * to pin each role's greeting copy, which the Claude Design dashboards
 * (2026-10-10) changed — the student page now leads with a lesson countdown and
 * keeps its h1 for screen readers only. Copy is a component-test concern, so
 * this checks the page has its h1 and no error boundary.
 */
test.describe('DASH-004 states primitives smoke', () => {
  const roles: readonly DashboardRole[] = ['admin', 'teacher', 'student'] as const;

  for (const role of roles) {
    test(`${role} dashboard still renders after adding states module`, async ({
      page,
      loginAs,
    }) => {
      await loginAs(role);
      await expect(page).toHaveURL(/\/dashboard/);

      await expect(page.locator('h1').first()).toBeAttached();

      // The point of the smoke test: the route renders rather than erroring.
      await expect(
        page.locator('text=/something went wrong|application error|internal server error/i')
      ).toHaveCount(0);
    });
  }
});
