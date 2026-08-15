import { expect, test } from '@playwright/test';

import {
  HOME_ITEM,
  NOTIFICATIONS_ITEM,
  SETTINGS_ITEM,
  getSidebarGroups,
  type RoleFlags,
} from '../../../components/dashboard/sidebar/sidebar.helpers';
import { loginAs } from '../../helpers/dashboard';
import enMessages from '../../../messages/en.json';

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
 *
 * Deriving from the config had one blind spot, closed 2026-08-15 (SKL-2): the
 * completeness check compared `data-nav-item`, which carries `label`, while the
 * sidebar renders `t(id)`. Those are two different strings and nothing compared
 * them, so a student's "Practice Tools" entry displayed "Skills" for weeks with
 * this spec green. `renderedNavPairs` now pins label against rendered text.
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
 * (`data-nav-item`, visible text) for every rendered item.
 *
 * The two differ by construction: `SidebarNavItem` sets `data-nav-item={label}`
 * but renders `{t(id)}`. Everything above reads only the attribute, so a config
 * whose `label` and `Nav[id]` disagree looks perfectly healthy here — which is
 * exactly how a student's "Practice Tools" entry rendered the word "Skills"
 * (it shared the teacher entry's `id: 'skills'`) for weeks with this spec green.
 * SKL-2, 2026-08-15.
 */
async function renderedNavPairs(
  page: import('@playwright/test').Page
): Promise<Record<string, string>> {
  const pairs = await page
    .locator('[data-nav-item]')
    .evaluateAll((els) =>
      els.map((e) => [e.getAttribute('data-nav-item') ?? '', (e.textContent ?? '').trim()])
    );
  return Object.fromEntries(pairs.filter(([label]) => label));
}

/**
 * Every item a role gets, as (label, `Nav[id]`) — the two halves that must agree.
 *
 * Deriving the expectation from `id` and comparing it to a DOM that also renders
 * from `id` would agree with itself and prove nothing (the trap this spec's
 * header names). The load-bearing invariant is different: **the `label` an item
 * declares must be the text a person actually reads.** `label` is the name the
 * config, this spec and every reviewer reason about; `Nav[id]` is what ships to
 * the screen. When they drift, the config becomes fiction — which is precisely
 * what happened when a student's "Practice Tools" rendered as "Skills".
 */
function navLabelPairs(flags: RoleFlags): { id: string; label: string; message: string }[] {
  const nav = enMessages.Nav as Record<string, string>;
  const items = [
    HOME_ITEM,
    ...getSidebarGroups(flags).flatMap((g) => g.items),
    NOTIFICATIONS_ITEM,
    SETTINGS_ITEM,
  ];
  return items.map((i) => ({ id: i.id, label: i.label, message: nav[i.id] }));
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

    test(`${role} sidebar renders the label each item claims`, async ({ page }) => {
      const pairs = navLabelPairs(ROLES[role]);

      for (const { id, label, message } of pairs) {
        // A missing key is a render-time throw in next-intl, not a silent
        // fallback — an undefined here is a crash waiting for this role.
        expect(message, `Nav message missing for id "${id}"`).toBeTruthy();
        // The divergence itself. Two names for one item is how "Practice Tools"
        // shipped reading "Skills"; keeping them equal is what makes the config
        // describe the product rather than merely accompany it.
        expect(message, `nav item "${id}" is labelled "${label}" but renders "${message}"`).toBe(
          label
        );
      }

      await loginAs(page, role);
      await openNav(page);

      // ...and the DOM agrees with both.
      expect(await renderedNavPairs(page)).toEqual(
        Object.fromEntries(pairs.map((p) => [p.label, p.label]))
      );
    });
  }

  test('a student is never offered teacher-only surfaces', async ({ page }) => {
    await loginAs(page, 'student');
    const pairs = await renderedNavPairs(page);
    // Check both what the config calls an item and what the student actually
    // reads on screen — the two are different strings (see `renderedNavPairs`),
    // and only the second one is what a person can act on.
    const rendered = [...Object.keys(pairs), ...Object.values(pairs)];

    // Roster and admin tooling are the teacher's, not the student's. Unlike the
    // reveal/relabel churn above, these must not appear no matter how the core
    // loop is trimmed — a student seeing them is a real access-model bug.
    for (const forbidden of ['Students', 'Health Monitor', 'Logs', 'Cohorts']) {
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
