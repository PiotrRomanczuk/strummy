/**
 * Moving an assignment through its states — the real server action, under
 * real sessions (`actAs`), on the dev stack. A student's write goes through
 * the SECURITY DEFINER RPC `student_update_assignment_status`, a teacher's or
 * admin's through their UPDATE policy; RLS decides who can even read the row.
 * Every assertion reads the row back with the service role.
 *
 * Replaces the mocked assignment-status.test.ts. Its "unrelated student" was
 * handed the row by the mock and refused by app code; on the real database
 * RLS hides the row first, so the answer is "not found".
 *
 * Mail from the completion notice goes to the dev Mailpit
 * (lib/testing/rls/jest.setup-env.ts); the assertion is on the inbox row.
 *
 * @see app/actions/assignment-status.ts
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
import { updateAssignmentStatusAction } from '../assignment-status';

type Login = { email: string; password: string; id: string; userId: string };
type Status = 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

describeIfRls('assignment status action on the real database', () => {
  let fx: TwoTeacherFixture;
  let admin: Login;
  let demoStudent: Login;
  let parent: Login;

  /** An assignment teacher A gave student A1, seeded directly. */
  const assignment = (status: Status = 'not_started', extra: Record<string, unknown> = {}) =>
    seedRow(fx.service, 'assignments', {
      teacher_id: fx.teacherA.id,
      student_id: fx.studentA1.id,
      title: 'RLS ćwiczenie',
      status,
      ...extra,
    });
  const statusOf = async (id: string) => {
    const { data } = await fx.service.from('assignments').select('status').eq('id', id).single();
    return (data as { status: string }).status;
  };
  const inboxOf = async (profileId: string, assignmentId: string) => {
    const { data } = await fx.service
      .from('in_app_notifications')
      .select('notification_type')
      .eq('profile_id', profileId)
      .eq('entity_id', assignmentId);
    return (data ?? []).map((row) => row.notification_type as string);
  };

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    const tag = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    // Fixture users are demo accounts by default, which the test-account guard blocks.
    for (const user of [fx.teacherA, fx.teacherB, fx.studentA1, fx.studentB1]) {
      await updateRow(fx.service, 'profiles', user.id, { is_development: false });
    }
    admin = await createRlsUser(fx.service, 'admin', `asg-${tag}`, { is_development: false });
    demoStudent = await createRlsUser(fx.service, 'student', `asg-demo-${tag}`);
    parent = await createRlsUser(fx.service, 'student', `asg-parent-${tag}`, {
      is_student: false,
      is_parent: true,
      is_development: false,
    });
    await updateRow(fx.service, 'profiles', fx.studentA1.id, { parent_id: parent.id });
  }, 60_000);

  afterAll(async () => {
    for (const user of [admin, demoStudent, parent]) {
      if (user) await fx.service.auth.admin.deleteUser(user.userId);
    }
    await fx?.cleanup();
  });

  describe('the owning student', () => {
    beforeAll(() => actAs(fx.studentA1));

    it('starts the assignment, and the teacher is not told', async () => {
      const id = await assignment();
      await expect(updateAssignmentStatusAction(id, 'in_progress')).resolves.toEqual({
        success: true,
        newStatus: 'in_progress',
      });
      expect(await statusOf(id)).toBe('in_progress');
      expect(await inboxOf(fx.teacherA.id, id)).toEqual([]);
      expect(revalidatedPaths).toContain(`/dashboard/assignments/${id}`);
    });

    it('completes it, and the teacher finds it in the inbox', async () => {
      const id = await assignment('in_progress');
      await expect(updateAssignmentStatusAction(id, 'completed')).resolves.toEqual({
        success: true,
        newStatus: 'completed',
      });
      expect(await statusOf(id)).toBe('completed');
      expect(await inboxOf(fx.teacherA.id, id)).toEqual(['assignment_completed']);
    });

    it('cannot cancel it', async () => {
      const id = await assignment();
      await expect(updateAssignmentStatusAction(id, 'cancelled')).resolves.toEqual({
        error: 'Students can only start or complete an assignment',
      });
      expect(await statusOf(id)).toBe('not_started');
    });

    it('cannot reopen a completed one', async () => {
      const id = await assignment('completed');
      const result = await updateAssignmentStatusAction(id, 'in_progress');
      expect(result).toEqual({ error: expect.stringContaining('Invalid status transition') });
      expect(await statusOf(id)).toBe('completed');
    });

    it('does not find a deleted one', async () => {
      const id = await assignment('not_started', { deleted_at: new Date().toISOString() });
      await expect(updateAssignmentStatusAction(id, 'in_progress')).resolves.toEqual({
        error: 'Assignment not found',
      });
    });
  });

  it.each([
    ['another student', () => fx.studentB1],
    ['another teacher', () => fx.teacherB],
  ])('%s does not even find it, and it stays as it was', async (_who, user) => {
    const id = await assignment();
    await actAs(user());
    await expect(updateAssignmentStatusAction(id, 'in_progress')).resolves.toEqual({
      error: 'Assignment not found',
    });
    expect(await statusOf(id)).toBe('not_started');
  });

  it("a parent sees the child's assignment but cannot move it", async () => {
    const id = await assignment();
    await actAs(parent);
    await expect(updateAssignmentStatusAction(id, 'in_progress')).resolves.toEqual({
      error: 'You cannot change this assignment',
    });
    expect(await statusOf(id)).toBe('not_started');
  });

  it('the owning teacher cancels it with a plain update, and is not notified', async () => {
    const id = await assignment();
    await actAs(fx.teacherA);
    await expect(updateAssignmentStatusAction(id, 'cancelled')).resolves.toEqual({
      success: true,
      newStatus: 'cancelled',
    });
    expect(await statusOf(id)).toBe('cancelled');
  });

  it('the owning teacher completing it does not notify the teacher', async () => {
    const id = await assignment('in_progress');
    await actAs(fx.teacherA);
    await updateAssignmentStatusAction(id, 'completed');
    expect(await statusOf(id)).toBe('completed');
    expect(await inboxOf(fx.teacherA.id, id)).toEqual([]);
  });

  it("an admin moves another teacher's assignment", async () => {
    const id = await assignment();
    await actAs(admin);
    await expect(updateAssignmentStatusAction(id, 'cancelled')).resolves.toEqual({
      success: true,
      newStatus: 'cancelled',
    });
    expect(await statusOf(id)).toBe('cancelled');
  });

  it.each([
    ['an anonymous visitor', async () => actAsAnonymous(), 'Unauthorized'],
    ['a demo account', () => actAs(demoStudent), TEST_ACCOUNT_MUTATION_ERROR],
  ])('refuses %s', async (_who, signIn, error) => {
    const id = await assignment();
    await signIn();
    await expect(updateAssignmentStatusAction(id, 'in_progress')).resolves.toEqual({ error });
    expect(await statusOf(id)).toBe('not_started');
  });
});
