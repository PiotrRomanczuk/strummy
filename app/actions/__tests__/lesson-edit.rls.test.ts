/**
 * Creating and editing a lesson from the form — the real server actions,
 * under real sessions (`actAs`), on the dev stack. Lessons are written with
 * the caller's own client, so RLS, the lesson triggers and the enum are all
 * in the path; every assertion reads the row back with the service role.
 *
 * Replaces the mocked lesson-edit.test.ts. It held this file at 100% coverage
 * while no status change from the edit form could ever succeed (#873: the
 * history trigger compared the upper-case enum with lower-case strings).
 *
 * @see app/actions/lesson-edit.ts
 */
import {
  actAs,
  actAsAnonymous,
  createRlsUser,
  describeIfRls,
  revalidatedPaths,
  seedRow,
  seedTwoTeachers,
  updateRow,
  type TwoTeacherFixture,
} from '@/lib/testing/rls';
import { TEST_ACCOUNT_MUTATION_ERROR } from '@/lib/auth/test-account-guard';
import { createLessonAction, updateLessonAction } from '../lesson-edit';

type Login = { email: string; password: string; id: string; userId: string };

describeIfRls('lesson form actions on the real database', () => {
  let fx: TwoTeacherFixture;
  let admin: Login;
  let demoTeacher: Login;
  let songs: { first: string; second: string };
  const newcomerEmail = `rls-newcomer-${Date.now().toString(36)}@guitarcrm.local`;

  const lessonRow = async (id: string) => {
    const { data } = await fx.service.from('lessons').select('*').eq('id', id).single();
    return data as Record<string, unknown>;
  };
  const songIdsOf = async (lessonId: string) => {
    const { data } = await fx.service
      .from('lesson_songs')
      .select('song_id')
      .eq('lesson_id', lessonId);
    return (data ?? []).map((row) => row.song_id as string);
  };
  /** A lesson teacher A gives student A1, seeded directly. */
  const seededLesson = () =>
    seedRow(fx.service, 'lessons', {
      teacher_id: fx.teacherA.id,
      student_id: fx.studentA1.id,
      title: 'RLS lekcja do edycji',
      scheduled_at: '2030-04-10T15:00:00.000Z',
    });
  const created = (result: Awaited<ReturnType<typeof createLessonAction>>) => {
    if (!('lessonId' in result)) throw new Error(result.error);
    return result.lessonId;
  };

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    const tag = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    // Fixture users are demo accounts by default, which the test-account guard blocks.
    for (const user of [fx.teacherA, fx.teacherB, fx.studentA1]) {
      await updateRow(fx.service, 'profiles', user.id, { is_development: false });
    }
    admin = await createRlsUser(fx.service, 'admin', `lessons-${tag}`, { is_development: false });
    demoTeacher = await createRlsUser(fx.service, 'teacher', `lessons-demo-${tag}`);
    songs = {
      first: await fx.seedSong('lesson-edit 1'),
      second: await fx.seedSong('lesson-edit 2'),
    };
  }, 60_000);

  afterAll(async () => {
    // A shadow profile has no auth user, so neither cleanup() nor the sweep removes it.
    await fx?.service.from('profiles').delete().eq('email', newcomerEmail);
    for (const user of [admin, demoTeacher]) {
      if (user) await fx.service.auth.admin.deleteUser(user.userId);
    }
    await fx?.cleanup();
  });

  describe('createLessonAction', () => {
    it("creates the caller's lesson, links its songs and adds them to the repertoire", async () => {
      await actAs(fx.teacherA);
      const lessonId = created(
        await createLessonAction({
          studentId: fx.studentA1.id,
          title: 'RLS nowa lekcja',
          notes: 'Akordy otwarte',
          scheduledAt: '2030-04-10T15:00:00.000Z',
          durationMinutes: 45,
          format: 'video',
          songIds: [songs.first],
        })
      );

      const row = await lessonRow(lessonId);
      expect(row).toMatchObject({
        teacher_id: fx.teacherA.id,
        student_id: fx.studentA1.id,
        title: 'RLS nowa lekcja',
        notes: 'Akordy otwarte',
        status: 'SCHEDULED',
        duration_minutes: 45,
        format: 'video',
      });
      expect(Date.parse(row.scheduled_at as string)).toBe(Date.parse('2030-04-10T15:00:00Z'));
      expect(row.lesson_teacher_number).toEqual(expect.any(Number));
      expect(await songIdsOf(lessonId)).toEqual([songs.first]);
      const { data: repertoire } = await fx.service
        .from('student_repertoire')
        .select('song_id')
        .eq('student_id', fx.studentA1.id)
        .eq('song_id', songs.first);
      expect(repertoire).toHaveLength(1);
      expect(revalidatedPaths).toContain('/dashboard/lessons');
    });

    it.each([
      ['picked by id', () => ({ studentId: fx.studentB1.id })],
      ['typed by email', () => ({ studentEmail: fx.studentB1.email })],
    ])("refuses another teacher's student %s and writes nothing", async (_how, student) => {
      await actAs(fx.teacherA);
      await expect(
        createLessonAction({ ...student(), scheduledAt: '2030-04-14T15:00:00.000Z' })
      ).resolves.toEqual({ error: 'You can only schedule lessons with your own students' });
      const { count } = await fx.service
        .from('lessons')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', fx.teacherA.id)
        .eq('student_id', fx.studentB1.id);
      expect(count).toBe(0);
    });

    it("takes a new student's email: a shadow profile and the first lesson", async () => {
      await actAs(fx.teacherA);
      const lessonId = created(
        await createLessonAction({
          studentEmail: newcomerEmail,
          scheduledAt: '2030-04-15T15:00:00.000Z',
        })
      );
      const { data: shadow } = await fx.service
        .from('profiles')
        .select('id, is_shadow')
        .eq('email', newcomerEmail)
        .single();
      expect(shadow).toMatchObject({ is_shadow: true });
      expect(await lessonRow(lessonId)).toMatchObject({
        teacher_id: fx.teacherA.id,
        student_id: shadow?.id,
      });
    });

    it('lets an admin create a lesson on behalf of a teacher', async () => {
      await actAs(admin);
      const lessonId = created(
        await createLessonAction({
          studentId: fx.studentA1.id,
          teacherId: fx.teacherA.id,
          scheduledAt: '2030-04-11T15:00:00.000Z',
        })
      );
      expect(await lessonRow(lessonId)).toMatchObject({ teacher_id: fx.teacherA.id });
    });

    it.each([
      [
        'for another teacher',
        { teacherId: 'B' },
        'Teachers can only create lessons for themselves',
      ],
      ['without a student', { studentId: undefined }, 'Select a student or enter an email'],
    ])('refuses a lesson %s and writes nothing', async (_case, override, error) => {
      await actAs(fx.teacherA);
      const values = {
        studentId: fx.studentA1.id,
        title: `RLS refused ${_case}`,
        scheduledAt: '2030-04-12T15:00:00.000Z',
        ...override,
        ...('teacherId' in override ? { teacherId: fx.teacherB.id } : {}),
      };
      await expect(createLessonAction(values)).resolves.toEqual({ error });
      const { count } = await fx.service
        .from('lessons')
        .select('id', { count: 'exact', head: true })
        .eq('title', values.title);
      expect(count).toBe(0);
    });

    it('passes on the database refusal for a student that does not exist', async () => {
      await actAs(fx.teacherA);
      const result = await createLessonAction({
        studentId: '00000000-0000-4000-8000-000000000000',
        title: 'RLS ghost student',
        scheduledAt: '2030-04-12T15:00:00.000Z',
      });
      expect(result).toEqual({ error: expect.any(String) });
      const { count } = await fx.service
        .from('lessons')
        .select('id', { count: 'exact', head: true })
        .eq('title', 'RLS ghost student');
      expect(count).toBe(0);
    });

    it('returns the validation message for a lesson without a date', async () => {
      await actAs(fx.teacherA);
      const result = await createLessonAction({ studentId: fx.studentA1.id, scheduledAt: '' });
      expect(result).toEqual({ error: expect.any(String) });
    });

    it.each([
      ['a student', () => actAs(fx.studentA1), 'Only teachers and admins can create lessons'],
      ['an anonymous visitor', async () => actAsAnonymous(), 'Unauthorized'],
      ['a demo teacher account', () => actAs(demoTeacher), TEST_ACCOUNT_MUTATION_ERROR],
    ])('refuses %s', async (_who, signIn, error) => {
      await signIn();
      await expect(
        createLessonAction({ studentId: fx.studentA1.id, scheduledAt: '2030-04-13T15:00:00.000Z' })
      ).resolves.toEqual({ error });
    });
  });

  describe('updateLessonAction', () => {
    it.each(['COMPLETED', 'CANCELLED'] as const)(
      'saves status %s from the edit form (#873)',
      async (status) => {
        const lessonId = await seededLesson();
        await actAs(fx.teacherA);
        await expect(
          updateLessonAction(lessonId, {
            scheduledAt: '2030-04-10T15:00:00.000Z',
            status,
            notes: 'Po lekcji',
            durationMinutes: 60,
            format: 'in_person',
          })
        ).resolves.toEqual({ lessonId });
        expect(await lessonRow(lessonId)).toMatchObject({
          status,
          notes: 'Po lekcji',
          duration_minutes: 60,
          format: 'in_person',
        });
        expect(revalidatedPaths).toContain(`/dashboard/lessons/${lessonId}`);
      }
    );

    it("replaces the lesson's songs with the ones on the form", async () => {
      const lessonId = await seededLesson();
      await seedRow(fx.service, 'lesson_songs', { lesson_id: lessonId, song_id: songs.first });
      await actAs(fx.teacherA);
      await updateLessonAction(lessonId, {
        scheduledAt: '2030-04-10T15:00:00.000Z',
        songIds: [songs.second],
      });
      expect(await songIdsOf(lessonId)).toEqual([songs.second]);
    });

    it("reports another teacher's lesson as not found and leaves it untouched", async () => {
      const lessonId = await seededLesson();
      await actAs(fx.teacherB);
      await expect(
        updateLessonAction(lessonId, { scheduledAt: '2030-04-10T15:00:00.000Z', notes: 'cudze' })
      ).resolves.toEqual({ error: 'Lesson not found' });
      expect(await lessonRow(lessonId)).toMatchObject({ notes: null, status: 'SCHEDULED' });
    });

    it('passes on the database refusal for a date it cannot parse', async () => {
      const lessonId = await seededLesson();
      await actAs(fx.teacherA);
      const result = await updateLessonAction(lessonId, { scheduledAt: 'po południu' });
      expect(result).toEqual({ error: expect.stringContaining('po południu') });
      expect(Date.parse((await lessonRow(lessonId)).scheduled_at as string)).toBe(
        Date.parse('2030-04-10T15:00:00Z')
      );
    });

    it('returns the validation message for a duration outside 15-180 and writes nothing', async () => {
      const lessonId = await seededLesson();
      await actAs(fx.teacherA);
      const result = await updateLessonAction(lessonId, {
        scheduledAt: '2030-04-10T15:00:00.000Z',
        durationMinutes: 5,
      });
      expect(result).toEqual({ error: expect.any(String) });
      expect(await lessonRow(lessonId)).toMatchObject({ duration_minutes: null });
    });

    it.each([
      ['a student', () => actAs(fx.studentA1), 'Only teachers and admins can update lessons'],
      ['an anonymous visitor', async () => actAsAnonymous(), 'Unauthorized'],
      ['a demo teacher account', () => actAs(demoTeacher), TEST_ACCOUNT_MUTATION_ERROR],
    ])('refuses %s', async (_who, signIn, error) => {
      const lessonId = await seededLesson();
      await signIn();
      await expect(
        updateLessonAction(lessonId, { scheduledAt: '2030-04-10T15:00:00.000Z', notes: 'x' })
      ).resolves.toEqual({ error });
    });
  });
});
