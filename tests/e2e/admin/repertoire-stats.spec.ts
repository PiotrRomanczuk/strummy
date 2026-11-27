import type { Locator, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

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

/**
 * SNG-15: an AI proposal reaches a song only when an admin accepts it. The proposal is seeded the way the home-machine
 * script writes it (service role); the admin accepts it in the data-quality view and the song gets the genre.
 */
test.describe('AI proposals', { tag: ['@admin'] }, () => {
  const title = `E2E suggestion ${Date.now()}`;
  let db: ReturnType<typeof adminClient>;
  let songId: string;

  test.beforeAll(async () => {
    db = adminClient();
    const { data, error } = await db
      .from('songs')
      .insert({ title, author: 'E2E', level: 'beginner' })
      .select('id')
      .single();
    if (error || !data) throw new Error(`could not seed song: ${error?.message}`);
    songId = data.id;
    const { error: suggestionError } = await db.from('song_suggestions').insert({
      song_id: songId,
      field: 'category',
      value: 'Folk',
      confidence: 0.9,
      reason: 'E2E',
      source: 'e2e',
    });
    if (suggestionError) throw new Error(`could not seed suggestion: ${suggestionError.message}`);
  });

  test.afterAll(async () => {
    if (songId) await db.from('songs').delete().eq('id', songId);
  });

  test('an admin accepts a proposal and the song gets the value', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto(`${PATH}?view=quality&rule=ai&limit=2000`);
    await page.waitForLoadState('networkidle');
    const row = page.getByRole('listitem').filter({ hasText: title });
    await row.getByRole('button', { name: /^(Accept|Zatwierdź)$/ }).click();
    await expect(row.getByText(/(AI proposes|AI proponuje)/)).toHaveCount(0);
    await expect
      .poll(
        async () =>
          (await db.from('songs').select('category').eq('id', songId).single()).data?.category
      )
      .toBe('Folk');
  });
});
