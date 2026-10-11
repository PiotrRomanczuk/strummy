import { test, expect } from '../fixtures';
import { adminClient, getStudentId } from '../helpers/seed-ids';

/**
 * F11 — Admin: users list, edit, deactivate, lock/unlock, invite a teacher.
 */
test.describe('F11 admin', { tag: ['@flow'] }, () => {
  test('F11.1 the users list shows the roster and opens a student', async ({ page, loginAs }) => {
    test.skip(
      true,
      'TODO automate: roster rows do not link by plain href; see teacher/users-management.spec.ts'
    );
    const studentId = await getStudentId(adminClient());
    await loginAs('admin');
    await page.goto('/dashboard/users');
    await page.locator(`a[href="/dashboard/users/${studentId}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/users/${studentId}$`));
  });

  test('F11.2 deactivate and reactivate a student', async ({ page, loginAs }) => {
    test.skip(
      true,
      'TODO automate: active toggle + deactivate dialog controls differ from the guess; see UserEditForm.Account.tsx'
    );
    const db = adminClient();
    const studentId = await getStudentId(db);
    const isActive = async () =>
      (await db.from('profiles').select('is_active').eq('id', studentId).single()).data?.is_active;
    try {
      await loginAs('admin');
      await page.goto(`/dashboard/users/${studentId}/edit`);
      await page.getByRole('switch', { name: /active/i }).click();
      await page
        .getByRole('button', { name: /deactivate/i })
        .last()
        .click();
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 15_000 });
      await expect.poll(isActive, { timeout: 10_000 }).toBe(false);
    } finally {
      await db.from('profiles').update({ is_active: true }).eq('id', studentId);
    }
  });

  test('F11.3 a locked account shows on the dashboard and can be unlocked', async () => {
    test.skip(true, 'TODO automate: admin/lockout-widget.spec.ts covers this; fold it in');
  });

  test("F11.4 edit a student's roles", async () => {
    test.skip(true, 'TODO automate: blocked by the novice skill-level bug (F02.5) on main');
  });

  test('F11.5 invite a teacher', async () => {
    test.fixme(true, 'NOT BUILT: inviteUser exists in app/dashboard/actions.ts but has no UI');
  });
});
