import { test, expect } from '../../fixtures';
import { adminClient, getStudentId, getTeacherId } from '../../helpers/seed-ids';

/**
 * Student Assignments Interaction E2E Tests
 *
 * Verifies that students can browse assignments, view details, and move their
 * own work forward (not_started -> in_progress -> completed) but never cancel,
 * edit or delete it. Status buttons are addressed by
 * `assignment-status-<target>` testids.
 * Students cannot create, edit content, or delete assignments.
 *
 * An assignment in `not_started` status is seeded via the admin client in
 * beforeAll so every test runs against guaranteed data regardless of DB state.
 */

// Resolved at runtime from the configured test-account emails (see beforeAll).
let STUDENT_ID = '';
let TEACHER_ID = '';

let seededAssignmentId: string | null = null;

test.describe(
  'Student Assignments (Read + Status Update)',
  { tag: ['@student', '@assignments'] },
  () => {
    // One seeded row whose status the lifecycle test advances; parallel workers
    // would each re-seed (deleting the other's row by title).
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async () => {
      const db = adminClient();
      STUDENT_ID = await getStudentId(db);
      TEACHER_ID = await getTeacherId(db);

      // Remove any leftover E2E assignments from previous runs
      await db
        .from('assignments')
        .delete()
        .eq('student_id', STUDENT_ID)
        .eq('title', 'E2E Interact Assignment');

      const { data: assignment } = await db
        .from('assignments')
        .insert({
          teacher_id: TEACHER_ID,
          student_id: STUDENT_ID,
          title: 'E2E Interact Assignment',
          status: 'not_started',
          due_date: '2026-12-31T00:00:00Z',
        })
        .select('id')
        .single();
      seededAssignmentId = assignment?.id ?? null;
    });

    test.afterAll(async () => {
      const db = adminClient();
      if (seededAssignmentId) await db.from('assignments').delete().eq('id', seededAssignmentId);
    });

    test.beforeEach(async ({ page, loginAs }) => {
      await loginAs('student');
      await page.evaluate(() => localStorage.setItem('strummy-demo-welcome-seen', 'true'));
    });

    test('assignments list loads with no Create button @mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/dashboard/assignments');
      await page.waitForLoadState('networkidle');

      // Verify the assignments page loads (heading).
      await expect(page.getByRole('heading', { name: /assignments/i }).first()).toBeVisible({
        timeout: 15_000,
      });

      // Wait for page content to settle
      await page.waitForTimeout(2000);

      // Verify NO create/new assignment controls are visible
      const createControls = page.locator(
        '[data-testid="create-assignment-button"], button:has-text("Create Assignment"), a:has-text("Create Assignment"), a:has-text("New Assignment"), a[href*="/assignments/new"], button[aria-label="Add new assignment"], [data-testid="new-assignment-button"]'
      );
      await expect(createControls).toHaveCount(0);
    });

    test('view assignment detail @mobile', async ({ page }) => {
      test.skip(!seededAssignmentId, 'Assignment failed to seed');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/dashboard/assignments');
      await page.waitForLoadState('networkidle');

      // Open the SEEDED row, never "the first one": on a shared stack the first
      // row can be a real assignment.
      const seededRow = page.locator(`a[href*="selected=${seededAssignmentId}"]`).first();
      await expect(seededRow).toBeVisible({ timeout: 15_000 });
      await seededRow.click();
      await page.waitForURL(/selected=/, { timeout: 10_000 });
      await page.getByRole('link', { name: 'Open full page' }).click();
      await page.waitForURL(new RegExp(`/dashboard/assignments/${seededAssignmentId}`), {
        timeout: 20_000,
      });

      await expect(page.getByText('E2E Interact Assignment').first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('assignment-status-in_progress')).toBeVisible();
    });

    test('status lifecycle: start working, then mark complete @mobile', async ({ page }) => {
      test.skip(!seededAssignmentId, 'Assignment failed to seed');
      const db = adminClient();
      const statusInDb = async () =>
        (await db.from('assignments').select('status').eq('id', seededAssignmentId!).single()).data
          ?.status;

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/dashboard/assignments/${seededAssignmentId}`);
      await page.waitForLoadState('networkidle');

      // A student can only move work forward — never cancel it.
      await expect(page.getByTestId('assignment-status-in_progress')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('assignment-status-cancelled')).toHaveCount(0);

      await page.getByTestId('assignment-status-in_progress').click();
      await expect(page.getByTestId('assignment-status-completed')).toBeVisible({
        timeout: 15_000,
      });
      await expect.poll(statusInDb, { timeout: 10_000 }).toBe('in_progress');

      await page.getByTestId('assignment-status-completed').click();
      await expect(page.getByText('No further actions')).toBeVisible({ timeout: 15_000 });
      await expect.poll(statusInDb, { timeout: 10_000 }).toBe('completed');

      // Persisted, not just optimistic.
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('No further actions')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('assignment-status-in_progress')).toHaveCount(0);
    });

    test('no edit or delete control for assignment content @mobile', async ({ page }) => {
      test.skip(!seededAssignmentId, 'Assignment failed to seed');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/dashboard/assignments/${seededAssignmentId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('E2E Interact Assignment').first()).toBeVisible({
        timeout: 20_000,
      });

      await expect(
        page.locator('[data-testid="assignment-edit-button"], a[href*="/edit"]')
      ).toHaveCount(0);
      // Role + name, so an icon-only button with an aria-label is caught too.
      await expect(page.getByRole('button', { name: /edit|delete/i })).toHaveCount(0);
    });
  }
);

/**
 * Student Checklist Toggle
 *
 * A student ticking a checklist item on their own assignment: optimistic tick,
 * live progress %, and persistence across a reload. Ticking routes through the
 * `student_toggle_checklist_item` SECURITY DEFINER RPC (ADR-0001 — students
 * never UPDATE the table directly).
 */
test.describe('Student Checklist Toggle', { tag: ['@student', '@assignments'] }, () => {
  const ITEM_ONE = 'E2E checklist step one';
  const ITEM_TWO = 'E2E checklist step two';
  let checklistAssignmentId: string | null = null;

  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);
    TEACHER_ID = await getTeacherId(db);

    await db
      .from('assignments')
      .delete()
      .eq('student_id', STUDENT_ID)
      .eq('title', 'E2E Checklist Assignment');

    const { data } = await db
      .from('assignments')
      .insert({
        teacher_id: TEACHER_ID,
        student_id: STUDENT_ID,
        title: 'E2E Checklist Assignment',
        status: 'in_progress',
        due_date: '2026-12-31T00:00:00Z',
        checklist: [
          { id: 'e2e-item-1', text: ITEM_ONE, done: false },
          { id: 'e2e-item-2', text: ITEM_TWO, done: false },
        ],
      })
      .select('id')
      .single();
    checklistAssignmentId = data?.id ?? null;
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (checklistAssignmentId)
      await db.from('assignments').delete().eq('id', checklistAssignmentId);
  });

  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('student');
    await page.evaluate(() => localStorage.setItem('strummy-demo-welcome-seen', 'true'));
  });

  test('ticks an item, updates progress %, and persists across reload', async ({ page }) => {
    test.skip(!checklistAssignmentId, 'Checklist assignment failed to seed');

    await page.goto(`/dashboard/assignments/${checklistAssignmentId}`);
    await page.waitForLoadState('networkidle');

    // Detail is a client-side fetch — wait for the checklist to render.
    const firstItem = page.getByText(ITEM_ONE, { exact: true });
    await expect(firstItem).toBeVisible({ timeout: 20_000 });

    // Both items start unticked → 0 / 2 done.
    await expect(page.getByText(/\b0\s*\/\s*2\s+done\b/)).toBeVisible();
    const firstCheckbox = page.locator('label', { hasText: ITEM_ONE }).getByRole('checkbox');
    await expect(firstCheckbox).not.toBeChecked();

    // Tap the row (the whole label is the target) to tick it. Wait for the
    // checkbox to be interactive first: the detail hydrates client-side, and
    // under full-suite load a click can land before the handler is attached —
    // the tick then silently no-ops. Passes 3/3 in isolation, so the failure
    // was purely that window widening.
    await expect(firstCheckbox).toBeEnabled({ timeout: 10_000 });

    // Click-until-it-sticks — but verify via the React-owned progress text,
    // not the checkbox: a pre-hydration click flips the NATIVE checkbox
    // without running the save handler, so isChecked() can report success
    // while nothing persisted.
    const progressTick = page.getByText(/\b1\s*\/\s*2\s+done\b/).first();
    // The toggle persists via a server action (a POST back to this route);
    // capture its round-trip so the reload below can't race the save.
    const saveRoundTrip = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes('/dashboard/assignments/'),
      { timeout: 30_000 }
    );
    await expect(async () => {
      if (!(await progressTick.isVisible().catch(() => false))) {
        await firstItem.click();
      }
      await expect(progressTick).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 25_000 });

    // Optimistic: progress climbs to 1 / 2 · 50%.
    await expect(page.getByText(/\b1\s*\/\s*2\s+done\b/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/50%/)).toBeVisible();

    // The tick is optimistic-with-rollback: require the action's POST to have
    // completed OK and the progress to survive it — reloading mid-flight used
    // to race the save and read the pre-tick column.
    const saveResponse = await saveRoundTrip;
    expect(saveResponse.ok(), 'checklist save action must return OK').toBe(true);
    await expect(progressTick).toBeVisible({ timeout: 10_000 });

    // Persisted: a fresh load reads the RPC-updated checklist column.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(ITEM_ONE, { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('label', { hasText: ITEM_ONE }).getByRole('checkbox')).toBeChecked();
    await expect(page.getByText(/\b1\s*\/\s*2\s+done\b/)).toBeVisible();
  });
});
