import { test, expect } from '../fixtures';
import { isMailpitSmtpConfigured, MAILPIT_SMTP_REQUIRED, waitForEmail } from '../helpers/mailpit';
import { adminClient, getStudentId, getTeacherId, studentEmail } from '../helpers/seed-ids';

/**
 * F04 — Lesson content: song, stage, notes → student sees homework.
 *
 * Two songs: SONG is attached through the UI in F04.1; SEEDED_SONG is attached
 * in `beforeAll` so F04.2 and F04.4 do not depend on F04.1 having passed.
 */
const RUN = Date.now();
const SONG = `E2E Flow Content Song ${RUN}`;
const SEEDED_SONG = `E2E Flow Seeded Song ${RUN}`;
const LESSON = `E2E Flow Content Lesson ${RUN}`;

test.describe('F04 lesson content', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let songId = '';
  let seededSongId = '';
  let lessonId = '';
  let studentId = '';

  test.beforeAll(async () => {
    const db = adminClient();
    const [teacherId, sid] = await Promise.all([getTeacherId(db), getStudentId(db)]);
    studentId = sid;
    const { data: songs, error: songError } = await db
      .from('songs')
      .insert([
        { title: SONG, author: 'E2E Flow', level: 'beginner', key: 'G' },
        { title: SEEDED_SONG, author: 'E2E Flow', level: 'beginner', key: 'C' },
      ])
      .select('id, title');
    if (songError || !songs) throw new Error(`seed songs: ${songError?.message}`);
    songId = songs.find((s) => s.title === SONG)!.id;
    seededSongId = songs.find((s) => s.title === SEEDED_SONG)!.id;
    const { data: lesson, error: lessonError } = await db
      .from('lessons')
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        title: LESSON,
        scheduled_at: '2030-05-05T10:00:00Z',
        status: 'SCHEDULED',
      })
      .select('id')
      .single();
    if (lessonError || !lesson) throw new Error(`seed lesson: ${lessonError?.message}`);
    lessonId = lesson.id;
    const { error: linkError } = await db
      .from('lesson_songs')
      .insert({ lesson_id: lessonId, song_id: seededSongId, status: 'to_learn' });
    if (linkError) throw new Error(`seed lesson_songs: ${linkError.message}`);
  });
  test.afterAll(async () => {
    const db = adminClient();
    await db.from('lesson_songs').delete().eq('lesson_id', lessonId);
    // F04.5 leaves the student a recap mail log row and an inbox row.
    await db.from('notification_log').delete().eq('entity_id', lessonId);
    await db.from('in_app_notifications').delete().eq('entity_id', lessonId);
    await db.from('lessons').delete().eq('id', lessonId);
    await db.from('songs').delete().in('id', [songId, seededSongId]);
  });

  test('F04.1 teacher attaches a song to the lesson', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/dashboard/lessons/${lessonId}`);
    // "+ Add song" is a native <select> laid transparently over a ghost button
    // (LessonDetail.AddSong.tsx); picking an option saves and refreshes.
    await page.getByRole('combobox', { name: 'Add song' }).selectOption(songId);
    await expect(
      page.locator('main').getByText(SONG).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 15_000 });

    const { count } = await adminClient()
      .from('lesson_songs')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', lessonId)
      .eq('song_id', songId);
    expect(count).toBe(1);
  });

  test('F04.2 teacher sets the stage and it persists', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/dashboard/lessons/${lessonId}`);
    // The innermost block holding both the seeded song's link and its stepper.
    const started = page.getByRole('button', { name: 'Set status to Started' });
    const entry = page
      .locator('main div')
      .filter({ has: page.locator(`a[href$="/dashboard/songs/${seededSongId}"]`) })
      .filter({ has: started })
      .last();
    await entry.getByRole('button', { name: 'Set status to Started' }).click();
    await expect
      .poll(
        async () =>
          (
            await adminClient()
              .from('lesson_songs')
              .select('status')
              .eq('lesson_id', lessonId)
              .eq('song_id', seededSongId)
              .single()
          ).data?.status,
        { timeout: 10_000 }
      )
      .toBe('started');
  });

  test('F04.3 teacher writes lesson notes', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/dashboard/lessons/${lessonId}`);
    const notes = page.getByPlaceholder(/lesson plan|goals|observations/i).first();
    await notes.fill(`Work on the G chord ${RUN}`);
    await notes.blur();
    await expect
      .poll(
        async () =>
          (await adminClient().from('lessons').select('notes').eq('id', lessonId).single()).data
            ?.notes,
        { timeout: 15_000 }
      )
      .toContain(`G chord ${RUN}`);
  });

  test('F04.4 the student sees the song and notes on the lesson', async ({ page, loginAs }) => {
    // Notes are written here too, so this step holds even if F04.3 failed.
    const { error } = await adminClient()
      .from('lessons')
      .update({ notes: `Work on the G chord ${RUN}` })
      .eq('id', lessonId);
    expect(error).toBeNull();
    await loginAs('student');
    await page.goto(`/dashboard/lessons/${lessonId}`);
    const main = page.locator('main');
    await expect(main.getByText(SEEDED_SONG).filter({ visible: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(main.getByText(`G chord ${RUN}`).filter({ visible: true }).first()).toBeVisible();
  });

  test('F04.5 recap email after a completed lesson', async ({ page, loginAs }) => {
    test.skip(!isMailpitSmtpConfigured(), MAILPIT_SMTP_REQUIRED);
    test.setTimeout(90_000);
    // The recap goes out the moment the teacher asks for it (sendNotification,
    // not the daily queue); with student e-mail enabled it lands in Mailpit.
    // The teacher completes the lesson from the edit form (this is the write
    // that the track_lesson_changes trigger used to reject with an enum error).
    await loginAs('teacher');
    await page.goto(`/dashboard/lessons/${lessonId}/edit`);
    await page.locator('#lesson-status').selectOption('COMPLETED');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(new RegExp(`/dashboard/lessons/${lessonId}$`), { timeout: 20_000 });
    await expect
      .poll(
        async () =>
          (await adminClient().from('lessons').select('status').eq('id', lessonId).single()).data
            ?.status,
        { timeout: 10_000 }
      )
      .toBe('COMPLETED');

    // The recap control exists only on a completed lesson; it sends at once.
    const since = Date.now();
    await page.goto(`/dashboard/lessons/${lessonId}`);
    const recap = page.getByRole('button', { name: 'Recap email' });
    await expect(recap).toBeVisible({ timeout: 15_000 });
    await recap.click();
    await expect(page.getByRole('button', { name: 'Recap sent' })).toBeVisible({ timeout: 30_000 });

    const mail = await waitForEmail(studentEmail(), 30_000, since - 2_000);
    expect(mail.Subject).toContain(`Lesson Recap: ${LESSON}`);

    const { data: log } = await adminClient()
      .from('notification_log')
      .select('status')
      .eq('entity_id', lessonId)
      .eq('notification_type', 'lesson_recap')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(log?.status).toBe('sent');
  });
});
