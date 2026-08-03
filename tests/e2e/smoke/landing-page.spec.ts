import { test, expect } from '@playwright/test';

/**
 * Landing Page Content Smoke Tests
 *
 * `smoke/critical-path.spec.ts` only asserts generic things about `/` (body
 * visible, lang attribute, known nav hrefs, no overflow, no console errors).
 * These tests assert the actual marketing content — hero copy, primary CTAs,
 * and the section shells — so a regression in `components/landing/*` fails a
 * spec that names it, not just "some link disappeared".
 *
 * Rewritten 2026-07-27. The landing was rebuilt with a different information
 * architecture and this spec still described the previous one: it looked for
 * `#capabilities` / `#pricing` / `#faq` and headings like "Stop juggling
 * spreadsheets and start teaching", none of which exist. All six tests failed
 * against a landing page that renders correctly.
 *
 * Two sections the old spec covered are simply GONE, not renamed:
 *   - the three-tier pricing table (Starter / Pro $19 / Studio $39)
 *   - the FAQ accordion
 * The beta card ("Free while we're in beta") is the pricing story now. If
 * tiers or an FAQ come back, add tests here rather than reviving the old ones —
 * their copy and anchors will not match.
 *
 * Copy is matched with regexes, not string equality: the headings contain
 * typographic quotes and apostrophes that are easy to get subtly wrong in a
 * literal, and the point is to catch a section disappearing, not to police
 * punctuation.
 */
test.describe('Landing Page Content', { tag: '@smoke' }, () => {
  test.beforeEach(async ({ page }) => {
    // These assertions target desktop presentation specifically (nav links,
    // section layout) — force a desktop viewport regardless of which
    // Playwright project (including the mobile device profiles) runs this.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
  });

  test('hero renders the headline and primary CTAs', async ({ page }) => {
    // The landing is built from plain <div> wrappers — there is no <section>
    // or <header> to scope by, so anchor on the h1, which is unique.
    await expect(page.getByRole('heading', { level: 1, name: /Never wonder/i })).toBeVisible();

    // "Start free" appears twice (hero and beta card). Rather than pick one,
    // assert every instance routes to sign-up — a "Start free" that doesn't is
    // a bug wherever it sits.
    const startFree = page.getByRole('link', { name: 'Start free' });
    await expect(startFree).toHaveCount(2);
    for (const link of await startFree.all()) {
      await expect(link).toHaveAttribute('href', '/sign-up');
    }
    await expect(page.getByRole('link', { name: /See how it works/i })).toHaveAttribute(
      'href',
      '#how-it-works'
    );
  });

  test('header nav links to marketing sections and auth CTAs are correct', async ({ page }) => {
    // The nav is a <div class="ui-land-nav"> wrapping a <nav>, not a
    // <header>. Scope to it so the footer's repeated links don't make these
    // locators match twice (strict-mode violation).
    const header = page.locator('.ui-land-nav');

    await expect(header.getByRole('link', { name: 'Features' })).toHaveAttribute(
      'href',
      '#features'
    );
    await expect(header.getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '#how-it-works'
    );
    await expect(header.getByRole('link', { name: 'For teachers' })).toHaveAttribute(
      'href',
      '#for-teachers'
    );
    // Changelog points at the public releases page, not an on-page anchor.
    await expect(header.getByRole('link', { name: 'Changelog' })).toHaveAttribute(
      'href',
      /github\.com\/.+\/releases/
    );

    await expect(header.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    await expect(header.getByRole('link', { name: /Get started/i })).toHaveAttribute(
      'href',
      '/sign-up'
    );
  });

  test('every nav anchor resolves to a section that exists', async ({ page }) => {
    // The nav is the contract: an anchor pointing at a removed section is a
    // dead link that no individual section test would catch.
    const hrefs = await page
      .locator('.ui-land-nav a[href^="#"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));

    expect(hrefs.length, 'nav should have on-page anchors').toBeGreaterThan(0);
    for (const href of hrefs) {
      await expect(page.locator(href), `${href} must exist on the page`).toHaveCount(1);
    }
  });

  test('how-it-works and for-teachers sections render their copy', async ({ page }) => {
    await expect(
      page.locator('#how-it-works').getByRole('heading', { name: /Three habits/i })
    ).toBeVisible();

    await expect(
      page.locator('#for-teachers').getByRole('heading', { name: /get into teaching/i })
    ).toBeVisible();
  });

  test('beta card states the offer in place of a pricing table', async ({ page }) => {
    // Replaces the old three-tier pricing test. There is no tiered pricing on
    // this landing; the beta card carries the commercial message.
    await expect(
      page.getByRole('heading', { name: /Free while we.{0,3}re in beta/i })
    ).toBeVisible();
  });

  test('final CTA offers account creation', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Play more/i })).toBeVisible();
    // "Create account" is unique to the final CTA — the header and hero use
    // "Get started — free" and "Start free" respectively.
    await expect(page.getByRole('link', { name: /Create account/i })).toHaveAttribute(
      'href',
      '/sign-up'
    );
  });
});
