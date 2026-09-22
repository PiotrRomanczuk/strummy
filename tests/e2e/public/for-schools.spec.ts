import { test, expect } from '../../fixtures';

/**
 * `/for-schools` — the public page a music school is sent a link to.
 *
 * Different from `/for-teachers` in two ways worth pinning: it is written for
 * the person running a school (Polish first — that is the market), and its only
 * conversion step is a human, not a form. So the checks here are: it renders
 * with no session, `?lang=pl` reaches Polish on first paint, the contact links
 * point at an inbox that can actually receive mail, and a signed-in teacher —
 * exactly the person who forwards this link to their school — is not bounced
 * into the dashboard the way `/` bounces them.
 *
 * The suite runs with `reducedMotion: 'reduce'` (playwright.config.ts), so the
 * timetable's cover swap is asserted in its end state: the absence is hidden
 * and the cover teacher is shown.
 */

const CONTACT_EMAIL = 'p.romanczuk@gmail.com';

test.describe('For-schools landing page', { tag: '@smoke' }, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('renders for a signed-out visitor', async ({ page }) => {
    await page.goto('/for-schools');

    await expect(page.getByTestId('for-schools-heading')).toBeVisible();
    await expect(page.getByRole('link', { name: /Book a 20-minute call/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'See pricing' })).toBeVisible();
  });

  test('shows the cover lesson resolved in the sample timetable', async ({ page }) => {
    await page.goto('/for-schools');

    // Reduced motion: the "off sick" state is hidden and the cover stands.
    await expect(page.getByText('Cover: Piotr S.')).toBeVisible();
    await expect(page.getByText('Anna L. — off sick')).toBeHidden();
  });

  test('lists all three pricing tiers and the pilot', async ({ page }) => {
    await page.goto('/for-schools');

    for (const tier of ['Small', 'School', 'Network']) {
      await expect(page.getByRole('heading', { name: tier, exact: true })).toBeVisible();
    }
    await expect(page.getByText('199 zł')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A three-month pilot' })).toBeVisible();
  });

  test('contacts a person: mail that arrives, and a phone number', async ({ page }) => {
    await page.goto('/for-schools');

    const email = page.getByTestId('for-schools-email-cta').first();
    // Never @strummy.online — that domain sends but does not receive, so a
    // lead mailed there is lost with no bounce anyone sees.
    await expect(email).toHaveAttribute('href', new RegExp(`^mailto:${CONTACT_EMAIL}\\?subject=`));
    await expect(page.getByTestId('for-schools-phone-cta')).toHaveAttribute(
      'href',
      'tel:+48513602768'
    );
  });

  test('opens an FAQ answer on click', async ({ page }) => {
    await page.goto('/for-schools');

    const question = page.getByText('We do not only teach guitar.');
    const answer = page.getByText(/the instrument is an ordinary lesson category/);

    await expect(answer).toBeHidden();
    await question.click();
    await expect(answer).toBeVisible();
  });

  test('speaks Polish on the first paint of a ?lang=pl link', async ({ page }) => {
    // Force an English browser so this proves the query parameter did the work.
    await page.context().setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });
    await page.goto('/for-schools?lang=pl');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expect(page.getByTestId('for-schools-heading')).toHaveText(
      'Kto uczy, kto był, komu ile zapłacić.'
    );
    await expect(page.getByText('Zastępstwo: Piotr S.')).toBeVisible();
  });

  test('is crawlable: the sitemap lists it', async ({ page }) => {
    const sitemap = await page.request.get('/sitemap.xml');
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain('/for-schools');
  });
});

/**
 * Role coverage. The page is public, so the thing worth proving per role is
 * that a session never takes it away: an admin or teacher sharing the link with
 * their school, and a student who follows it, all land on the page itself
 * rather than being redirected into `/dashboard` the way `/` redirects.
 */
test.describe('For-schools stays public for every role', () => {
  for (const role of ['admin', 'teacher', 'student'] as const) {
    test(`a signed-in ${role} sees the page, not a dashboard redirect`, async ({
      loginAs,
      page,
    }) => {
      await loginAs(role);
      await page.goto('/for-schools');

      await expect(page).toHaveURL(/\/for-schools/);
      // By testid, not by level-1 heading: signed in, AppShell wraps the page in
      // the app chrome, whose sidebar carries its own <h1>Strummy</h1>.
      await expect(page.getByTestId('for-schools-heading')).toBeVisible();
      await expect(page.getByTestId('for-schools-phone-cta')).toBeVisible();
    });
  }
});
