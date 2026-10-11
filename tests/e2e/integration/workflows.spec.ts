/**
 * Integration Workflows E2E Tests
 *
 * Migrated from: cypress/e2e/integration/workflows.cy.ts
 *
 * Tests complete end-to-end workflows spanning multiple features:
 * 1. Full Lesson Flow - Admin creates lesson → adds songs → assigns to student → student views → cleanup
 * 2. Assignment Flow - Admin creates → student sees → student completes → cleanup
 * 3. Song Progress Flow - Admin creates song → verifies in list → cleanup
 * 4. Cross-Role Data Visibility - Verify admin vs student access permissions
 *
 * Removed 2026-10-11 (functional-coverage audit): the shadow-user flow (always
 * skipped; covered by teacher/student-intake), "consistent navigation" and the
 * Multi-Entity block — all three looked for a `table` / "Lesson Songs" UI that
 * no longer exists, so they passed without exercising anything.
 *
 * These tests verify that:
 * - Complete workflows function end-to-end
 * - Data flows correctly between features
 * - Role-based access is respected
 * - Multi-step operations maintain consistency
 * - Cleanup operations work properly
 *
 * Prerequisites:
 * - Local Supabase database running with seeded data
 * - Admin and student accounts configured
 * - Database allows CRUD operations
 *
 * @tags @integration @workflows @cross-feature
 */
import { test, expect } from '../../fixtures';
import { openAssignmentExtras, sendAssignmentButton } from '../../helpers/assignment-form';
import { waitForSongsList } from '../../helpers/songs-list';
import { pickLessonStudentById, setLessonWhen } from '../../helpers/lesson-form';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

// These are stateful journeys that create, read back and delete shared rows,
// and they share one module-level `timestamp` for their fixture names. Run in
// order: in parallel they pass individually but interfere in-file, with the
// song lookup finding nothing because a sibling had already swept it.
test.describe.configure({ mode: 'serial' });

test.describe(
  'Integration Workflows',
  { tag: ['@integration', '@workflows', '@cross-feature'] },
  () => {
    const timestamp = Date.now();

    test.describe('Full Lesson Workflow', () => {
      const lessonData = {
        title: `Integration Lesson ${timestamp}`,
        notes: 'Integration test lesson notes',
      };

      test('admin schedules a lesson for the E2E student, who then sees it', async ({
        page,
        loginAs,
      }) => {
        // Full CRUD with UI delete is covered by teacher/lessons-crud.spec.ts.
        // This one is cross-role: what the admin writes, the student can read.
        // Two sign-ins plus a create and two reads: beyond the 30s default.
        test.setTimeout(90_000);
        await page.setViewportSize({ width: 1440, height: 900 });
        const db = adminClient();
        const studentId = await getStudentId(db);
        let lessonId: string | undefined;

        try {
          await loginAs('admin');
          await page.goto('/dashboard/lessons/new');
          await expect(page.locator('#lesson-title')).toBeVisible({ timeout: 15_000 });
          // The E2E student, never "the first pill": on a shared stack that
          // can be a real student, who would get the lesson and its emails.
          await pickLessonStudentById(page, studentId);
          await page.locator('#lesson-title').fill(lessonData.title);
          // Far future: the list is newest-first, 60/page.
          await setLessonWhen(page, '2030-01-15T10:00');
          await page.getByRole('button', { name: 'Schedule lesson' }).click();

          await page.waitForURL(/\/dashboard\/lessons\/[0-9a-f-]{36}$/, { timeout: 20_000 });
          lessonId = page.url().split('/').pop();

          await page.goto('/dashboard/lessons');
          await expect(
            page.getByText(lessonData.title).filter({ visible: true }).first()
          ).toBeVisible({ timeout: 10_000 });

          await loginAs('student');
          await page.goto('/dashboard/lessons?year=2030');
          await expect(
            page.getByText(lessonData.title).filter({ visible: true }).first()
          ).toBeVisible({ timeout: 15_000 });
        } finally {
          // Prod config disables global teardown, so clean up by id here.
          if (lessonId) await db.from('lessons').delete().eq('id', lessonId);
        }
      });
    });

    test.describe('Assignment Workflow', () => {
      const assignmentData = {
        title: `Integration Assignment ${timestamp}`,
        description: 'Integration test assignment description',
      };

      test('admin sends an assignment to the E2E student, who then sees it', async ({
        page,
        loginAs,
      }) => {
        // Two sign-ins plus a create and two reads: beyond the 30s default.
        test.setTimeout(90_000);
        await page.setViewportSize({ width: 1440, height: 900 });
        const db = adminClient();
        const studentId = await getStudentId(db);
        let assignmentId: string | undefined;

        try {
          await loginAs('admin');
          await page.goto('/dashboard/assignments/new');
          await page
            .locator(`[data-testid="student-pill"][data-student-id="${studentId}"]`)
            .click();
          await openAssignmentExtras(page);
          await page.locator('#assignment-title').fill(assignmentData.title);
          await page.locator('#assignment-notes').fill(assignmentData.description);
          await sendAssignmentButton(page).click();

          await page.waitForURL(/\/dashboard\/assignments\/[0-9a-f-]{36}$/, {
            timeout: 20_000,
          });
          assignmentId = page.url().split('/').pop();

          await loginAs('student');
          await page.goto('/dashboard/assignments');
          await expect(
            page.getByText(assignmentData.title).filter({ visible: true }).first()
          ).toBeVisible({ timeout: 15_000 });
        } finally {
          if (assignmentId) await db.from('assignments').delete().eq('id', assignmentId);
        }
      });
    });

    test.describe('Song Creation and Student View Workflow', () => {
      const songData = {
        title: `Integration Song ${timestamp}`,
        author: 'Test Artist',
      };

      test('should complete song lifecycle: create → verify → delete', async ({
        page,
        loginAs,
      }) => {
        await page.setViewportSize({ width: 1440, height: 900 });

        // STEP 1: Admin creates a new song
        await loginAs('admin');
        await page.goto('/dashboard/songs/new');
        await page.waitForLoadState('networkidle');

        // Wait for form - look for title input
        await page
          .locator('input[name="title"], [data-testid*="title"]')
          .first()
          .waitFor({ state: 'visible', timeout: 10000 });

        // Fill in song details
        await page
          .locator('input[name="title"], [data-testid*="title"]')
          .first()
          .fill(songData.title);
        await page
          .locator('input[name="author"], [data-testid*="author"]')
          .first()
          .fill(songData.author);

        // Submit
        await page.getByTestId('song-save').click();

        // Wait for the DETAIL url specifically. `toHaveURL(/\/dashboard\/songs/)`
        // matched instantly — /dashboard/songs/new contains that path too — so
        // the test raced ahead of the redirect and read an id of "new"/"songs".
        await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
        const songId = page.url().split('/').pop() ?? '';
        expect(songId, 'redirect should land on the new song detail page').toMatch(
          /^[0-9a-f-]{36}$/
        );

        // STEP 2: Admin verifies song in the list
        await page.goto('/dashboard/songs');
        await waitForSongsList(page);
        await expect(
          page.locator(`text=${songData.title}`).filter({ visible: true }).first()
        ).toBeVisible({
          timeout: 10000,
        });

        // STEP 3: Cleanup via API (song detail has no delete button).

        const deleteResp = await page.request.delete(`/api/song?id=${songId}`);
        expect(deleteResp.status()).toBeLessThan(400);
      });
    });

    test.describe('Cross-Role Data Visibility', () => {
      test('should verify admin has access to all sections', async ({ page, loginAs }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await loginAs('admin');

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Admin should have access to all sections (use first nav to avoid strict mode)
        const navigation = page.locator('nav, [role="navigation"]').first();

        await expect(navigation.locator('a[href*="/users"]')).toBeVisible();
        await expect(navigation.locator('a[href="/dashboard/lessons"]')).toBeVisible();
        await expect(navigation.locator('a[href="/dashboard/songs"]')).toBeVisible();
        await expect(navigation.locator('a[href="/dashboard/assignments"]')).toBeVisible();
      });

      test('should verify student has limited navigation options', async ({ page, loginAs }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await loginAs('student');

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Scope to the first nav, exactly as the admin test above does. The
        // sidebar renders a desktop and a mobile copy, so an unscoped locator
        // matches each link twice and trips strict mode.
        const navigation = page.locator('nav, [role="navigation"]').first();

        // Student should NOT see users link
        await expect(navigation.locator('a[href="/dashboard/users"]')).toHaveCount(0);

        // But should see other links (exact href to avoid strict mode with song detail links)
        await expect(navigation.locator('a[href="/dashboard/lessons"]')).toBeVisible();
        await expect(navigation.locator('a[href="/dashboard/songs"]')).toBeVisible();
        await expect(navigation.locator('a[href="/dashboard/assignments"]')).toBeVisible();
      });

      test('should verify role-based filtering in lessons', async ({ page, loginAs }) => {
        await page.setViewportSize({ width: 1440, height: 900 });

        // Admin should see student filter
        await loginAs('admin');
        await page.goto('/dashboard/lessons');
        await page.waitForLoadState('networkidle');

        // Admin/teacher lessons list shows "Teaching" as section header (showStudentColumn=true)
        // Student view shows "Your lessons" as section header instead
        const teachingHeader = page.locator('text=/^Teaching$/').first();
        const hasTeachingHeader = (await teachingHeader.count()) > 0;

        // Student should NOT see "Teaching" section header — only "Your lessons"
        await loginAs('student');
        await page.goto('/dashboard/lessons');
        await page.waitForLoadState('networkidle');

        const teachingHeaderAsStudent = page.locator('text=/^Teaching$/').first();
        const hasTeachingHeaderAsStudent = (await teachingHeaderAsStudent.count()) > 0;

        // Verify admin sees "Teaching" header but students see "Your lessons" instead
        expect(hasTeachingHeader).toBeTruthy();
        expect(hasTeachingHeaderAsStudent).toBeFalsy();
      });

      test('should verify data isolation between roles', async ({ page, loginAs }) => {
        await page.setViewportSize({ width: 1440, height: 900 });

        // Student tries to access admin-only users page
        await loginAs('student');
        await page.goto('/dashboard/users');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // The roster is staff-only: a student is redirected off it.
        await expect(page).not.toHaveURL(/\/dashboard\/users$/);
      });
    });
  }
);
