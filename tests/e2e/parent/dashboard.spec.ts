import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

/**
 * Smoke coverage for the parent role — previously exercised by zero tests
 * in the whole suite. profiles.is_parent + profiles.parent_id (student ->
 * parent) drive the ParentView; a parent's entire surface is the family
 * dashboard (getMenuGroups returns no sidebar groups at all for isParent).
 */
test.describe('Parent dashboard', { tag: ['@parent', '@dashboard'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('parent');
  });

  test('parent lands on the family portal and sees their linked child', async ({ page }) => {
    const db = adminClient();
    const studentId = await getStudentId(db);
    const { data: student } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', studentId)
      .single();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Checking in on')).toBeVisible();
    if (student?.full_name) {
      await expect(page.getByRole('heading', { name: student.full_name })).toBeVisible();
    }
    await expect(page.getByText(/songs?$/i)).toBeVisible();
  });

  test('parent sidebar has no teacher/admin nav items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    for (const label of ['People', 'Songs', 'Lessons', 'Assignments', 'Logs']) {
      await expect(page.locator('[data-nav-item]', { hasText: label })).toHaveCount(0);
    }
  });

  test('parent is redirected away from teacher/admin-only routes', async ({ page }) => {
    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/dashboard\/users$/);
  });
});
