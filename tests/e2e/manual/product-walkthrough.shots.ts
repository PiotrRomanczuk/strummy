import type { Page } from '@playwright/test';

/**
 * Shot list for the product walkthrough document
 * (`docs/product-walkthrough/`). Each entry is one captured screen; the id is
 * the filename and the key the document's content files reference.
 *
 * Opt-in only (lives under tests/e2e/manual/). Run with
 * `npx playwright test tests/e2e/manual/product-walkthrough.spec.ts --project="Desktop Chrome"`.
 */

export type ShotRole = 'public' | 'demo' | 'demoStudent';
export type ShotViewport = 'phone' | 'desktop' | 'tabletPortrait' | 'tabletLandscape';

export interface Shot {
  id: string;
  role: ShotRole;
  viewport: ShotViewport;
  /** Route to open; absolute URLs are allowed (Mailpit). */
  path?: string;
  /** Runs after `path` (or instead of it) to reach a state: clicks, fills, waits. */
  before?: (page: Page) => Promise<void>;
  /** Wait for this selector before shooting (best effort). */
  selector?: string;
  /** Capture the whole scroll height instead of the viewport. */
  full?: boolean;
}

const MAILPIT = 'http://192.168.1.75:55324';

/** Open the first record link of a list page (skips /new, /requests, /templates…). */
const firstLink = (list: string, prefix: string) => async (page: Page) => {
  await page.goto(list);
  await page.waitForLoadState('networkidle');
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  const link = page.locator(`a[href^="${prefix}"]`);
  const count = await link.count();
  for (let i = 0; i < count; i += 1) {
    const href = (await link.nth(i).getAttribute('href')) ?? '';
    if (new RegExp(`^${prefix}${uuid}`).test(href)) {
      await link.nth(i).click();
      await page.waitForURL(new RegExp(`${prefix}${uuid}`));
      return;
    }
  }
  throw new Error(`No record link under ${prefix} on ${list}`);
};

/** Master-detail lists select into a panel (`?selected=<id>`); open the record's own page instead. */
const viaSelected = (list: string, base: string) => async (page: Page) => {
  await page.goto(list);
  await page.waitForLoadState('networkidle');
  const href = (await page.locator('a[href*="selected="]').first().getAttribute('href')) ?? '';
  const id = new URL(href, 'http://localhost').searchParams.get('selected');
  if (!id) throw new Error(`No selectable row on ${list}`);
  await page.goto(`${base}${id}`);
};
const songPage = (title: string) =>
  viaSelected(`/dashboard/songs?search=${encodeURIComponent(title)}`, '/dashboard/songs/');

/** Click the first row so the list shows its side panel (desktop master-detail). */
const selectFirst = async (page: Page) => {
  await page.locator('a[href*="selected="]').first().click();
  await page.waitForTimeout(900);
};

/** Render a Mailpit message (by subject prefix) as plain HTML. */
const mail = (subjectPrefix: string) => async (page: Page) => {
  const res = await page.request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`subject:"${subjectPrefix}"`)}&limit=1`
  );
  const body = (await res.json()) as { messages?: { ID: string }[] };
  const id = body.messages?.[0]?.ID;
  if (!id) throw new Error(`No Mailpit message with subject "${subjectPrefix}"`);
  await page.goto(`${MAILPIT}/view/${id}.html`);
};

const phone = (id: string, role: ShotRole, path: string, extra: Partial<Shot> = {}): Shot => ({
  id,
  role,
  viewport: 'phone',
  path,
  ...extra,
});

export const PUBLIC_SHOTS: Shot[] = [
  phone('p-landing', 'public', '/', {}),
  phone('p-for-teachers', 'public', '/for-teachers', {}),
  phone('p-signin', 'public', '/sign-in', { selector: '[data-testid="signin-email"]' }),
  phone('p-signin-error', 'public', '/sign-in', {
    selector: '[data-testid="signin-email"]',
    before: async (page) => {
      await page.fill('[data-testid="signin-email"]', 'anna@przyklad.pl');
      await page.fill('[data-testid="signin-password"]', 'zle-haslo');
      await page.click('[data-testid="signin-button"]');
      await page.waitForTimeout(2500);
    },
  }),
  phone('p-forgot', 'public', '/forgot-password'),
  phone('p-fretboard-public', 'public', '/fretboard'),
  phone('m-invite', 'public', '', { before: mail('You have been invited'), full: true }),
  phone('m-reminder', 'public', '', { before: mail('Upcoming Lesson Reminder'), full: true }),
  phone('m-recap', 'public', '', { before: mail('Lesson Recap'), full: true }),
  phone('m-overdue', 'public', '', { before: mail('Overdue Assignment'), full: true }),
  phone('m-new-assignment', 'public', '', { before: mail('New Assignment'), full: true }),
];

export const TEACHER_SHOTS: Shot[] = [
  phone('t-home', 'demo', '/dashboard'),
  phone('t-home-more', 'demo', '/dashboard', {
    before: async (page) => {
      await page.getByRole('button', { name: 'Otwórz nawigację' }).click();
      await page.waitForTimeout(600);
    },
  }),
  phone('t-lessons', 'demo', '/dashboard/lessons'),
  phone('t-lessons-completed', 'demo', '/dashboard/lessons?status=completed'),
  phone('t-lesson-new', 'demo', '/dashboard/lessons/new', {}),
  phone('t-lesson-detail', 'demo', '', {
    before: firstLink('/dashboard/lessons', '/dashboard/lessons/'),
  }),
  phone('t-lesson-edit', 'demo', '', {
    before: async (page) => {
      await firstLink('/dashboard/lessons', '/dashboard/lessons/')(page);
      await page.goto(page.url().replace(/\/?$/, '/edit'));
    },
  }),
  phone('t-calendar', 'demo', '/dashboard/calendar'),
  phone('t-songs', 'demo', '/dashboard/songs?sort=title'),
  phone('t-songs-nomatch', 'demo', '/dashboard/songs?search=zzzzzz'),
  phone('t-song-detail', 'demo', '', {
    before: songPage('Wonderwall'),
  }),
  phone('t-songs-selected', 'demo', '/dashboard/songs?search=Wonderwall', {
    before: selectFirst,
  }),
  phone('t-song-new', 'demo', '/dashboard/songs/new', {}),
  phone('t-song-requests', 'demo', '/dashboard/songs/requests'),
  phone('t-assignments', 'demo', '/dashboard/assignments'),
  phone('t-assignment-new', 'demo', '/dashboard/assignments/new', {}),
  phone('t-assignment-detail', 'demo', '', {
    before: firstLink('/dashboard/assignments', '/dashboard/assignments/'),
  }),
  phone('t-assignment-templates', 'demo', '/dashboard/assignments/templates'),
  phone('t-users', 'demo', '/dashboard/users'),
  phone('t-user-new', 'demo', '/dashboard/users/new', {}),
  phone('t-user-detail', 'demo', '', {
    before: firstLink('/dashboard/users', '/dashboard/users/'),
  }),
  phone('t-notifications', 'demo', '/dashboard/notifications'),
  phone('t-settings-notifications', 'demo', '/dashboard/settings/notifications', {}),
  phone('t-settings', 'demo', '/dashboard/settings', {}),
  phone('t-skills', 'demo', '/dashboard/skills'),
  phone('t-chord-quiz', 'demo', '/dashboard/skills/chord-quiz'),
  phone('t-fretboard', 'demo', '/dashboard/fretboard'),
  phone('t-ai', 'demo', '/dashboard/ai'),
  phone('t-theory', 'demo', '/dashboard/theory'),
  phone('st-not-found', 'demo', '/dashboard/lessons/00000000-0000-0000-0000-000000000000'),
  { id: 'd-home', role: 'demo', viewport: 'desktop', path: '/dashboard' },
  { id: 'd-lessons', role: 'demo', viewport: 'desktop', path: '/dashboard/lessons' },
  {
    id: 'd-lessons-selected',
    role: 'demo',
    viewport: 'desktop',
    path: '/dashboard/lessons',
    before: selectFirst,
  },
  {
    id: 'd-lesson-detail',
    role: 'demo',
    viewport: 'desktop',
    before: viaSelected('/dashboard/lessons', '/dashboard/lessons/'),
  },
  { id: 'd-songs', role: 'demo', viewport: 'desktop', path: '/dashboard/songs?sort=title' },
  {
    id: 'd-song-detail',
    role: 'demo',
    viewport: 'desktop',
    before: songPage('Wonderwall'),
  },
  {
    id: 'd-songs-selected',
    role: 'demo',
    viewport: 'desktop',
    path: '/dashboard/songs?search=Wonderwall',
    before: selectFirst,
  },
  { id: 'd-assignments', role: 'demo', viewport: 'desktop', path: '/dashboard/assignments' },
  { id: 'd-users', role: 'demo', viewport: 'desktop', path: '/dashboard/users' },
  {
    id: 'd-user-detail',
    role: 'demo',
    viewport: 'desktop',
    before: firstLink('/dashboard/users', '/dashboard/users/'),
  },
  { id: 'd-calendar', role: 'demo', viewport: 'desktop', path: '/dashboard/calendar' },
  { id: 'tab-home-portrait', role: 'demo', viewport: 'tabletPortrait', path: '/dashboard' },
  {
    id: 'tab-lessons-landscape',
    role: 'demo',
    viewport: 'tabletLandscape',
    path: '/dashboard/lessons',
  },
];

export const STUDENT_SHOTS: Shot[] = [
  phone('s-home', 'demoStudent', '/dashboard'),
  phone('s-lessons', 'demoStudent', '/dashboard/lessons'),
  phone('s-lesson-detail', 'demoStudent', '', {
    before: firstLink('/dashboard/lessons', '/dashboard/lessons/'),
  }),
  phone('s-assignments', 'demoStudent', '/dashboard/assignments'),
  phone('s-assignment-detail', 'demoStudent', '', {
    before: firstLink('/dashboard/assignments', '/dashboard/assignments/'),
  }),
  phone('s-repertoire', 'demoStudent', '/dashboard/repertoire', {}),
  phone('s-songs', 'demoStudent', '/dashboard/songs?sort=title'),
  phone('s-song-detail', 'demoStudent', '', {
    before: songPage('Wonderwall'),
  }),
  phone('s-practice', 'demoStudent', '/dashboard/practice', {}),
  phone('s-my-skills', 'demoStudent', '/dashboard/my-skills', {}),
  phone('s-chord-quiz', 'demoStudent', '/dashboard/skills/chord-quiz'),
  phone('s-fretboard', 'demoStudent', '/dashboard/fretboard'),
  phone('s-notifications', 'demoStudent', '/dashboard/notifications'),
  phone('s-settings-notifications', 'demoStudent', '/dashboard/settings/notifications', {}),
  { id: 'd-s-home', role: 'demoStudent', viewport: 'desktop', path: '/dashboard' },
  { id: 'd-s-repertoire', role: 'demoStudent', viewport: 'desktop', path: '/dashboard/repertoire' },
];

export const SHOTS: Shot[] = [...PUBLIC_SHOTS, ...TEACHER_SHOTS, ...STUDENT_SHOTS];
