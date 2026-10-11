import { test, expect } from '../fixtures';
import { adminClient, getStudentId, getTeacherId } from '../helpers/seed-ids';

/**
 * F07 — Practice: student logs → dashboard → teacher sees at-risk.
 *
 * Order matters and is deliberate (serial): F07.3 looks for the practice-gap
 * flag first, because F07.1 logging practice on the song freshens the stale
 * repertoire row and clears it. F07.2 reads a session seeded in `beforeAll`
 * with no song_id — the repertoire trigger ignores those, so it can neither
 * mask F07.3 nor depend on F07.1.
 */
const RUN = Date.now();
const SONG = `E2E Flow Practice Song ${RUN}`;
const STALE_DAYS = 20; // >= PRACTICE_AT_RISK_DAYS (14): the "at risk" tier
const SEEDED_MINUTES = 17; // unusual on purpose, so the Activity row is ours

type RepertoireBackup = { id: string; last_practiced_at: string | null };

test.describe('F07 practice', { tag: ['@flow'] }, () => {
  // Serial for the ordering above; 90 s because a re-login plus a cold
  // dashboard compile on the shared dev server can pass the default 30 s.
  test.describe.configure({ mode: 'serial', timeout: 90_000 });
  let studentId = '';
  let songId = '';
  let repertoireId = '';
  let lessonId = '';
  let seededSessionId = '';
  let otherRows: RepertoireBackup[] = [];
  let competitorRows: RepertoireBackup[] = [];

  test.beforeAll(async () => {
    const db = adminClient();
    const [teacherId, sid] = await Promise.all([getTeacherId(db), getStudentId(db)]);
    studentId = sid;
    const { data: song, error: songError } = await db
      .from('songs')
      .insert({ title: SONG, author: 'E2E Flow', level: 'beginner' })
      .select('id')
      .single();
    if (songError || !song) throw new Error(`seed song: ${songError?.message}`);
    songId = song.id;
    const stale = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
    const { data: rep, error: repError } = await db
      .from('student_repertoire')
      .insert({ student_id: studentId, song_id: songId, last_practiced_at: stale })
      .select('id')
      .single();
    if (repError || !rep) throw new Error(`seed repertoire: ${repError?.message}`);
    repertoireId = rep.id;
    // The at-risk query only considers students with a lesson with this teacher.
    const { data: lesson, error: lessonError } = await db
      .from('lessons')
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        title: `E2E Flow Practice Lesson ${RUN}`,
        scheduled_at: '2030-06-01T10:00:00Z',
        status: 'SCHEDULED',
      })
      .select('id')
      .single();
    if (lessonError || !lesson) throw new Error(`seed lesson: ${lessonError?.message}`);
    lessonId = lesson.id;
    // A song-less session for F07.2: the repertoire trigger skips song_id NULL,
    // so this does not freshen the student and hide the F07.3 flag. Notes must
    // not start with "E2E ": student/practice.spec.ts wipes every row of this
    // shared student matching 'E2E %' and runs in parallel with this suite.
    const { data: session, error: sessionError } = await db
      .from('practice_sessions')
      .insert({
        student_id: studentId,
        duration_minutes: SEEDED_MINUTES,
        notes: `Flow F07 seeded ${RUN}`,
      })
      .select('id')
      .single();
    if (sessionError || !session) throw new Error(`seed session: ${sessionError?.message}`);
    seededSessionId = session.id;

    // getAtRiskStudents reduces a student to their MOST RECENT last_practiced_at
    // across all repertoire rows and lists only the worst five of the roster.
    // Stale out the shared student's other rows and freshen one row per other
    // roster student so our 20-day gap is what the teacher sees. Restored in afterAll.
    const { data: others } = await db
      .from('student_repertoire')
      .select('id, last_practiced_at')
      .eq('student_id', studentId)
      .neq('id', repertoireId);
    otherRows = others ?? [];
    for (const row of otherRows) {
      await db.from('student_repertoire').update({ last_practiced_at: stale }).eq('id', row.id);
    }
    const { data: roster } = await db
      .from('lessons')
      .select('student_id')
      .eq('teacher_id', teacherId)
      .is('deleted_at', null);
    const rosterIds = Array.from(new Set((roster ?? []).map((r) => r.student_id as string)));
    const { data: competitors } = await db
      .from('student_repertoire')
      .select('id, last_practiced_at, student_id')
      .in('student_id', rosterIds);
    const onePerStudent = new Map<string, RepertoireBackup>();
    for (const row of competitors ?? []) {
      const owner = row.student_id as string;
      if (owner === studentId || onePerStudent.has(owner)) continue;
      onePerStudent.set(owner, { id: row.id, last_practiced_at: row.last_practiced_at });
    }
    competitorRows = [...onePerStudent.values()];
    const fresh = new Date().toISOString();
    for (const row of competitorRows) {
      await db.from('student_repertoire').update({ last_practiced_at: fresh }).eq('id', row.id);
    }
  });
  test.afterAll(async () => {
    const db = adminClient();
    for (const row of [...competitorRows, ...otherRows]) {
      await db
        .from('student_repertoire')
        .update({ last_practiced_at: row.last_practiced_at })
        .eq('id', row.id);
    }
    await db.from('practice_sessions').delete().eq('song_id', songId);
    await db.from('practice_sessions').delete().eq('id', seededSessionId);
    await db.from('student_repertoire').delete().eq('id', repertoireId);
    await db.from('lessons').delete().eq('id', lessonId);
    await db.from('songs').delete().eq('id', songId);
  });

  const attentionRow = (page: import('@playwright/test').Page) =>
    page
      .getByTestId('attention-row')
      .filter({ has: page.locator(`a[href="/dashboard/users/${studentId}"]`) });

  test('F07.3 the teacher sees the student flagged before the session', async ({
    page,
    loginAs,
  }) => {
    await loginAs('teacher');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Needs attention', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    const row = attentionRow(page);
    await expect(row).toBeVisible({ timeout: 15_000 });
    const reason = row.getByText(/No practice logged in \d+ days/);
    await expect(reason).toBeVisible();
    const days = parseInt(((await reason.textContent()) ?? '').match(/\d+/)?.[0] ?? '0', 10);
    expect(days).toBeGreaterThanOrEqual(STALE_DAYS);
    expect(days).toBeLessThanOrEqual(STALE_DAYS + 1);
  });

  test('F07.1 the student logs a practice session', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto('/dashboard/practice');
    await expect(page.getByRole('button', { name: 'Log practice' })).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('button:has-text("10m")').click();
    await page.locator('#practice-song').selectOption(songId);
    await page.locator('textarea#practice-notes').fill(`Flow F07 logged ${RUN}`);
    await page.getByRole('button', { name: 'Log practice' }).click();

    const db = adminClient();
    await expect
      .poll(
        async () =>
          (
            await db
              .from('practice_sessions')
              .select('id', { count: 'exact', head: true })
              .eq('song_id', songId)
          ).count,
        { timeout: 30_000 }
      )
      .toBe(1);
    await expect(page.getByText(/Practice logged/i).first()).toBeVisible({ timeout: 15_000 });
    // The repertoire trigger moved last_practiced_at to now: the gap is closed.
    const { data: rep } = await db
      .from('student_repertoire')
      .select('last_practiced_at')
      .eq('id', repertoireId)
      .single();
    const ageMs = Date.now() - new Date(rep?.last_practiced_at ?? 0).getTime();
    expect(ageMs).toBeLessThan(5 * 60_000);
  });

  test("F07.2 the student dashboard shows this week's practice", async ({ page, loginAs }) => {
    await loginAs('student');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(
      page
        .locator('main')
        .getByText(`${SEEDED_MINUTES} min practice`)
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('F07.3 the flag is gone once the student has practised', async ({ page, loginAs }) => {
    // Self-contained: freshen the row here rather than relying on F07.1.
    const { error } = await adminClient()
      .from('student_repertoire')
      .update({ last_practiced_at: new Date().toISOString() })
      .eq('id', repertoireId);
    expect(error).toBeNull();
    await loginAs('teacher');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 });
    await expect(attentionRow(page)).toHaveCount(0);
  });
});
