import { test, expect } from '../../fixtures';
import { openNav } from '../../helpers/dashboard';
import { suppressDemoTour } from '../../helpers/demo-tour';

/**
 * The whole promo journey, on a phone.
 *
 * The first campaign is a Facebook post to Polish guitar teachers, and
 * Facebook traffic is overwhelmingly mobile — most people meeting Strummy for
 * the first time will do it in a phone browser. The existing mobile suite
 * checks responsiveness with the ordinary role accounts, and the demo suite
 * checks the demo account on desktop; nothing walked the actual path from
 * "tapped a link" to "left a contact" on a small screen.
 *
 * Skipped on desktop projects: these assertions are about the phone layout.
 */

const hasHorizontalOverflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.body.scrollWidth > window.innerWidth + 1);

test.describe('Demo journey on a phone', { tag: ['@demo', '@mobile'] }, () => {
  // `locale`, not extraHTTPHeaders: Chromium writes its own Accept-Language and
  // overrides the extra header, so setting the header looked like it worked and
  // silently served English.
  test.describe('with a Polish phone', () => {
    test.use({ locale: 'pl-PL' });

    test('lands in Polish from the browser alone', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Phone layout only');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // No cookie, no ?lang= — this is what a teacher tapping the promo link
      // gets. Asserted on the hero CTA, which stays visible at 360px; the nav
      // links collapse on narrow viewports by design.
      await expect(page.getByText(/Zacznij za darmo/i).first()).toBeVisible({ timeout: 20_000 });
      expect(await hasHorizontalOverflow(page)).toBeFalsy();
    });

    test('the interest form is in Polish too', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Phone layout only');

      await page.goto('/for-teachers');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { level: 1, name: /nauczyciel/i })).toBeVisible({
        timeout: 20_000,
      });
      expect(await hasHorizontalOverflow(page)).toBeFalsy();
    });
  });

  test('the demo studio is usable on a phone', async ({ page, loginAs, isMobile }) => {
    test.skip(!isMobile, 'Phone layout only');
    test.setTimeout(150_000);
    await suppressDemoTour(page);
    await loginAs('demo');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(await hasHorizontalOverflow(page)).toBeFalsy();

    // The drawer is the only way to move around below `md`; if it does not
    // open, the whole studio is a single page to a phone visitor.
    await openNav(page);
    await expect(page.getByTestId('sidebar-mobile')).toBeVisible();
    await page.keyboard.press('Escape');

    // Each surface is asserted on what it actually shows at 375px, not on one
    // shared pattern: the phone lesson list leads with the lesson title and
    // drops the student name for space, so looking for names there fails on a
    // layout that is working exactly as designed.
    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: /#\d+\s+\S/ }).first()).toBeVisible({
      timeout: 20_000,
    });
    expect(await hasHorizontalOverflow(page)).toBeFalsy();

    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Zofia|Jakub|Maja|Piotr/).first()).toBeVisible({ timeout: 20_000 });
    expect(await hasHorizontalOverflow(page)).toBeFalsy();

    await page.goto('/dashboard/assignments');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/Wonderwall|Blackbird|Hotel California|pentatonik/i).first()
    ).toBeVisible({
      timeout: 20_000,
    });
    expect(await hasHorizontalOverflow(page)).toBeFalsy();
  });

  test('the interest form is fillable and submittable on a phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phone layout only');
    test.setTimeout(150_000);

    await page.goto('/for-teachers');
    await page.waitForLoadState('networkidle');
    expect(await hasHorizontalOverflow(page)).toBeFalsy();

    // Tap targets: a form that cannot be hit with a thumb converts nobody.
    for (const id of ['lead-name', 'lead-email', 'lead-submit']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, `${id} has no box`).not.toBeNull();
      expect(box!.height, `${id} is under the 44px touch target`).toBeGreaterThanOrEqual(40);
    }

    const email = `e2e-mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    await page.getByTestId('lead-name').fill('Anna Testowa');
    await page.getByTestId('lead-email').fill(email);
    await page.getByTestId('lead-pain').fill('Zgłoszenie z testu mobilnego — do usunięcia.');
    await page.getByTestId('lead-submit').click();

    await expect(page.getByTestId('lead-success')).toBeVisible({ timeout: 20_000 });
  });
});
