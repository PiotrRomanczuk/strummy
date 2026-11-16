import { test, expect } from '../../fixtures';

/**
 * SNG-13: repertoire statistics are an admin page. An admin reaches every view; a teacher is sent away by the
 * proxy and the page's own guard.
 */

const PATH = '/dashboard/admin/repertoire-stats';
const HEADING = /^(Repertoire statistics|Statystyki repertuaru)$/;

test.describe('Repertoire statistics', { tag: ['@admin', '@access-control'] }, () => {
  test('an admin switches between the four views', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto(PATH);
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible();
    const views = page.getByRole('navigation', { name: /^(Views|Widoki)$/ });
    for (const view of [
      /^(Songs|Piosenki)$/,
      /^(Strummy vs recording|Strummy vs nagranie)$/,
      /^(Song vs repertoire|Piosenka na tle repertuaru)$/,
    ]) {
      await views.getByRole('link', { name: view }).click();
      await expect(views.getByRole('link', { name: view })).toHaveAttribute('aria-current', 'page');
    }
    await expect(page.getByRole('img', { name: /^(Tempo \(BPM\)): / })).toBeVisible();
  });

  test('a teacher cannot open it', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto(PATH);
    await expect(page).not.toHaveURL(/repertoire-stats/);
    await expect(page.getByRole('heading', { name: HEADING })).toHaveCount(0);
  });
});
