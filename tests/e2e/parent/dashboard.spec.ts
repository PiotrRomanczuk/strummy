import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
    // The stat chip's label (the songs card title is capitalised).
    await expect(page.getByText(/^songs?$/)).toBeVisible();
  });

  test("parent sees the child's homework and songs", async ({ page }) => {
    const db = adminClient();
    const studentId = await getStudentId(db);
    const [{ data: assignments }, { data: songs }] = await Promise.all([
      db
        .from('assignments')
        .select('title')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .not('title', 'is', null),
      db.from('student_repertoire').select('song_id').eq('student_id', studentId).limit(1),
    ]);

    await page.goto('/dashboard');
    if ((assignments ?? []).length > 0) {
      const list = page.getByTestId('parent-assignments');
      await expect(list).toBeVisible({ timeout: 15_000 });
      // One of the child's homework titles is on the page.
      const titles = (assignments ?? []).map((a) => a.title as string);
      await expect(list.getByText(new RegExp(titles.map(escape).join('|')))).not.toHaveCount(0);
    }
    if ((songs ?? []).length > 0) {
      await expect(page.getByTestId('parent-songs')).toBeVisible();
    }
    await expect(
      page.getByTestId('parent-past-lessons').or(page.getByText(/first lesson is still ahead/))
    ).toBeVisible();
  });

  test('parent sidebar has no teacher/admin nav items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
    // By href, not label: labels get renamed ("People" → "Students") and a
    // stale label makes toHaveCount(0) pass forever.
    for (const route of ['users', 'songs', 'lessons', 'assignments', 'logs']) {
      await expect(page.locator(`a[href^="/dashboard/${route}"]`)).toHaveCount(0);
    }
  });

  test('parent is redirected away from teacher/admin-only routes', async ({ page }) => {
    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/dashboard\/users$/);
  });
});
