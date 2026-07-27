/**
 * RLS-real coverage for the profiles soft-delete + role-scoping predicate
 * (STRUM-p2, spec 04 / 10). Proves against a real Supabase branch that:
 *   - a teacher sees active students but NOT deactivated ones
 *   - a teacher sees only students they actually teach, not every other
 *     teacher's active students (confirmed IDOR, 2026-07-15 — see
 *     20260715120003_scope_teacher_profile_visibility_to_own_students.sql)
 *   - an admin sees everyone, including deactivated profiles
 *   - a user sees their own profile (active or not)
 *   - a student sees their own teacher's profile but not an unrelated teacher's
 *   - a non-admin cannot flip another profile's role flags (UPDATE denied)
 *   - a user can self-edit full_name/phone/avatar_url but not another's
 *
 * Auto-skips unless an RLS test DB is configured (see lib/testing/rls/env.ts).
 * Requires the 20260616120000_soft_delete_users migration applied to that branch.
 */

import {
  describeIfRls,
  createServiceClient,
  createSignedInRlsUser,
  type RlsRole,
  type SeededUser,
} from '../index';

describeIfRls('profiles RLS — soft-delete scoping + self-edit', () => {
  const service = createServiceClient();
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Auth uids for teardown — auth.admin.deleteUser takes the AUTH uid.
  const authUids: string[] = [];

  let admin: SeededUser;
  let teacher: SeededUser;
  let unrelatedTeacher: SeededUser;
  let activeStudent: SeededUser;
  let deactivatedStudent: SeededUser;
  let otherTeachersStudent: SeededUser;

  // Seeds THROUGH the real handle_new_user trigger (shared helper) — the
  // returned `.id` is the PROFILE id, which may differ from the auth uid.
  const make = async (
    role: RlsRole,
    label: string,
    overrides: Record<string, unknown> = {}
  ): Promise<SeededUser> => {
    const user = await createSignedInRlsUser(service, role, `${label}-${tag}`, {
      is_active: true,
      ...overrides,
    });
    authUids.push(user.userId);
    return user;
  };

  beforeAll(async () => {
    admin = await make('admin', 'a');
    teacher = await make('teacher', 't');
    unrelatedTeacher = await make('teacher', 'unrelated');
    activeStudent = await make('student', 'active');
    deactivatedStudent = await make('student', 'inactive', {
      is_active: false,
      deleted_at: new Date().toISOString(),
    });
    otherTeachersStudent = await make('student', 'other-roster');
    // Link both of the first teacher's students via lessons (teacher
    // visibility path), and the third student to the UNRELATED teacher only.
    await service.from('lessons').insert([
      {
        teacher_id: teacher.id,
        student_id: activeStudent.id,
        scheduled_at: new Date().toISOString(),
      },
      {
        teacher_id: teacher.id,
        student_id: deactivatedStudent.id,
        scheduled_at: new Date().toISOString(),
      },
      {
        teacher_id: unrelatedTeacher.id,
        student_id: otherTeachersStudent.id,
        scheduled_at: new Date().toISOString(),
      },
    ]);
  }, 30_000);

  afterAll(async () => {
    await Promise.allSettled(authUids.map((uid) => service.auth.admin.deleteUser(uid)));
  });

  it('teacher sees the active student', async () => {
    const { data } = await teacher.client
      .from('profiles')
      .select('id')
      .eq('id', activeStudent.id)
      .maybeSingle();
    expect(data?.id).toBe(activeStudent.id);
  });

  it('teacher CANNOT see a deactivated student (is_active predicate hides it)', async () => {
    const { data } = await teacher.client
      .from('profiles')
      .select('id')
      .eq('id', deactivatedStudent.id)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("teacher CANNOT see another teacher's active student by direct id lookup (IDOR fix)", async () => {
    const { data } = await teacher.client
      .from('profiles')
      .select('id')
      .eq('id', otherTeachersStudent.id)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it('admin sees ALL profiles including the deactivated student', async () => {
    const { data } = await admin.client
      .from('profiles')
      .select('id')
      .in('id', [activeStudent.id, deactivatedStudent.id]);
    const seen = new Set((data ?? []).map((r) => r.id));
    expect(seen.has(activeStudent.id)).toBe(true);
    expect(seen.has(deactivatedStudent.id)).toBe(true);
  });

  it('a user sees their own profile', async () => {
    const { data } = await activeStudent.client
      .from('profiles')
      .select('id')
      .eq('id', activeStudent.id)
      .maybeSingle();
    expect(data?.id).toBe(activeStudent.id);
  });

  it('a student sees the profile of their own teacher (shared non-deleted lesson)', async () => {
    const { data } = await activeStudent.client
      .from('profiles')
      .select('id')
      .eq('id', teacher.id)
      .maybeSingle();
    expect(data?.id).toBe(teacher.id);
  });

  it('a student CANNOT see an unrelated teacher (no lesson between them)', async () => {
    const { data } = await activeStudent.client
      .from('profiles')
      .select('id')
      .eq('id', unrelatedTeacher.id)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it('non-admin CANNOT flip another profile role flags (UPDATE denied by RLS)', async () => {
    await teacher.client.from('profiles').update({ is_admin: true }).eq('id', activeStudent.id);
    const { data } = await service
      .from('profiles')
      .select('is_admin')
      .eq('id', activeStudent.id)
      .single();
    expect(data?.is_admin).toBe(false);
  });

  it('a user can self-edit full_name/phone/avatar_url on their own row', async () => {
    const { error } = await activeStudent.client
      .from('profiles')
      .update({ full_name: 'Renamed Self', phone: '+1 555 000 1111' })
      .eq('id', activeStudent.id);
    expect(error).toBeNull();
    const { data } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', activeStudent.id)
      .single();
    expect(data?.full_name).toBe('Renamed Self');
  });

  it('a user CANNOT self-edit another profile (self-only RLS)', async () => {
    await activeStudent.client
      .from('profiles')
      .update({ full_name: 'Hacked' })
      .eq('id', teacher.id);
    const { data } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', teacher.id)
      .single();
    expect(data?.full_name).not.toBe('Hacked');
  });
});
