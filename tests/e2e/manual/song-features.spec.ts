import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';

// Manual, prod-only journey: exercises song requests + Song of the Week against
// the dedicated StudentProduction QA accounts (see CLAUDE.local.md "Production
// Test Accounts"). Credentials come from PROD_TEST_STUDENT_EMAIL/PASSWORD and
// PROD_TEST_TEACHER_EMAIL/PASSWORD so nothing is hardcoded here; set them locally
// when running manually. Times out against the dev stack, where these accounts
// don't exist. Must not run as part of the automated regression suite. Opt in
// explicitly with E2E_RUN_MANUAL=1 and PLAYWRIGHT_BASE_URL pointed at prod.
test.describe('Song Features: Requests & Song of the Week', () => {
  test('End-to-End Flow', async ({ browser }) => {
    test.skip(
      !process.env.E2E_RUN_MANUAL,
      'manual prod journey — opt in with E2E_RUN_MANUAL=1 against a prod PLAYWRIGHT_BASE_URL'
    );

    // -------------------------------------------------------------
    // 1. Student Requests a Song
    // -------------------------------------------------------------
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    await login(studentPage, {
      email: process.env.PROD_TEST_STUDENT_EMAIL!,
      password: process.env.PROD_TEST_STUDENT_PASSWORD!,
    });

    await studentPage.goto('/dashboard/songs');

    // The "Request a Song" button might be in the filters section
    await studentPage.click('text="Request a Song"');

    // Fill out the modal
    await studentPage.fill('input[name="title"]', 'E2E Test Song Request');
    await studentPage.fill('input[name="artist"]', 'Playwright Bot');
    await studentPage.fill('input[name="url"]', 'https://example.com/chords');
    await studentPage.fill('textarea[name="notes"]', 'Please add this song to the catalog!');

    // Submit
    await studentPage.click('button[type="submit"]:has-text("Submit Request")');

    // Wait for the modal to close and maybe see success or the button again
    await expect(studentPage.locator('text="Request a Song"')).toBeVisible();

    // -------------------------------------------------------------
    // 2. Teacher Approves the Request
    // -------------------------------------------------------------
    const teacherContext = await browser.newContext();
    const teacherPage = await teacherContext.newPage();
    await login(teacherPage, {
      email: process.env.PROD_TEST_TEACHER_EMAIL!,
      password: process.env.PROD_TEST_TEACHER_PASSWORD!,
    });

    await teacherPage.goto('/dashboard/songs/requests');

    // Should see the requested song
    await expect(teacherPage.locator('text="E2E Test Song Request"')).toBeVisible();

    // Approve the request (assuming an approve button in the dropdown or row)
    // The Row has a status cell and an actions dropdown.
    const row = teacherPage.locator('tr').filter({ hasText: 'E2E Test Song Request' });

    // Click Approve
    await row.locator('button:has-text("Approve")').click();

    // Wait for the button to disappear or the status to change
    await expect(row.locator('button:has-text("Approve")')).not.toBeVisible();

    // -------------------------------------------------------------
    // 3. Teacher Sets a Song of the Week
    // -------------------------------------------------------------
    // Go to the catalog and pick the first song
    await teacherPage.goto('/dashboard/songs');

    // Click on the first song link in the list
    await teacherPage.locator('a.ui-row').first().click();

    // Wait for the Song Detail page
    await teacherPage.waitForURL(/\/dashboard\/songs\/[a-f0-9-]{36}/);

    // Click "Set as Song of the Week"
    await teacherPage.click('text="Set as Song of the Week"');

    // Fill the modal
    await teacherPage.fill(
      'textarea[name="teacher_message"]',
      'This is a great song for practicing strumming patterns!'
    );
    await teacherPage.click('button[type="submit"]:has-text("Set Song")');

    // -------------------------------------------------------------
    // 4. Student sees Song of the Week and Adds to Repertoire
    // -------------------------------------------------------------
    await studentPage.goto('/dashboard');

    // Check if the banner is visible
    await expect(studentPage.locator('text="Song of the Week"')).toBeVisible();
    await expect(
      studentPage.locator('text="This is a great song for practicing strumming patterns!"')
    ).toBeVisible();

    // Click "Add to Repertoire"
    await studentPage.click('text="Add to Repertoire"');

    // Wait for the button to change to "Added to Repertoire!"
    await expect(studentPage.locator('text="Added to Repertoire!"')).toBeVisible();

    // Clean up
    await studentContext.close();
    await teacherContext.close();
  });
});
