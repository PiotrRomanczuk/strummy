import { createClient } from '@supabase/supabase-js';

import { test, expect } from '../../fixtures';

/**
 * Shadow Claim With Data — the highest-value flow in the app (ADR-0002):
 * a teacher tracks a student as a shadow profile (songs + lessons) BEFORE the
 * student has an account; when the student signs up with that email, every
 * reference must migrate onto the claimed account and the shadow must vanish.
 *
 * Regression guard for the 2026-06-22 trigger regression fixed by
 * 20260714120000_fix_shadow_claim_lifecycle.sql (claim_shadow_profile).
 *
 * Steps (serial — one journey):
 *  1. Admin creates a shadow student via /dashboard/users/new
 *  2. Songs (repertoire) + lessons attached to the shadow (service role)
 *  3. Student signs up at /sign-up with the shadow's email → claim fires
 *  4. DB proves the migration (repertoire/lessons re-pointed, shadow gone,
 *     shadow_link_completed logged)
 *  5. Claimed student logs in and SEES the songs and lessons in the UI
 *
 * afterAll deletes the auth user (profile + data cascade) via service role.
 */

test.describe.configure({ mode: 'serial' });

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

const RUN_TS = Date.now();
const STUDENT_EMAIL = `shadow-claim-${RUN_TS}@example.com`;
const STUDENT_PASSWORD = 'e2eClaim123!';
const STUDENT_FIRST = 'Claimed';
const STUDENT_LAST = `Student${RUN_TS}`;
const LESSON_TITLES = [`E2E Claim Lesson A ${RUN_TS}`, `E2E Claim Lesson B ${RUN_TS}`];

let shadowId = '';
let teacherId = '';
let claimedUserId = '';
let songIds: string[] = [];
let songTitles: string[] = [];

test.describe('Shadow claim carries songs and lessons', { tag: ['@auth', '@shadow'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();

    const { data: teacher } = await db
      .from('profiles')
      .select('id')
      .eq('is_teacher', true)
      .eq('is_shadow', false)
      .limit(1)
      .single();
    teacherId = teacher?.id ?? '';

    const { data: songs } = await db.from('songs').select('id, title').limit(2);
    songIds = (songs ?? []).map((s) => s.id);
    songTitles = (songs ?? []).map((s) => s.title);

    expect(teacherId, 'seed teacher profile must exist').toBeTruthy();
    expect(songIds, 'at least 2 seed songs must exist').toHaveLength(2);
  });

  test.afterAll(async () => {
    const db = adminClient();
    // Claimed path: deleting the auth user cascades profile → lessons/repertoire.
    if (claimedUserId) {
      await db.auth.admin.deleteUser(claimedUserId);
    }
    // Unclaimed leftovers (test failed before/at claim): shadow + its data.
    if (shadowId) {
      await db.from('lessons').delete().eq('student_id', shadowId);
      await db.from('student_repertoire').delete().eq('student_id', shadowId);
      await db.from('profiles').delete().eq('id', shadowId);
    }
  });

  test('1. admin creates a shadow student via the UI', async ({ page, loginAs }) => {
    test.setTimeout(45_000);
    await loginAs('admin');

    await page.goto('/dashboard/users/new');
    await page.waitForLoadState('networkidle');

    // Scope to the <form> — sidebar search input comes first in DOM order.
    const form = page.locator('form');
    await form.locator('input').nth(0).fill(STUDENT_FIRST);
    await form.locator('input').nth(1).fill(STUDENT_LAST);
    await form.locator('input[type="email"]').fill(STUDENT_EMAIL);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/dashboard\/users\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    shadowId = new URL(page.url()).pathname.split('/').pop() ?? '';
    expect(shadowId).toBeTruthy();

    // The created profile is a shadow (placeholder account, no auth user).
    const db = adminClient();
    const { data: profile } = await db
      .from('profiles')
      .select('is_shadow, user_id, email, invite_email')
      .eq('id', shadowId)
      .single();
    expect(profile?.is_shadow).toBe(true);
    expect(profile?.user_id).toBeNull();
    // The student's real address is on the row (email or invite_email,
    // depending on creation convention) — that's what the claim matches on.
    expect([profile?.email, profile?.invite_email]).toContain(STUDENT_EMAIL);
  });

  test('2. songs and lessons are attached to the shadow', async ({ page, loginAs }) => {
    const db = adminClient();

    const { error: repErr } = await db
      .from('student_repertoire')
      .insert(
        songIds.map((songId) => ({ student_id: shadowId, song_id: songId, assigned_by: teacherId }))
      );
    expect(repErr, `repertoire insert: ${repErr?.message}`).toBeNull();

    const inAWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: lessons, error: lesErr } = await db
      .from('lessons')
      .insert(
        LESSON_TITLES.map((title, i) => ({
          teacher_id: teacherId,
          student_id: shadowId,
          title,
          lesson_teacher_number: 990100 + (RUN_TS % 1000) + i,
          scheduled_at: inAWeek,
        }))
      )
      .select('id');
    expect(lesErr, `lessons insert: ${lesErr?.message}`).toBeNull();
    expect(lessons).toHaveLength(2);

    // Link each song to a lesson — songs RLS only lets a student see songs
    // reachable through lesson_songs on their own lessons, and the repertoire
    // page inner-joins songs. This mirrors how teacher flows create the data.
    const { error: linkErr } = await db
      .from('lesson_songs')
      .insert(songIds.map((songId, i) => ({ lesson_id: (lessons ?? [])[i].id, song_id: songId })));
    expect(linkErr, `lesson_songs insert: ${linkErr?.message}`).toBeNull();

    // Teacher-visible sanity check: the shadow's detail page renders.
    await loginAs('admin');
    await page.goto(`/dashboard/users/${shadowId}`);
    await expect(page.locator(`text=${STUDENT_FIRST}`).first()).toBeVisible({ timeout: 10_000 });
  });

  test('3. student signs up with the shadow email and the claim fires', async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto('/sign-up');

    await page.locator('#firstName').fill(STUDENT_FIRST);
    await page.locator('#lastName').fill(STUDENT_LAST);
    await page.locator('#email').fill(STUDENT_EMAIL);
    await page.locator('#password').fill(STUDENT_PASSWORD);
    await page.locator('#confirmPassword').fill(STUDENT_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 15_000 });

    // The claim runs in the signup trigger — verify the migration in the DB.
    const db = adminClient();

    const { data: claimed } = await db
      .from('profiles')
      .select('id, is_shadow, user_id, first_name, is_student')
      .eq('email', STUDENT_EMAIL)
      .single();
    expect(claimed, 'claimed profile must exist under the real email').toBeTruthy();
    expect(claimed?.is_shadow).toBe(false);
    expect(claimed?.user_id).toBe(claimed?.id);
    expect(claimed?.is_student).toBe(true);
    claimedUserId = claimed?.id ?? '';
    expect(claimedUserId).not.toBe(shadowId);

    // Shadow row is gone.
    const { data: shadowLeft } = await db
      .from('profiles')
      .select('id')
      .eq('id', shadowId)
      .maybeSingle();
    expect(shadowLeft).toBeNull();

    // Songs and lessons moved onto the claimed account.
    const { count: repCount } = await db
      .from('student_repertoire')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', claimedUserId);
    expect(repCount).toBe(2);

    const { count: lessonCount } = await db
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', claimedUserId);
    expect(lessonCount).toBe(2);

    // Durable audit trail of the claim.
    const { data: events } = await db
      .from('auth_events')
      .select('id')
      .eq('event_type', 'shadow_link_completed')
      .eq('user_id', claimedUserId);
    expect(events?.length).toBe(1);
  });

  test('4. claimed student logs in and sees the songs and lessons', async ({ page }) => {
    test.setTimeout(60_000);
    const db = adminClient();

    // Out of scope for this flow: email confirmation (real SMTP locally) and
    // the onboarding questionnaire. Confirm + skip via service role.
    const { error: confirmErr } = await db.auth.admin.updateUserById(claimedUserId, {
      email_confirm: true,
    });
    expect(confirmErr, `confirm: ${confirmErr?.message}`).toBeNull();
    await db.from('profiles').update({ onboarding_completed: true }).eq('id', claimedUserId);

    await page.goto('/sign-in');
    await page.waitForSelector('[data-testid="email"]', { state: 'visible', timeout: 30_000 });
    await page.fill('[data-testid="email"]', STUDENT_EMAIL);
    await page.fill('[data-testid="password"]', STUDENT_PASSWORD);
    await page.click('[data-testid="signin-button"]');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 });

    // Songs are already in their repertoire.
    await page.goto('/dashboard/repertoire');
    await expect(page.getByRole('heading', { name: /repertoire/i })).toBeVisible({
      timeout: 15_000,
    });
    for (const title of songTitles) {
      await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 10_000 });
    }

    // Lessons are already on their account.
    await page.goto('/dashboard/lessons');
    await expect(page.locator(`text=${LESSON_TITLES[0]}`).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(`text=${LESSON_TITLES[1]}`).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
