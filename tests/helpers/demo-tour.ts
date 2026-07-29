import type { Page } from '@playwright/test';
import { tourStorageKey } from '../../components/demo/demoTour.steps';

/**
 * Pre-marks the demo guided tour as already seen, so it never opens during a
 * spec that isn't about the tour.
 *
 * Demo accounts auto-start the tour on their first dashboard visit, and its
 * overlay both covers the page (polluting screenshots) and swallows clicks.
 * Must be called BEFORE `loginAs`, which navigates: `addInitScript` only
 * applies to navigations that happen after it is registered.
 *
 * The keys come from the component's own helper, so a version bump there
 * can't silently leave these specs un-suppressed.
 */
export async function suppressDemoTour(page: Page): Promise<void> {
  const keys = [tourStorageKey('teacher'), tourStorageKey('student')];
  await page.addInitScript((storageKeys: string[]) => {
    for (const key of storageKeys) {
      try {
        window.localStorage.setItem(key, 'seen');
      } catch {
        // Storage unavailable (private mode) — the tour simply runs.
      }
    }
  }, keys);
}
