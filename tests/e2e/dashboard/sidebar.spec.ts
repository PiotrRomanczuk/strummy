import { expect, test } from '@playwright/test';

import {
  HOME_ITEM,
  NOTIFICATIONS_ITEM,
  SETTINGS_ITEM,
  getSidebarGroups,
  type RoleFlags,
} from '../../../components/dashboard/sidebar/sidebar.helpers';
import { loginAs } from '../../helpers/dashboard';

/**
 * DASH-002 sidebar.
 *
 * This spec used to hardcode the visible/hidden list, which made it a running
 * record of what the sidebar looked like on the day it was written. Items have
 * since been individually revealed (fretboard, repertoire, practice, ai/ai-chat
 * on 2026-07-19; skills on 2026-07-22 per CHT-2) and relabelled ("My Songs" →
 * "Song Library" per SNG-6), and each of those shipped as a deliberate product
 * decision while the spec kept asserting the old shape — six stale assertions
 * across the three roles, all failing against a correct app.
 *
 * So the completeness check now derives from `sidebar.helpers`, the same module
 * the sidebar renders from: reveals and relabels flow through automatically,
 * while a rendering bug (config says an item is there, the DOM disagrees — or a
 * stray item the config excludes) still fails.
 *
 * That alone can't catch a *wrong config*, since it would agree with itself.
 * The cross-role guards below cover that: they assert the things that must hold
 * regardless of what the config says, and they are the assertions worth
 * breaking the build over.
 */

const ROLES: Record<'admin' | 'teacher' | 'student', RoleFlags> = {
  admin: { isAdmin: true, isTeacher: false, isStudent: false },
  teacher: { isAdmin: false, isTeacher: true, isStudent: false },
  student: { isAdmin: false, isTeacher: false, isStudent: true },
};

/** Every label the sidebar should render for a role: solo items + group items. */
function expectedNavLabels(flags: RoleFlags): string[] {
  return [
    HOME_ITEM.label,
    ...getSidebarGroups(flags).flatMap((g) => g.items.map((i) => i.label)),
    NOTIFICATIONS_ITEM.label,
    SETTINGS_ITEM.label,
  ].sort();
}

/** Unique `data-nav-item` labels in the DOM (desktop and mobile both render). */
async function renderedNavLabels(page: import('@playwright/test').Page): Promise<string[]> {
  const labels = await page
    .locator('[data-nav-item]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-nav-item') ?? ''));
  return [...new Set(labels.filter(Boolean))].sort();
}

/**
 * The desktop `<aside>` is hidden below `md`; the same NavItems render inside
 * the topbar's sheet. Returns the container whose items should be VISIBLE,
 * opening the sheet when on mobile.
 */
async function openNav(page: import('@playwright/test').Page) {
  const trigger = page.getByTestId('sidebar-mobile-trigger');
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
    const sheet = page.getByTestId('sidebar-mobile');
    await expect(sheet).toBeVisible();
    return sheet;
  }
  return page.locator('aside[aria-label="Dashboard navigation"]');
}

test.describe('DASH-002 sidebar', () => {
  for (const role of ['admin', 'teacher', 'student'] as const) {
    test(`${role} sidebar renders exactly the items the menu config declares`, async ({ page }) => {
      await loginAs(page, role);
      const nav = await openNav(page);
      await expect(nav.locator(`[data-nav-item="${HOME_ITEM.label}"]`).first()).toBeVisible();

      const expected = expectedNavLabels(ROLES[role]);
      // Set equality would pass vacuously if both sides came back empty (a
      // broken import, a sidebar that rendered nothing). Pin a floor first.
      expect(expected.length, 'expected nav must not be empty').toBeGreaterThan(5);

      expect(await renderedNavLabels(page)).toEqual(expected);
    });
  }

  test('a student is never offered teacher-only surfaces', async ({ page }) => {
    await loginAs(page, 'student');
    const rendered = await renderedNavLabels(page);

    // Roster and admin tooling are the teacher's, not the student's. Unlike the
    // reveal/relabel churn above, these must not appear no matter how the core
    // loop is trimmed — a student seeing them is a real access-model bug.
    for (const forbidden of ['Students', 'Skills', 'Health Monitor', 'Logs', 'Cohorts']) {
      expect(rendered, `student must not see "${forbidden}"`).not.toContain(forbidden);
    }
  });

  test('teacher and admin share one teaching surface', async ({ page }) => {
    // The owner is currently the only teacher, so admin deliberately gets the
    // teacher sidebar (see menuConfig: both roles take the same branch). Pinned
    // here so splitting them later is a conscious change, not a silent one.
    expect(expectedNavLabels(ROLES.admin)).toEqual(expectedNavLabels(ROLES.teacher));

    await loginAs(page, 'teacher');
    const nav = await openNav(page);
    for (const core of ['Lessons', 'Songs', 'Assignments', 'Students']) {
      await expect(nav.locator(`[data-nav-item="${core}"]`).first()).toBeVisible();
    }
  });
});
