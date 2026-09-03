import { test, expect } from '../../fixtures';
import { cell, noteChips, openPublicFretboard, HIGH_E, TOTAL_CELLS } from '../../helpers/fretboard';
import { isStackedLayout } from '../../helpers/viewport';

/**
 * The free public fretboard at `/fretboard` — the one page of the product a
 * stranger can use without an account, and the hook the studio is marketed on.
 *
 * NOTHING in this file logs in. That is the point: every test here is what a
 * visitor arriving from a link gets. A `loginAs` creeping into this file would
 * silently stop testing the thing it exists to test — the signed-in variant
 * lives in its own describe at the bottom and says so.
 *
 * The board's own behaviour is covered exhaustively in
 * `tests/e2e/teacher/fretboard*.spec.ts`; here it is only proven that the same
 * board — not a cut-down copy — works with no session at all.
 */

test.describe('Free fretboard — anonymous visitor', { tag: ['@public', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    await openPublicFretboard(page);
  });

  test('opens for a visitor with no account and no redirect to sign-in', async ({ page }) => {
    await expect(page).toHaveURL(/\/fretboard/);
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('[data-testid="fbp-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="fb-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="fbp-heading"]')).toHaveText(
      'Guitar fretboard explorer'
    );
    await expect(page.locator('[data-testid="fbp-badge"]')).toContainText('no sign-up');
  });

  test('is the whole tool, not a teaser: nothing is gated', async ({ page }) => {
    // The full board.
    await expect(page.locator('[data-testid^="fb-cell-"]')).toHaveCount(TOTAL_CELLS);
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-marker', 'root');

    // Key + scale.
    await page.locator('[data-testid="fb-key-C"]').click();
    await page.locator('[data-testid="fb-scale-major"]').click();
    await expect(noteChips(page)).toHaveCount(7);
    await expect(cell(page, HIGH_E, 8)).toHaveAttribute('data-marker', 'root');

    // Chords of the key.
    await page.locator('[data-testid="fb-diatonic-V"]').click();
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('G');

    // CAGED.
    await page.locator('[data-testid="fb-caged-E"]').click();
    await expect(page.locator('[data-testid="fb-caged-zone-E"]')).toBeAttached();

    // Identification and playback.
    await cell(page, HIGH_E, 3).click();
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('string 1');
    const play = page.locator('[data-testid="fb-play"]');
    await play.click();
    await expect(play).toHaveAttribute('data-playing', 'true');
    await play.click();
    await expect(play).toHaveAttribute('data-playing', 'false');
  });

  test('hands out links back to the free page, not to the login wall', async ({ page }) => {
    await expect(page.locator('[data-testid="fb-share-url"]')).toHaveText(
      '/fretboard?key=A&mode=scale&scale=pentatonic_minor'
    );

    await page.locator('[data-testid="fb-key-C"]').click();
    await page.locator('[data-testid="fb-caged-G"]').click();

    const shown = (await page.locator('[data-testid="fb-share-url"]').textContent()) ?? '';
    expect(shown).toContain('/fretboard?');
    expect(shown).not.toContain('/dashboard');
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(shown);
  });

  test('a shared link opens the same view for the next stranger', async ({ page }) => {
    await openPublicFretboard(page, '?key=D&mode=chord&chord=minor7&caged=G&style=mono');

    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Minor 7th · Dm7');
    await expect(page.locator('[data-testid="fb-caged-zone-G"]')).toBeAttached();
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'mono');
    await expect(noteChips(page)).toHaveCount(4);
  });

  test('every way out leads somewhere a signed-out visitor can go', async ({ page }) => {
    await expect(page.locator('[data-testid="fbp-home"]')).toHaveAttribute('href', '/');
    await expect(page.locator('[data-testid="fbp-signin"]')).toHaveAttribute('href', '/sign-in');
    // Self-service sign-up is CLOSED in this product — `/sign-up` redirects to
    // the interest form (app/(auth)/sign-up/page.tsx). Every call to action
    // here must therefore lead to the demo studio or that form, never to a
    // registration page that does not exist. The first draft of this page got
    // that wrong and this assertion is what caught it.
    await expect(page.locator('[data-testid="fbp-demo"]')).toHaveAttribute(
      'href',
      '/sign-in?demo=true'
    );
    await expect(page.locator('[data-testid="fbp-cta-demo"]')).toHaveAttribute(
      'href',
      '/sign-in?demo=true'
    );
    await expect(page.locator('[data-testid="fbp-cta-secondary"]')).toHaveAttribute(
      'href',
      '/for-teachers'
    );
    // The in-app quiz would bounce a stranger to sign-in, so here it points at
    // the demo studio, where the quiz actually runs.
    await expect(page.locator('[data-testid="fb-quiz-link"]')).toHaveAttribute(
      'href',
      '/sign-in?demo=true'
    );
    // And the studio link is only for people who already have one.
    await expect(page.locator('[data-testid="fbp-studio"]')).toHaveCount(0);
  });

  test('the call to action goes somewhere that exists', async ({ page }) => {
    await expect(page.locator('[data-testid="fbp-cta"]')).toBeVisible();
    await page.locator('[data-testid="fbp-cta-demo"]').click();
    // The demo studio, not a redirect chain into a closed registration form.
    await expect(page).toHaveURL(/\/sign-in\?demo=true/, { timeout: 30_000 });
    await expect(page).not.toHaveURL(/for-teachers/);
  });

  test('the secondary route is the interest form the studio actually uses', async ({ page }) => {
    await page.locator('[data-testid="fbp-cta-secondary"]').click();
    await expect(page).toHaveURL(/\/for-teachers/, { timeout: 30_000 });
  });

  test('shows none of the app chrome, and no account data', async ({ page }) => {
    await expect(page.locator('[data-nav-item]')).toHaveCount(0);
    await expect(page.locator('[data-testid="sidebar-mobile-trigger"]')).toHaveCount(0);
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body).not.toMatch(/@dev\.local|@gmail\.com/);
  });

  test('carries the security headers the rest of the app gets', async ({ page }) => {
    const response = await page.goto('/fretboard');
    const headers = response?.headers() ?? {};
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('is described for search engines and social cards', async ({ page }) => {
    await expect(page).toHaveTitle(/Free Guitar Fretboard Explorer/);

    const meta = async (selector: string) => page.locator(selector).first().getAttribute('content');
    expect(await meta('meta[name="description"]')).toContain('six strings');
    expect(await meta('meta[property="og:title"]')).toContain('Fretboard Explorer');
    expect(await meta('meta[property="og:type"]')).toBe('website');
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toContain(
      '/fretboard'
    );
    // Indexable — the whole point of the page.
    const robots = await page.locator('meta[name="robots"]').first().getAttribute('content');
    expect(robots ?? 'index').not.toContain('noindex');

    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const structured = JSON.parse(jsonLd ?? '{}');
    expect(structured['@type']).toBe('WebApplication');
    expect(structured.isAccessibleForFree).toBe(true);
  });

  test('is crawlable: robots.txt allows it and the sitemap lists it', async ({ page }) => {
    const robots = await page.request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    const robotsBody = await robots.text();
    expect(robotsBody).toContain('Disallow: /dashboard/');
    expect(robotsBody).toContain('Sitemap:');

    const sitemap = await page.request.get('/sitemap.xml');
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain('/fretboard');
  });

  test('speaks Polish on the first paint of a ?lang=pl link', async ({ page }) => {
    await openPublicFretboard(page, '?lang=pl');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expect(page.locator('[data-testid="fbp-heading"]')).toHaveText(
      'Eksplorator gryfu gitary'
    );
    await expect(page).toHaveTitle(/Darmowy eksplorator gryfu gitary/);
    // The board itself is translated too, not just the marketing wrapper.
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Pentatonika molowa');
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('Dotknij dźwięku');
    await expect(page.locator('[data-testid="fbp-cta-demo"]')).toContainText('Otwórz demo studia');
    // Note names stay universal — a Polish guitarist reads A, C#, G the same way.
    await expect(cell(page, HIGH_E, 5)).toHaveText('A');
  });

  test('an unknown ?lang= falls back rather than breaking', async ({ page }) => {
    await openPublicFretboard(page, '?lang=klingon');
    await expect(page.locator('[data-testid="fbp-heading"]')).toHaveText(
      'Guitar fretboard explorer'
    );
  });

  test('is usable by keyboard and announced to assistive tech', async ({ page }) => {
    // Exactly one h1: the marketing hero. The board's own title steps down to
    // an h2 here, because a page with two h1s reads as two documents to a
    // crawler and to a screen reader's outline — and this page is indexed.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Guitar fretboard explorer');
    await expect(page.locator('[data-testid="fb-title"]')).toHaveJSProperty('tagName', 'H2');
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute(
      'aria-label',
      /6 strings and 15 frets/
    );

    await cell(page, HIGH_E, 5).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('fret 5');
  });

  test('fits a phone without horizontal overflow', async ({ page }) => {
    test.skip(!isStackedLayout(page), 'Stacked-layout-only test');

    await expect(page.locator('[data-testid="fbp-heading"]')).toBeVisible();
    await expect(page.locator('[data-testid="fb-rotate-hint"]')).toBeVisible();

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

    // The board still leads, and the CTA is below it rather than in the way.
    const board = await page.locator('[data-testid="fb-board"]').boundingBox();
    const cta = await page.locator('[data-testid="fbp-cta"]').boundingBox();
    expect(board!.y).toBeLessThan(cta!.y);
  });
});

test.describe(
  'Free fretboard — visitor who already has an account',
  { tag: ['@fretboard'] },
  () => {
    test('is offered the studio instead of a sign-up', async ({ loginAs, page }) => {
      test.setTimeout(90_000);
      await loginAs('student');
      await openPublicFretboard(page);

      await expect(page.locator('[data-testid="fbp-studio"]')).toHaveAttribute(
        'href',
        '/dashboard'
      );
      await expect(page.locator('[data-testid="fbp-cta-studio"]')).toBeVisible();
      await expect(page.locator('[data-testid="fbp-demo"]')).toHaveCount(0);
      // The tool itself is identical — same board, same links home.
      await expect(page.locator('[data-testid^="fb-cell-"]')).toHaveCount(TOTAL_CELLS);
      await expect(page.locator('[data-testid="fb-share-url"]')).toContainText('/fretboard?');
    });
  }
);
