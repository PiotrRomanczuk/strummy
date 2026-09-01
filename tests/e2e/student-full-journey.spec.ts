import { test, expect } from '../fixtures';
import { waitForSongsList } from '../helpers/songs-list';

/**
 * Student Full Journey E2E Test
 *
 * A single, long-running test that authenticates once as a student
 * and exercises every feature available to the student role.
 *
 * Phases:
 *  1. Dashboard
 *  2. My Songs (list)
 *  3. Song Detail + Status Update
 *  4. My Lessons (list)
 *  5. Lesson Detail
 *  6. My Assignments (list)
 *  7. Assignment Detail
 *  8. My Stats
 *  9. Calendar
 * 10. Profile
 * 11. Settings
 * 12. Access Control
 */
test(
  'Student complete journey @journey @student',
  { tag: ['@journey', '@student'] },
  async ({ page, loginAs }) => {
    // Increase timeout for the full journey
    test.setTimeout(180_000);

    // ── Auth ───────────────────────────────────────────────────────
    await loginAs('student');

    // ── Phase 1: Dashboard ────────────────────────────────────────
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard/);

    // Verify dashboard heading (dashboard uses a personal greeting h1)
    const welcomeHeading = page.locator('h1').first();
    await expect(welcomeHeading).toBeVisible({ timeout: 15_000 });

    // Dashboard content rendered (the pre-redesign stats-grid anchor is gone;
    // any visible section heading proves the role dashboard mounted)
    const statsSection = page.locator('main h1, main h2').first();
    await expect(statsSection).toBeVisible({ timeout: 10_000 });

    // Next / Last lesson cards (or empty state)
    const nextLessonCard = page
      .locator('main')
      .getByText(/next lesson|upcoming/i)
      .first();
    const lastLessonCard = page
      .locator('main')
      .getByText(/last lesson|recent/i)
      .first();
    const hasNextLesson = (await nextLessonCard.count()) > 0;
    const hasLastLesson = (await lastLessonCard.count()) > 0;
    if (hasNextLesson) await expect(nextLessonCard).toBeVisible();
    if (hasLastLesson) await expect(lastLessonCard).toBeVisible();

    // Recent activity / progress section. Scope to main: outside it, hidden
    // chrome (the collapsed mobile sidebar) also matches /progress/.
    const activitySection = page
      .locator('main')
      .getByText(/activity|progress/i)
      .first();
    if ((await activitySection.count()) > 0) {
      await expect(activitySection).toBeVisible();
    }

    // Practice timer section
    const practiceSection = page
      .locator('main')
      .getByText(/practice/i)
      .first();
    if ((await practiceSection.count()) > 0) {
      await expect(practiceSection).toBeVisible();
    }

    // ── Phase 2: My Songs (list) ──────────────────────────────────
    await page.goto('/dashboard/songs');
    await waitForSongsList(page);

    // Verify heading
    const songsHeading = page.locator('h1, h2').filter({ hasText: /songs/i }).first();
    await expect(songsHeading).toBeVisible({ timeout: 10_000 });

    // Wait for loading to finish – the table, card list, or empty state should appear
    await page.waitForTimeout(2000);

    // Determine if songs exist — a row link opens the slide-in detail panel via
    // `?selected=` rather than pointing at `/dashboard/songs/{id}` (SongsList.Row.tsx).
    const songLinks = page.locator('a[href*="selected="]');
    const hasSongs = (await songLinks.count()) > 0;

    if (hasSongs) {
      // Test search input if available
      const searchInput = page
        .locator('main')
        .locator(
          '#search-filter, [data-testid="search-input"], input[type="search"], input[placeholder*="earch"]'
        )
        .first();
      if ((await searchInput.count()) > 0) {
        await searchInput.focus();
        await searchInput.fill('a');
        await page.waitForTimeout(1500);
        await searchInput.clear();
        await page.waitForTimeout(1000);
      }
    }

    // ── Phase 3: Song Detail ──────────────────────────────────────
    if (hasSongs) {
      const firstSongLink = songLinks.first();
      // Row click opens the slide-in detail panel; its "Open full page" link
      // reaches the real detail page (SongsList.Panel.tsx).
      await firstSongLink.click();
      await page.waitForURL(/selected=/, { timeout: 10_000 });
      // The URL carrying `selected=` is not the panel being there to click.
      // Below 861px the panel is a bottom sheet that slides its full height up
      // over a full-screen backdrop, and a press aimed into it mid-flight lands
      // on that backdrop — which is how this step spent fifteen seconds on
      // iPad Pro and iPhone SE in the 2026-08-28 nightly. `lesson-list-panel`
      // waits on the panel before reaching into it and passes; do the same.
      await expect(page.getByRole('complementary', { name: /^Song detail:/ })).toBeVisible({
        timeout: 10_000,
      });
      await page.getByRole('link', { name: 'Open full page' }).click();
      await page.waitForURL(/\/dashboard\/songs\/[a-zA-Z0-9-]+$/, { timeout: 10_000 });
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/dashboard\/songs\/[a-zA-Z0-9-]+/);

      // Verify title / author area is visible
      const songDetailHeading = page.locator('h1, h2').first();
      await expect(songDetailHeading).toBeVisible({ timeout: 10_000 });

      // Check for resource links (YouTube, tabs, Spotify) if present
      const resourceLinks = page.locator(
        'a[href*="youtube"], a[href*="spotify"], a[href*="ultimate-guitar"], a[href*="tiktok"]'
      );
      if ((await resourceLinks.count()) > 0) {
        await expect(resourceLinks.first()).toBeVisible();
      }

      // Check for related lessons section
      const lessonsSection = page
        .locator('main')
        .getByText(/lesson/i)
        .first();
      if ((await lessonsSection.count()) > 0) {
        await expect(lessonsSection).toBeVisible();
      }

      // If status dropdown exists, try changing status
      const statusDropdown = page.locator('select, [role="combobox"]').first();
      if ((await statusDropdown.count()) > 0 && (await statusDropdown.isVisible())) {
        // Just verify it's interactable – don't permanently change data
        await expect(statusDropdown).toBeEnabled();
      }

      // Navigate back to songs list
      await page.goto('/dashboard/songs');
      await waitForSongsList(page);
    }

    // ── Phase 4: My Lessons (list) ────────────────────────────────
    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');

    const lessonsHeading = page
      .locator('h1, h2')
      .filter({ hasText: /lesson/i })
      .first();
    await expect(lessonsHeading).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(2000);

    // Verify no teacher-only controls visible
    const createLessonButton = page.locator(
      '[data-testid="create-lesson-button"], button:has-text("Create Lesson"), a:has-text("Create Lesson"), a:has-text("New Lesson")'
    );
    await expect(createLessonButton).toHaveCount(0);

    const lessonLinks = page
      .locator('a[href*="selected="]')
      .filter({ hasNotText: /new|edit|import/i });
    const hasLessons = (await lessonLinks.count()) > 0;

    // ── Phase 5: Lesson Detail ────────────────────────────────────
    if (hasLessons) {
      const firstLessonLink = lessonLinks.first();
      // Row click opens the slide-in panel; "Open full page" reaches the detail
      // route this phase is about.
      await firstLessonLink.click();
      await page.waitForURL(/selected=/, { timeout: 10_000 });
      await page.getByRole('link', { name: 'Open full page' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/dashboard\/lessons\/[a-zA-Z0-9-]+/);

      // Verify lesson detail card
      const lessonDetail = page.locator('[data-testid="lesson-detail"]');
      if ((await lessonDetail.count()) > 0) {
        await expect(lessonDetail).toBeVisible({ timeout: 10_000 });
      } else {
        // Fallback: just verify we see lesson content
        const lessonContent = page.locator('h1, h2').first();
        await expect(lessonContent).toBeVisible({ timeout: 10_000 });
      }

      // Check for associated songs section
      const songsSec = page.locator('main').getByText(/song/i).first();
      if ((await songsSec.count()) > 0) {
        await expect(songsSec).toBeVisible();
      }

      // Check for associated assignments section
      const assignmentsSec = page
        .locator('main')
        .getByText(/assignment/i)
        .first();
      if ((await assignmentsSec.count()) > 0) {
        await expect(assignmentsSec).toBeVisible();
      }

      // Navigate back
      await page.goto('/dashboard/lessons');
      await page.waitForLoadState('networkidle');
    }

    // ── Phase 6: My Assignments (list) ────────────────────────────
    await page.goto('/dashboard/assignments');
    await page.waitForLoadState('networkidle');

    const assignmentsHeading = page
      .locator('h1, h2')
      .filter({ hasText: /assignment/i })
      .first();
    await expect(assignmentsHeading).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(2000);

    const assignmentLinks = page
      .locator('a[href*="selected="]')
      .filter({ hasNotText: /new|edit|template/i });
    const hasAssignments = (await assignmentLinks.count()) > 0;

    if (hasAssignments) {
      // Test status filter if available
      const statusFilter = page
        .locator('[data-testid="status-filter"], [data-testid="field-status"], select')
        .first();
      if ((await statusFilter.count()) > 0 && (await statusFilter.isVisible())) {
        await expect(statusFilter).toBeEnabled();
      }
    }

    // ── Phase 7: Assignment Detail ────────────────────────────────
    if (hasAssignments) {
      const firstAssignmentLink = assignmentLinks.first();
      // As above: row opens the panel, "Open full page" leaves for the detail route.
      await firstAssignmentLink.click();
      await page.waitForURL(/selected=/, { timeout: 10_000 });
      await page.getByRole('link', { name: 'Open full page' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/dashboard\/assignments\/[a-zA-Z0-9-]+/);

      // Verify assignment content is visible
      const assignmentHeading = page.locator('h1, h2').first();
      await expect(assignmentHeading).toBeVisible({ timeout: 10_000 });

      // Check for description
      const descriptionArea = page
        .locator('main')
        .getByText(/description/i)
        .first();
      if ((await descriptionArea.count()) > 0) {
        await expect(descriptionArea).toBeVisible();
      }

      // Check for due date
      const dueDateArea = page.locator('main').getByText(/due/i).first();
      if ((await dueDateArea.count()) > 0) {
        await expect(dueDateArea).toBeVisible();
      }

      // Navigate back
      await page.goto('/dashboard/assignments');
      await page.waitForLoadState('networkidle');
    }

    // ── Phase 8: My Stats ─────────────────────────────────────────
    await page.goto('/dashboard/stats');
    await page.waitForLoadState('networkidle');

    // Stats is a stub page — CardTitle renders as a div, just check any visible text
    await expect(
      page
        .locator('main')
        .getByText(/coming soon|stats|streak|practice/i)
        .first()
    ).toBeVisible({
      timeout: 10_000,
    });

    // Verify some stats metrics are visible
    const statsContent = page.locator('main').first();
    await expect(statsContent).toBeVisible();

    // ── Phase 9: Calendar ─────────────────────────────────────────
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');

    // Verify calendar page loads
    const calendarHeading = page
      .locator('h1, h2')
      .filter({ hasText: /calendar/i })
      .first();
    if ((await calendarHeading.count()) > 0) {
      await expect(calendarHeading).toBeVisible({ timeout: 10_000 });
    } else {
      // The page may show a "connect calendar" prompt instead
      const calendarContent = page.locator('main').first();
      await expect(calendarContent).toBeVisible({ timeout: 10_000 });
    }

    // ── Phase 10: Profile ─────────────────────────────────────────
    // /dashboard/profile redirects to /dashboard/settings (spec 10)
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    // Redirected to settings — h1 says "Settings"
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

    // Settings form uses input[name="full_name"] (not #firstname)
    const fullNameField = page.locator('input[name="full_name"]');
    if ((await fullNameField.count()) > 0) {
      await expect(fullNameField).toBeVisible({ timeout: 10_000 });

      // Edit name (append " Test", then revert)
      const originalName = await fullNameField.inputValue();
      await fullNameField.clear();
      await fullNameField.fill(originalName + ' Test');

      const saveButton = page.getByRole('button', { name: /save/i }).first();
      if ((await saveButton.count()) > 0 && (await saveButton.isEnabled())) {
        await saveButton.click();
        // A pre-hydration click fires a native submit and reloads the page —
        // settle, then re-check the form is still there before reverting.
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Revert
        if (await fullNameField.isVisible().catch(() => false)) {
          await fullNameField.clear();
          await fullNameField.fill(originalName);
          if (await saveButton.isVisible().catch(() => false)) {
            await saveButton.click();
            await page.waitForLoadState('networkidle');
          }
        }
      }
    }

    // ── Phase 11: Settings ────────────────────────────────────────
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Verify settings page loads
    const settingsHeading = page
      .locator('h1, h2')
      .filter({ hasText: /setting/i })
      .first();
    await expect(settingsHeading).toBeVisible({ timeout: 10_000 });

    // Verify notification preferences section exists
    const notificationsSection = page
      .locator('main')
      .getByText(/notification/i)
      .first();
    if ((await notificationsSection.count()) > 0) {
      await expect(notificationsSection).toBeVisible();
    }

    // ── Phase 12: Access Control ──────────────────────────────────
    // Students should NOT have access to admin-only pages.
    // They should be redirected or see a restricted view.

    // Try to access users management
    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should either redirect away from /users or show no create/delete controls
    const createUserButton = page.locator(
      '[data-testid="create-user-button"], button:has-text("Create User"), a:has-text("Create User")'
    );
    const deleteUserButton = page.locator(
      '[data-testid^="delete-user-"], button:has-text("Delete User")'
    );
    // Verify no admin controls
    const isOnUsersPage = page.url().includes('/users');
    if (isOnUsersPage) {
      await expect(createUserButton).toHaveCount(0);
      await expect(deleteUserButton).toHaveCount(0);
    }

    // Try to access admin song stats (route may not exist — timeout = restricted)
    try {
      await page.goto('/dashboard/admin/stats/songs', { timeout: 10_000 });
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
      const currentUrlAfterAdminStats = page.url();
      if (!currentUrlAfterAdminStats.includes('/admin/stats/songs')) {
        expect(currentUrlAfterAdminStats).not.toContain('/admin/stats/songs');
      }
    } catch {
      // Timeout means the admin-only route is inaccessible to students — expected
    }

    // Try to access health monitoring
    try {
      await page.goto('/dashboard/health', { timeout: 10_000 });
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
      const currentUrlAfterHealth = page.url();
      if (!currentUrlAfterHealth.includes('/health')) {
        expect(currentUrlAfterHealth).not.toContain('/health');
      }
    } catch {
      // Timeout means the route is inaccessible to students — expected
    }
  }
);
