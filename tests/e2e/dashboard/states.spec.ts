import { test, expect } from '@playwright/test';
import { loginAs, type DashboardRole } from '../../helpers/dashboard';

/**
 * DASH-004 - Loading / Empty / Error state primitives.
 *
 * The primitives are purely presentational and not yet mounted on any page,
 * so this spec only smoke-tests that adding the module does not break the
 * existing `/dashboard` route for any of the three roles.
 *
 * It used to assert one greeting for all three, on the note that "the
 * dashboards greet with Good morning/afternoon/evening". That holds for the
 * teacher and student dashboards but never did for the admin one, which leads
 * with "Admin overview" — so the admin case failed against a page that renders
 * perfectly well. Each role now gets the heading it actually has.
 */
const HEADING_BY_ROLE: Record<DashboardRole, RegExp> = {
  // AdminDashboard.tsx: "Admin overview" / "The whole studio at a glance."
  admin: /admin overview/i,
  teacher: /good (morning|afternoon|evening)/i,
  student: /good (morning|afternoon|evening)/i,
};

test.describe('DASH-004 states primitives smoke', () => {
  const roles: readonly DashboardRole[] = ['admin', 'teacher', 'student'] as const;

  for (const role of roles) {
    test(`${role} dashboard still renders after adding states module`, async ({ page }) => {
      await loginAs(page, role);
      await expect(page).toHaveURL(/\/dashboard/);

      await expect(page.getByText(HEADING_BY_ROLE[role]).first()).toBeVisible();

      // The point of the smoke test: the route renders rather than erroring.
      await expect(
        page.locator('text=/something went wrong|application error|internal server error/i')
      ).toHaveCount(0);
    });
  }
});
