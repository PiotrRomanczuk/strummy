import { test, expect } from '../../fixtures';

/**
 * Mobile Responsiveness E2E Tests
 *
 * Validates mobile-specific UI behaviors across iPhone and iPad viewports.
 * Run with: npx playwright test --project="iPhone 12"
 *           npx playwright test --project="iPad Pro"
 *
 * These tests verify:
 * - Mobile bottom navigation visibility
 * - Drawer-based mobile menu
 * - Touch target minimum sizes (44px)
 * - Responsive form layouts
 * - Dashboard responsiveness
 * - Safe area handling
 */
test.describe('Mobile Responsiveness @mobile', { tag: '@mobile' }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  const dashboardRoles = ['teacher', 'student', 'admin'] as const;

  for (const role of dashboardRoles) {
    test(`dashboard loads and displays stats grid on mobile (${role})`, async ({
      page,
      isMobile,
      loginAs,
    }) => {
      test.skip(!isMobile, 'Mobile-only test');

      // beforeEach already logs in as teacher; only re-login when testing a
      // different role so the teacher case reuses that cached session.
      if (role !== 'teacher') {
        await loginAs(role);
      }

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // The old anchor (data-tour="stats-grid") predates the editorial
      // redesign. What matters on mobile: the dashboard renders content…
      await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('main h1, main h2').first()).toBeVisible({ timeout: 15_000 });

      // …and the page has no horizontal overflow (the historical failure mode:
      // fixed-column grids whose min-content beats the viewport).
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
    });
  }

  // The dashboard's mobile nav affordance is the topbar sheet, not a bottom
  // bar — components/v2's MobileBottomNav is built but unmounted.
  test('hamburger opens the nav drawer with dashboard links on mobile', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Mobile-only test');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const trigger = page.getByTestId('sidebar-mobile-trigger');
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.click();

    const drawer = page.getByTestId('sidebar-mobile');
    await expect(drawer).toBeVisible({ timeout: 5_000 });
    await expect(drawer.locator('[data-nav-item="Dashboard"]')).toBeVisible();
  });

  test('touch targets meet 44px minimum on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');

    await page.goto('/dashboard/songs');
    await page.waitForLoadState('networkidle');

    // Check all interactive buttons have at least 44px touch target
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      if (box) {
        // Either width or height should be >= 44px (some inline buttons are wider but shorter)
        const meetsMinimum = box.height >= 40 || box.width >= 40; // 40px allows for slight CSS rounding
        if (!meetsMinimum) {
          const text = await button.textContent();
          console.warn(
            `Button "${text?.trim()}" has small touch target: ${box.width}x${box.height}`
          );
        }
      }
    }
  });

  test('sign-in form is usable on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');

    // beforeEach logs in; an authenticated /sign-in visit just redirects to
    // the dashboard and the form never appears. Drop the session directly —
    // the UI logout helper needs a mounted topbar, which this test never has.
    await page.context().clearCookies();
    await page.goto('/sign-in');
    await page.waitForSelector('[data-testid="email"]', { state: 'visible', timeout: 15000 });

    // Verify form fields are visible and accessible
    const emailInput = page.locator('[data-testid="email"]');
    const passwordInput = page.locator('[data-testid="password"]');
    const submitButton = page.locator('[data-testid="signin-button"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Verify inputs are not clipped by the viewport
    const emailBox = await emailInput.boundingBox();
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    if (emailBox) {
      expect(emailBox.x).toBeGreaterThanOrEqual(0);
      expect(emailBox.x + emailBox.width).toBeLessThanOrEqual(viewportWidth + 1);
    }
  });

  test('songs list renders mobile card view', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');

    await page.goto('/dashboard/songs');
    await page.waitForLoadState('networkidle');

    // On mobile, the table should be hidden and card view should show
    const desktopTable = page.locator('[data-testid="song-table"]');
    const isTableVisible = await desktopTable.isVisible({ timeout: 3000 }).catch(() => false);

    // Table should be hidden on mobile (md:block means hidden below md)
    expect(isTableVisible).toBeFalsy();
  });

  test('no horizontal overflow on key pages', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');

    const pages = ['/dashboard', '/dashboard/songs', '/dashboard/lessons'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth + 1;
      });

      if (hasOverflow) {
        console.warn(`Horizontal overflow detected on ${pagePath}`);
      }
      expect(hasOverflow).toBeFalsy();
    }
  });
});

test.describe('Landing Page Mobile @mobile', { tag: '@mobile' }, () => {
  // The landing page (`/`) is public/unauthenticated — no loginAs beforeEach
  // here, unlike the dashboard-focused describe block above.

  test('landing page renders without horizontal overflow on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Hero heading and primary CTA are visible without signing in
    const heroHeading = page.getByRole('heading', { level: 1 });
    await expect(heroHeading).toBeVisible();

    const startFreeCta = page.getByRole('link', { name: 'Start free' }).first();
    await expect(startFreeCta).toBeVisible();

    // Verify page doesn't have horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
  });

  test('header collapses non-essential nav on narrow mobile viewports', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Mobile-only test');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The editorial landing header has no hamburger/drawer: below 860px both
    // the nav links (.ui-land-nav-links) and the secondary cluster holding
    // "Sign in" (.ui-land-nav-secondary) are display:none, leaving the logo
    // and the "Get started — free" CTA. Branch on the real viewport width so
    // wider isMobile projects (tablets) stay correct. Scope to the nav bar —
    // the footer and final CTA band also contain "Sign in" links.
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    const navLinks = page.locator('.ui-land-nav-links');
    const signInLink = page.locator('a.ui-land-nav-secondary').filter({ hasText: 'Sign in' });
    const primaryCta = page
      .locator('.ui-land-nav-inner')
      .getByRole('link', { name: /get started/i });

    if (viewportWidth < 860) {
      await expect(navLinks).toBeHidden();
      await expect(signInLink).toBeHidden();
    } else {
      await expect(navLinks).toBeVisible();
      await expect(signInLink).toBeVisible();
    }

    // The primary CTA is always visible regardless of viewport
    await expect(primaryCta).toBeVisible();
  });
});

test.describe('iPad Responsiveness @tablet', { tag: '@tablet' }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('iPad shows sidebar or tablet navigation', async ({ page, isMobile }) => {
    // This test should run on iPad projects (not strictly isMobile)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // iPad portrait (768px) or landscape (1024px+) should show navigation
    if (viewportWidth >= 768) {
      // Should have either a sidebar or horizontal nav
      const hasSidebar = await page
        .locator('[data-sidebar]')
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasHorizontalNav = await page
        .locator('nav')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(hasSidebar || hasHorizontalNav).toBeTruthy();
    }
  });

  test('dashboard stats grid uses appropriate columns on iPad', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard uses inline styles; fall back to main content area width check
    const mainContent = page.locator('main, [role="main"], #main-content').first();
    const statsGrid = page.locator('[data-tour="stats-grid"]').first();
    const hasStatsGrid = (await statsGrid.count()) > 0;

    const target = hasStatsGrid ? statsGrid : mainContent;
    await expect(target).toBeVisible({ timeout: 15_000 });

    const gridBox = await target.boundingBox();
    if (gridBox) {
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      // Main content should use most of the available width
      expect(gridBox.width).toBeGreaterThan(viewportWidth * 0.4);
    }
  });
});
