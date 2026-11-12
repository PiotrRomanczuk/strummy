import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { adminClient, getStudentId, getTeacherId } from '../../helpers/seed-ids';

/**
 * Calendar → "Lessons held": the teacher answers for past lessons, and only the
 * teacher can. The answer is what the lesson-package balance will count, so the
 * spec checks the database, not just the row disappearing.
 */
const RUN = Date.now();
const TITLE = `E2E Attendance ${RUN}`;

const awaitingRow = (page: Page, lessonId: string) =>
  page
    .getByTestId('attendance-awaiting-row')
    .filter({ has: page.locator(`a[href$="${lessonId}"]`) });

test.describe('Lesson attendance', { tag: ['@teacher'] }, () => {
  test.describe.configure({ mode: 'serial' });
  const lessonIds: string[] = [];

  test.beforeAll(async () => {
    const db = adminClient();
    const [teacherId, studentId] = await Promise.all([getTeacherId(db), getStudentId(db)]);
    // Minutes ago, so the lesson is in the month on screen on any day but the
    // first minutes of the 1st.
    const startedAt = (minutesAgo: number) =>
      new Date(Date.now() - minutesAgo * 60_000).toISOString();
    const { data, error } = await db
      .from('lessons')
      .insert([
        {
          teacher_id: teacherId,
          student_id: studentId,
          title: `${TITLE} held`,
          scheduled_at: startedAt(10),
          status: 'SCHEDULED',
        },
        {
          teacher_id: teacherId,
          student_id: studentId,
          title: `${TITLE} not held`,
          scheduled_at: startedAt(5),
          status: 'SCHEDULED',
        },
      ])
      .select('id');
    if (error || !data) throw new Error(`seed failed: ${error?.message}`);
    lessonIds.push(...data.map((row) => row.id as string));
  });

  test.afterAll(async () => {
    const db = adminClient();
    for (const id of lessonIds) {
      await db.from('notification_log').delete().eq('entity_id', id);
      await db.from('in_app_notifications').delete().eq('entity_id', id);
      await db.from('lessons').delete().eq('id', id);
    }
  });

  test('teacher confirms a past lesson took place', async ({ page, loginAs }, testInfo) => {
    const [heldId] = lessonIds;
    await loginAs('teacher');
    await page.goto('/dashboard/calendar');

    const row = awaitingRow(page, heldId);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: testInfo.outputPath('01-awaiting.png'), fullPage: true });

    await row.getByTestId('attendance-held').click();
    await expect(row).toHaveCount(0, { timeout: 15_000 });
    await page.screenshot({ path: testInfo.outputPath('02-confirmed.png'), fullPage: true });

    const { data } = await adminClient().from('lessons').select('status').eq('id', heldId).single();
    expect(data?.status).toBe('COMPLETED');
  });

  test('teacher records that a lesson did not take place', async ({ page, loginAs }) => {
    const notHeldId = lessonIds[1];
    await loginAs('teacher');
    await page.goto('/dashboard/calendar');

    const row = awaitingRow(page, notHeldId);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByTestId('attendance-not-held').click();
    await expect(row).toHaveCount(0, { timeout: 15_000 });

    const { data } = await adminClient()
      .from('lessons')
      .select('status')
      .eq('id', notHeldId)
      .single();
    expect(data?.status).toBe('CANCELLED');
  });

  test('a student gets no attendance controls', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto('/dashboard/calendar');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('attendance-review')).toHaveCount(0);
  });
});
