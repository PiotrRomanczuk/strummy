import { createClient } from '@supabase/supabase-js';

import { test, expect } from '../../fixtures';

/**
 * Shadow Claim With Data — the highest-value flow in the app (ADR-0002):
 * a teacher tracks a student as a shadow profile (songs + lessons) BEFORE the
 * student has an account; when the student signs up with that email, all of
 * that history must end up on the account they log into.
 *
 * Guards the "S2" claim-in-place model introduced by
 * 20260727110000_handle_new_user_shadow_claim.sql: signup UPDATEs the shadow
 * profile in place — sets user_id, clears the shadow markers — so the profile
 * id never changes and no FK is ever re-pointed. That makes the DB assertions
 * here the inverse of a transfer-based claim:
 *
 *  - the claimed profile IS the shadow row (same id), it does not vanish
 *  - profiles.user_id is the auth user id and is deliberately NOT equal to
 *    profiles.id (S2 decouples them; 20260727100000 moved RLS to profile-id
 *    space so this is safe)
 *  - repertoire/lessons still carry the original student_id — the strongest
 *    form of "the data survived", since nothing had to move
 *
 * Steps (serial — one journey):
 *  1. Admin creates a shadow student via /dashboard/users/new
 *  2. Songs (repertoire) + lessons attached to the shadow (service role)
 *  3. Student signs up at /sign-up with the shadow's email → claim fires
 *  4. DB proves the claim-in-place (same profile id, shadow markers cleared,
 *     repertoire/lessons still attached)
 *  5. Claimed student logs in and SEES the songs and lessons in the UI
 *
 * afterAll removes the seeded rows and the auth user via service role.
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
/**
 * Generated per run, never a literal. The account exists only inside this
 * spec — created at step 3, deleted in afterAll — so the value is disposable,
 * but a hardcoded credential-shaped string trips secret scanning, and
 * suppressing that finding would blunt the scanner for a real leak later.
 * (Do not quote the old literal here either: the scanner reads comments.)
 * Composition satisfies the signup policy: upper, lower, digit, symbol.
 */
const STUDENT_PASSWORD = `Claim-${RUN_TS}-Aa1!`;
const STUDENT_FIRST = 'Claimed';
const STUDENT_LAST = `Student${RUN_TS}`;
const LESSON_TITLES = [`E2E Claim Lesson A ${RUN_TS}`, `E2E Claim Lesson B ${RUN_TS}`];

let shadowId = '';
let teacherId = '';
/** Under S2 the claimed profile id === shadowId; kept separate for clarity. */
let claimedProfileId = '';
/** profiles.user_id — the auth.users id, distinct from the profile id under S2. */
let claimedAuthUserId = '';
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

    // Seed our own songs rather than borrowing two arbitrary rows.
    //
    // This used to be `.select('id, title').limit(2)` with no ORDER BY, so it
    // adopted whatever Postgres returned first — in practice the `RLS …`
    // fixture rows that the RLS suites create and DELETE in their own
    // afterAll. Those suites now run on every PR (#560), so the borrowed rows
    // could vanish mid-spec and step 4 would fail looking for a title that no
    // longer existed. Owning the rows makes the spec independent of ambient
    // data and of whatever else shares the dev stack.
    songTitles = [`Shadow claim song A ${RUN_TS}`, `Shadow claim song B ${RUN_TS}`];
    const { data: songs, error: songErr } = await db
      .from('songs')
      .insert(songTitles.map((title) => ({ title, author: 'E2E Shadow Claim' })))
      .select('id, title');
    expect(songErr, `song seed: ${songErr?.message}`).toBeNull();
    songIds = (songs ?? []).map((s) => s.id);

    expect(teacherId, 'seed teacher profile must exist').toBeTruthy();
    expect(songIds, 'seeded songs must exist').toHaveLength(2);
  });

  test.afterAll(async () => {
    const db = adminClient();
    // Under S2 the profile id survives the claim, so one delete by profile id
    // clears both the claimed and the never-claimed case. Done explicitly
    // rather than relying on an auth-user cascade, since profiles.id is no
    // longer tied to auth.users.id.
    const profileId = claimedProfileId || shadowId;
    if (profileId) {
      await db.from('lessons').delete().eq('student_id', profileId);
      await db.from('student_repertoire').delete().eq('student_id', profileId);
      await db.from('profiles').delete().eq('id', profileId);
    }
    if (claimedAuthUserId) {
      await db.auth.admin.deleteUser(claimedAuthUserId);
    }
    // Own the songs, so remove them too — lesson_songs rows go with the
    // lessons deleted above.
    if (songIds.length) await db.from('songs').delete().in('id', songIds);
  });

  test('1. admin creates a shadow student via the UI', async ({ page, loginAs }) => {
    test.setTimeout(45_000);
    await loginAs('admin');

    await page.goto('/dashboard/users/new');
    await page.waitForLoadState('networkidle');

    // Address fields by placeholder, never by position. This spec used to fill
    // `input` nth(0)/nth(1) as first/last name; the form has since become a
    // single "Full name" field with a date input in slot 1, so nth(1) tried to
    // put a surname into `<input type="date">` and failed on "Malformed value".
    // (The labels are <span>, not <label for=…>, so getByLabel is unavailable —
    // that missing association is a real a11y gap worth fixing separately.)
    const form = page.locator('form');
    await form.getByPlaceholder('e.g. Emma Johnson').fill(`${STUDENT_FIRST} ${STUDENT_LAST}`);
    await form.getByPlaceholder('student@email.com').fill(STUDENT_EMAIL);
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
      .select('id, is_shadow, invite_email, user_id, first_name, is_student')
      .eq('email', STUDENT_EMAIL)
      .single();
    expect(claimed, 'claimed profile must exist under the real email').toBeTruthy();
    claimedProfileId = claimed?.id ?? '';
    claimedAuthUserId = claimed?.user_id ?? '';

    // S2: the shadow row IS the claimed profile — same id, updated in place.
    expect(claimedProfileId, 'profile id must survive the claim unchanged').toBe(shadowId);

    // Shadow markers cleared, auth linked.
    expect(claimed?.is_shadow).toBe(false);
    expect(claimed?.invite_email).toBeNull();
    expect(claimedAuthUserId, 'user_id must be linked to the new auth user').toBeTruthy();
    expect(claimed?.is_student).toBe(true);

    // S2 decouples the two id spaces on purpose — a profile id equal to the
    // auth uid would mean the pre-S2 transfer model had run instead.
    expect(claimedAuthUserId).not.toBe(claimedProfileId);

    // The teacher's own data entry survives the claim.
    expect(claimed?.first_name).toBe(STUDENT_FIRST);

    // Songs and lessons are still attached — under S2 they never moved.
    const { count: repCount } = await db
      .from('student_repertoire')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', claimedProfileId);
    expect(repCount).toBe(2);

    const { count: lessonCount } = await db
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', claimedProfileId);
    expect(lessonCount).toBe(2);
  });

  test('4. claimed student logs in and sees the songs and lessons', async ({ page }) => {
    test.setTimeout(60_000);
    const db = adminClient();

    // Out of scope for this flow: email confirmation (real SMTP locally) and
    // the onboarding questionnaire. Confirm + skip via service role.
    // updateUserById takes the AUTH user id; the profiles update takes the
    // PROFILE id. Under S2 these are different values — do not collapse them.
    const { error: confirmErr } = await db.auth.admin.updateUserById(claimedAuthUserId, {
      email_confirm: true,
    });
    expect(confirmErr, `confirm: ${confirmErr?.message}`).toBeNull();
    await db.from('profiles').update({ onboarding_completed: true }).eq('id', claimedProfileId);

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
