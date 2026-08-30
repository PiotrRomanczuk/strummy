import { Page, APIRequestContext } from '@playwright/test';

export interface TestCredentials {
  email: string;
  password: string;
}

/**
 * Defaults must match `helpers/seed-ids.ts`, which resolves seed targets from
 * these same emails. They had drifted apart: this file logged in as
 * `student1@example.com` (absent from the DB) while seed-ids seeded
 * `student@dev.local`, so any run that could not reuse `tests/.auth/*.json`
 * authenticated as nobody — and the seeded rows belonged to a different user.
 */
export const TEST_CREDENTIALS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@dev.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'test123_admin',
  },
  teacher: {
    email: process.env.TEST_TEACHER_EMAIL || 'teacher@dev.local',
    password: process.env.TEST_TEACHER_PASSWORD || 'test123_teacher',
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL || 'student@dev.local',
    password: process.env.TEST_STUDENT_PASSWORD || 'test123_student',
  },
} as const;

/**
 * Login helper for Playwright tests
 * Navigates to sign-in page and logs in with provided credentials
 */
export async function login(page: Page, credentials: TestCredentials): Promise<void> {
  // The waits below deliberately mirror `performLogin` in
  // `tests/fixtures/auth.fixture.ts`, which is how the rest of the suite signs
  // in. This helper is the repo's second implementation of the same flow and
  // had drifted behind the first on all three waits that matter — the fixture
  // had already had to move off `networkidle`/`load` and to a 60s budget for
  // the post-submit navigation, and carries comments saying why.
  //
  // That drift is what failed `dashboard/topbar.spec.ts` on Desktop Chrome in
  // the 2026-08-30 PR run (`page.waitForURL: Timeout 30000ms exceeded` waiting
  // for `**/dashboard**`, on all three attempts) while every spec on the
  // fixture passed in the same job. Keep the two in step.
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 45000 });

  // The sign-in page renders a bare "Loading..." div — no <form> at all —
  // while it checks for an existing session, so wait for the field itself to
  // be *visible* rather than for a form to be attached.
  await page.waitForSelector('[data-testid="signin-email"]', {
    state: 'visible',
    timeout: 30000,
  });

  // Fill in the login form using data-testid
  await page.locator('[data-testid="signin-email"]').fill(credentials.email);
  await page.locator('[data-testid="signin-password"]').fill(credentials.password);

  // Click sign-in, then wait for the redirect. `waitForURL` matches the
  // current URL too, so it cannot miss a fast navigation and does not need to
  // be armed before the click. `domcontentloaded` rather than the default
  // `load`: the dashboard's own subresources are not what proves a sign-in
  // worked, and waiting for them is what blew the old 30s budget.
  await page.locator('[data-testid="signin-button"]').click();
  await page.waitForURL('**/dashboard**', { timeout: 60000, waitUntil: 'domcontentloaded' });

  // Verify we're on the dashboard
  await page.waitForLoadState('networkidle', { timeout: 30000 });
}

/**
 * Login as admin
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, TEST_CREDENTIALS.admin);
}

/**
 * Login as teacher
 */
export async function loginAsTeacher(page: Page): Promise<void> {
  await login(page, TEST_CREDENTIALS.teacher);
}

/**
 * Login as student
 */
export async function loginAsStudent(page: Page): Promise<void> {
  await login(page, TEST_CREDENTIALS.student);
}

/**
 * Get authenticated request context
 * Useful for API testing with authentication
 */
export async function getAuthenticatedContext(
  page: Page,
  credentials: TestCredentials
): Promise<void> {
  await login(page, credentials);
}
