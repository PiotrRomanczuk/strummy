import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/dashboard';

// The UpcomingLessons card (data-testid="upcoming-lessons-card") is only rendered by the legacy
// dashboard shell, which is unreachable for logged-in users after the editorial redesign —
// TeacherDashboardEditorial now surfaces upcoming work via TeacherDaySpine. Skipped until the
// card is remounted or these specs are retargeted to the editorial day-spine.
test.describe.skip('DASH-006 upcoming lessons card', { tag: '@dashboard' }, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('admin (multi-role with teacher) sees upcoming lessons card', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.getByTestId('upcoming-lessons-card')).toBeVisible();
  });

  test('teacher sees upcoming lessons card with grouped-or-empty state', async ({ page }) => {
    await loginAs(page, 'teacher');
    const card = page.getByTestId('upcoming-lessons-card');
    await expect(card).toBeVisible();
    const hasGroups = (await page.getByTestId('upcoming-lessons-group').count()) > 0;
    const hasEmpty = (await card.getByText(/Nothing scheduled this week/i).count()) > 0;
    expect(hasGroups || hasEmpty).toBeTruthy();
  });

  test('student does not see upcoming lessons card', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.getByTestId('upcoming-lessons-card')).toHaveCount(0);
  });
});
