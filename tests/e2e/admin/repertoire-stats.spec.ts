import type { Locator, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';

/**
 * SNG-13: repertoire statistics are an admin page. An admin reaches every view; a teacher is sent away by the
 * proxy and the page's own guard.
 */

const PATH = '/dashboard/admin/repertoire-stats';
const HEADING = /^(Repertoire statistics|Statystyki repertuaru)$/;

/** Each view's pill and something only that view shows. */
const VIEWS: [RegExp, (page: Page) => Locator][] = [
  [
    /^(Data quality|Jakość danych)/,
    (page) => page.getByRole('list', { name: /^(Fix queue|Kolejka napraw)$/ }),
  ],
  [
    /^(Strummy vs recording|Strummy vs nagranie)/,
    (page) => page.getByRole('heading', { name: /^(To fix|Do poprawienia)$/ }),
  ],
  [/^(Songs|Piosenki)/, (page) => page.getByRole('search')],
  [
    /^(Song vs repertoire|Na tle repertuaru)/,
    (page) => page.getByRole('heading', { name: /^Tempo$/ }),
  ],
  [
    /^(Progressions|Progresje)/,
    (page) => page.getByRole('heading', { name: /^(Progression ranking|Ranking progresji)$/ }),
  ],
];

test.describe('Repertoire statistics', { tag: ['@admin', '@access-control'] }, () => {
  test('an admin switches between the views', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto(PATH);
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /^(Data coverage|Pokrycie danych)$/ })
    ).toBeVisible();
    const views = page.getByRole('navigation', { name: /^(Views|Widoki)$/ });
    for (const [view, shown] of VIEWS) {
      await views.getByRole('link', { name: view }).click();
      await expect(views.getByRole('link', { name: view })).toHaveAttribute('aria-current', 'page');
      await expect(shown(page).first()).toBeVisible();
    }
  });

  test('the old data-quality address opens the same report, filter kept', async ({
    page,
    loginAs,
  }) => {
    await loginAs('admin');
    await page.goto('/dashboard/admin/data-quality?rule=song.key');
    await expect(page).toHaveURL(/repertoire-stats\?view=quality&rule=song\.key/);
    await expect(page.getByRole('list', { name: /^(Fix queue|Kolejka napraw)$/ })).toBeVisible();
  });

  test('a teacher cannot open it', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto(PATH);
    await expect(page).not.toHaveURL(/repertoire-stats/);
    await expect(page.getByRole('heading', { name: HEADING })).toHaveCount(0);
  });
});
