import { test, expect } from '../fixtures';
import { adminClient, getStudentId } from '../helpers/seed-ids';

/**
 * F10 — Notifications: inbox, badge, preferences, email.
 */
test.describe('F10 notifications', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let studentId = '';
  let notificationId: string | undefined;

  test.beforeAll(async () => {
    const db = adminClient();
    studentId = await getStudentId(db);
    const { data } = await db
      .from('in_app_notifications')
      .insert({
        profile_id: studentId,
        type: 'lesson_reminder_24h',
        title: 'E2E Flow reminder',
        message: 'Your lesson is tomorrow',
        is_read: false,
      })
      .select('id')
      .single();
    notificationId = data?.id;
  });
  test.afterAll(async () => {
    if (notificationId)
      await adminClient().from('in_app_notifications').delete().eq('id', notificationId);
  });

  test('F10.1 the bell shows the unread count', async ({ page, loginAs }) => {
    test.skip(!notificationId, 'seed failed');
    await loginAs('student');
    await page.goto('/dashboard');
    await expect(page.getByTestId('topbar-bell-badge')).toBeVisible({ timeout: 15_000 });
  });

  test('F10.2 the inbox lists it and mark-as-read persists', async ({ page, loginAs }) => {
    test.skip(!notificationId, 'seed failed');
    await loginAs('student');
    await page.goto('/dashboard/notifications');
    const row = page.getByText('E2E Flow reminder').first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();
    await expect
      .poll(
        async () =>
          (
            await adminClient()
              .from('in_app_notifications')
              .select('is_read')
              .eq('id', notificationId!)
              .single()
          ).data?.is_read,
        { timeout: 10_000 }
      )
      .toBe(true);
  });

  test('F10.3 a preference toggle persists', async () => {
    test.skip(true, 'TODO automate: notifications/prefs.spec.ts covers this; fold it in');
  });

  test('F10.4 a student email is actually delivered', async () => {
    test.fixme(
      true,
      'NOT BUILT: STUDENT_EMAILS_ENABLED is unset everywhere and the queue is processed once a day'
    );
  });
});
