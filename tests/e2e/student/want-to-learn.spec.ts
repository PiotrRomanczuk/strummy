import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

/**
 * Student "want to learn" E2E — picking a library song into own repertoire.
 *
 * Journeys tested:
 *  W1 — Song page offers the pick, and taking it flips to the undo affordance
 *  W2 — The pick survives a reload and shows as in-repertoire (the `to_learn`
 *       regression: `getSongLearners` excludes that status, so reading the
 *       viewer's own state off it made a fresh pick look like it never landed)
 *  W3 — Undo removes it and the page returns to the un-picked state
 *  W4 — A teacher-assigned song offers no undo (students cannot delete
 *       assigned work)
 *  W5 — The library list exposes the same control per row
 *
 * These journeys are the reason this file exists rather than only unit tests:
 * the feature's first bug was a synchronous export from a `'use server'`
 * module, which typecheck and Jest both pass and which 500s every page that
 * imports it. Only actually loading a page catches that class of failure.
 */

let STUDENT_ID: string;
let SONG_ID: string;
let SONG_TITLE: string;
let ASSIGNED_SONG_ID: string;

const SONG_MARKER = 'E2E WantToLearn Song';
const ASSIGNED_MARKER = 'E2E WantToLearn Assigned';

test.describe.configure({ mode: 'serial' });

test.describe('Student want to learn', { tag: ['@student', '@repertoire'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);

    // Idempotent cleanup, scoped to this spec's own marker titles so a prior
    // interrupted run cannot leave rows that change what the assertions see.
    for (const title of [SONG_MARKER, ASSIGNED_MARKER]) {
      const { data: stale } = await db.from('songs').select('id').eq('title', title);
      for (const s of stale ?? []) {
        await db.from('student_repertoire').delete().eq('song_id', s.id);
        await db.from('songs').delete().eq('id', s.id);
      }
    }

    const { data: pickable } = await db
      .from('songs')
      .insert({ title: SONG_MARKER, author: 'E2E', level: 'beginner' })
      .select('id, title')
      .single();
    SONG_ID = pickable!.id;
    SONG_TITLE = pickable!.title;

    const { data: assigned } = await db
      .from('songs')
      .insert({ title: ASSIGNED_MARKER, author: 'E2E', level: 'beginner' })
      .select('id')
      .single();
    ASSIGNED_SONG_ID = assigned!.id;

    // Teacher-assigned row: added_by_student stays false, so undo must not appear.
    await db.from('student_repertoire').insert({
      student_id: STUDENT_ID,
      song_id: ASSIGNED_SONG_ID,
      current_status: 'to_learn',
      added_by_student: false,
    });
  });

  test.afterAll(async () => {
    const db = adminClient();
    for (const id of [SONG_ID, ASSIGNED_SONG_ID]) {
      if (!id) continue;
      await db.from('student_repertoire').delete().eq('song_id', id);
      await db.from('songs').delete().eq('id', id);
    }
  });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('student');
  });

  test('W1 song page offers the pick and flips to undo after taking it', async ({ page }) => {
    await page.goto(`/dashboard/songs/${SONG_ID}`);
    await page.waitForLoadState('networkidle');

    const add = page.getByRole('button', { name: /want to learn/i });
    await expect(add).toBeVisible({ timeout: 15_000 });

    await add.click();
    await expect(page.getByRole('button', { name: /^remove$/i })).toBeVisible({ timeout: 15_000 });
  });

  test('W2 the pick survives a reload as a to_learn entry', async ({ page }) => {
    await page.goto(`/dashboard/songs/${SONG_ID}`);
    await page.waitForLoadState('networkidle');

    // The song must NOT read as absent from the repertoire — that was the bug.
    await expect(page.getByText(/not in your repertoire/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^remove$/i })).toBeVisible({ timeout: 15_000 });
  });

  test('W3 undo returns the song to the un-picked state', async ({ page }) => {
    await page.goto(`/dashboard/songs/${SONG_ID}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /^remove$/i }).click();
    await expect(page.getByRole('button', { name: /want to learn/i })).toBeVisible({
      timeout: 15_000,
    });

    const db = adminClient();
    const { data } = await db
      .from('student_repertoire')
      .select('id')
      .eq('student_id', STUDENT_ID)
      .eq('song_id', SONG_ID);
    expect(data ?? []).toHaveLength(0);
  });

  test('W4 a teacher-assigned song offers no undo', async ({ page }) => {
    await page.goto(`/dashboard/songs/${ASSIGNED_SONG_ID}`);
    await page.waitForLoadState('networkidle');

    // The song page shows an existing entry as the stage stepper; the compact
    // "In your repertoire" label is the library-row variant, not this one.
    await expect(page.getByText(/not in your repertoire/i)).toHaveCount(0);
    // No undo: the row is teacher-assigned, so the RPC would refuse it and the
    // UI must not offer it. And no add either — it is already there.
    await expect(page.getByRole('button', { name: /^remove$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /want to learn/i })).toHaveCount(0);
  });

  test('W5 the library list exposes the control per row', async ({ page }) => {
    await page.goto(`/dashboard/songs?search=${encodeURIComponent(SONG_MARKER)}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(SONG_TITLE).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('song-row-action').first()).toBeVisible();
  });
});
