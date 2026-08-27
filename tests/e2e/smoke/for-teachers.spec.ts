import { test, expect } from '../../fixtures';

/**
 * The interest form behind the public demo — the conversion step for a teacher
 * arriving from a campaign link who is not ready to create an account.
 *
 * Three things are worth pinning here and nowhere else:
 *   - the page is reachable with NO session (it is the anonymous path),
 *   - `?lang=pl` actually renders Polish, because the promo link carries it and
 *     a silently-English page is the failure this whole route exists to avoid,
 *   - a submitted form reaches the thank-you state rather than a raw error.
 *
 * Submissions use a per-run address so a re-run never trips the hourly
 * per-address cap in `submit_teacher_lead()`.
 */

const uniqueEmail = () =>
  `e2e-lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test.describe('Teacher interest form', { tag: '@smoke' }, () => {
  test('renders for a signed-out visitor', async ({ page }) => {
    await page.goto('/for-teachers');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('lead-name')).toBeVisible();
    await expect(page.getByTestId('lead-email')).toBeVisible();
    await expect(page.getByTestId('lead-submit')).toBeVisible();
  });

  test('links back into the demo studio', async ({ page }) => {
    await page.goto('/for-teachers');

    await expect(page.getByTestId('for-teachers-demo-link')).toHaveAttribute(
      'href',
      '/sign-in?demo=true'
    );
  });

  test('?lang=pl renders the Polish copy', async ({ page }) => {
    // Force an English browser so the assertion proves the query parameter
    // did the work, not the Accept-Language fallback.
    await page.context().setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });
    await page.goto('/?lang=pl');
    await page.goto('/for-teachers');

    await expect(page.getByRole('heading', { level: 1, name: /nauczyciel/i })).toBeVisible();
  });

  test('submitting name and email reaches the thank-you state', async ({ page }) => {
    await page.goto('/for-teachers');

    await page.getByTestId('lead-name').fill('Anna Kowalska');
    await page.getByTestId('lead-email').fill(uniqueEmail());
    await page.getByTestId('lead-pain').fill('E2E run — safe to delete.');
    await page.getByTestId('lead-submit').click();

    await expect(page.getByTestId('lead-success')).toBeVisible({ timeout: 15_000 });
  });

  test('an invalid address does not reach the thank-you state', async ({ page }) => {
    await page.goto('/for-teachers');

    await page.getByTestId('lead-name').fill('Anna Kowalska');
    await page.getByTestId('lead-email').fill('not-an-email');
    await page.getByTestId('lead-submit').click();

    await expect(page.getByTestId('lead-success')).toHaveCount(0);
  });
});

/**
 * Registration is closed during the invite-only beta. These pin the doors that
 * must stay shut, because removing a form only hides one of them.
 */
test.describe('Self-service registration is closed', { tag: '@smoke' }, () => {
  test('/sign-up sends a visitor to the interest form', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page).toHaveURL(/\/for-teachers/);
    await expect(page.getByTestId('lead-submit')).toBeVisible({ timeout: 20_000 });
  });

  test('the sign-in page offers no Google button and no account creation', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForSelector('[data-testid="signin-email"]', { state: 'visible' });

    await expect(page.getByRole('button', { name: /continue with google/i })).toHaveCount(0);
    await expect(page.locator('a[href="/sign-up"]')).toHaveCount(0);

    // What replaced it: the way a stranger actually gets an account.
    await expect(page.getByTestId('signin-for-teachers')).toHaveAttribute('href', '/for-teachers');

    // The demo stays reachable straight from here.
    await expect(page.getByRole('button', { name: /try demo account/i })).toBeVisible();
  });
});
