/**
 * RLS-real coverage for 20261020190000_hide_demo_cohort_from_real_users:
 *   - a real (is_development = false) admin sees NO demo profile, lesson or
 *     assignment, even though the permissive admin policies would grant them
 *   - a demo teacher (is_development = true) still sees its own student,
 *     lesson and assignment — the restriction is for real viewers only
 *   - a real admin still sees real profiles (the restriction does not over-hide)
 *   - a real student whose teacher is a demo profile still sees their OWN
 *     lesson and assignment (participant exemption — the shadow-claim E2E on
 *     the dev stack hit exactly this on 2026-10-20)
 *
 * Note: lib/testing/rls/seedUser.ts seeds every user with is_development: true,
 * so the "real" admin here is created with an explicit override.
 *
 * Auto-skips unless an RLS test DB is configured (see lib/testing/rls/env.ts).
 */

import { describeIfRls, createServiceClient, createSignedInRlsUser, type SeededUser } from '../index';

describeIfRls('demo cohort is hidden from real users', () => {
  const service = createServiceClient();
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const authUids: string[] = [];

  let realAdmin: SeededUser;
  let realStudent: SeededUser;
  let demoTeacher: SeededUser;
  let demoStudent: SeededUser;
  let demoLessonId: string;
  let demoAssignmentId: string;
  let mixedLessonId: string;
  let mixedAssignmentId: string;

  beforeAll(async () => {
    realAdmin = await createSignedInRlsUser(service, 'admin', tag, { is_development: false });
    realStudent = await createSignedInRlsUser(service, 'student', `${tag}-real`, {
      is_development: false,
    });
    demoTeacher = await createSignedInRlsUser(service, 'teacher', `${tag}-demo`);
    demoStudent = await createSignedInRlsUser(service, 'student', `${tag}-demo`);
    authUids.push(realAdmin.userId, realStudent.userId, demoTeacher.userId, demoStudent.userId);

    const { data: lesson, error: lessonErr } = await service
      .from('lessons')
      .insert({
        teacher_id: demoTeacher.id,
        student_id: demoStudent.id,
        scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
        title: `RLS demo lesson ${tag}`,
      })
      .select('id')
      .single();
    if (lessonErr || !lesson) throw new Error(`lesson seed failed: ${lessonErr?.message}`);
    demoLessonId = lesson.id;

    const { data: assignment, error: assignmentErr } = await service
      .from('assignments')
      .insert({
        teacher_id: demoTeacher.id,
        student_id: demoStudent.id,
        title: `RLS demo assignment ${tag}`,
        status: 'not_started',
      })
      .select('id')
      .single();
    if (assignmentErr || !assignment) {
      throw new Error(`assignment seed failed: ${assignmentErr?.message}`);
    }
    demoAssignmentId = assignment.id;

    const { data: mixedLesson, error: mixedLessonErr } = await service
      .from('lessons')
      .insert({
        teacher_id: demoTeacher.id,
        student_id: realStudent.id,
        scheduled_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        title: `RLS mixed lesson ${tag}`,
      })
      .select('id')
      .single();
    if (mixedLessonErr || !mixedLesson) {
      throw new Error(`mixed lesson seed failed: ${mixedLessonErr?.message}`);
    }
    mixedLessonId = mixedLesson.id;

    const { data: mixedAssignment, error: mixedAssignmentErr } = await service
      .from('assignments')
      .insert({
        teacher_id: demoTeacher.id,
        student_id: realStudent.id,
        title: `RLS mixed assignment ${tag}`,
        status: 'not_started',
      })
      .select('id')
      .single();
    if (mixedAssignmentErr || !mixedAssignment) {
      throw new Error(`mixed assignment seed failed: ${mixedAssignmentErr?.message}`);
    }
    mixedAssignmentId = mixedAssignment.id;
  }, 30_000);

  afterAll(async () => {
    for (const id of [demoAssignmentId, mixedAssignmentId]) {
      if (id) await service.from('assignments').delete().eq('id', id);
    }
    for (const id of [demoLessonId, mixedLessonId]) {
      if (id) await service.from('lessons').delete().eq('id', id);
    }
    for (const uid of authUids) await service.auth.admin.deleteUser(uid);
  });

  it('real admin does not see demo profiles', async () => {
    const { data, error } = await realAdmin.client
      .from('profiles')
      .select('id')
      .in('id', [demoTeacher.id, demoStudent.id]);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('real admin still sees real profiles', async () => {
    const { data, error } = await realAdmin.client
      .from('profiles')
      .select('id')
      .eq('id', realStudent.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(realStudent.id);
  });

  it('real admin does not see the demo lesson or assignment', async () => {
    const lesson = await realAdmin.client
      .from('lessons')
      .select('id')
      .eq('id', demoLessonId)
      .maybeSingle();
    const assignment = await realAdmin.client
      .from('assignments')
      .select('id')
      .eq('id', demoAssignmentId)
      .maybeSingle();
    expect(lesson.error).toBeNull();
    expect(lesson.data).toBeNull();
    expect(assignment.error).toBeNull();
    expect(assignment.data).toBeNull();
  });

  it('real student still sees their own lesson and assignment with a demo teacher', async () => {
    const lesson = await realStudent.client
      .from('lessons')
      .select('id')
      .eq('id', mixedLessonId)
      .maybeSingle();
    const assignment = await realStudent.client
      .from('assignments')
      .select('id')
      .eq('id', mixedAssignmentId)
      .maybeSingle();
    expect(lesson.error).toBeNull();
    expect(lesson.data?.id).toBe(mixedLessonId);
    expect(assignment.error).toBeNull();
    expect(assignment.data?.id).toBe(mixedAssignmentId);
  });

  it('real admin does not see the mixed lesson (not a participant)', async () => {
    const { data, error } = await realAdmin.client
      .from('lessons')
      .select('id')
      .eq('id', mixedLessonId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('demo teacher still sees its own student, lesson and assignment', async () => {
    const student = await demoTeacher.client
      .from('profiles')
      .select('id')
      .eq('id', demoStudent.id)
      .maybeSingle();
    const lesson = await demoTeacher.client
      .from('lessons')
      .select('id')
      .eq('id', demoLessonId)
      .maybeSingle();
    const assignment = await demoTeacher.client
      .from('assignments')
      .select('id')
      .eq('id', demoAssignmentId)
      .maybeSingle();
    expect(student.data?.id).toBe(demoStudent.id);
    expect(lesson.data?.id).toBe(demoLessonId);
    expect(assignment.data?.id).toBe(demoAssignmentId);
  });
});
