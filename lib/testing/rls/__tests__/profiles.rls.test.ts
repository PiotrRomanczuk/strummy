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

  // Canonical staff read (profiles_select_staff, 20260718090300 "MINIMAL
  // SIMPLIFICATION", re-asserted by 20260727130000): ANY teacher reads ALL
  // profiles — including deactivated ones and other teachers' students. The
  // legacy is_active / teacher_teaches_student scoping these tests encoded
  // was dropped with the stale policy set; narrow again when multi-teacher
  // per-teacher scoping lands.
  it('teacher CAN see a deactivated student (blanket staff read — canon)', async () => {
    const { data } = await teacher.client
      .from('profiles')
      .select('id')
      .eq('id', deactivatedStudent.id)
      .maybeSingle();
    expect(data?.id).toBe(deactivatedStudent.id);
  });

  it("teacher CAN see another teacher's student (blanket staff read — canon)", async () => {
    const { data } = await teacher.client
      .from('profiles')
      .select('id')
      .eq('id', otherTeachersStudent.id)
      .maybeSingle();
    expect(data?.id).toBe(otherTeachersStudent.id);
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

  // profiles_guard_self_update (20261115120000): a non-admin may change only
  // display/contact fields on their own row. Before it, `profiles_update_own`
  // limited the row and not the columns, so `{ is_admin: true }` on your own
  // row made you an admin.
  describe('self-update column guard (profiles_guard_self_update)', () => {
    const readProfile = async (id: string) => {
      const { data } = await service.from('profiles').select('*').eq('id', id).single();
      return data as Record<string, unknown>;
    };

    it('a user CANNOT make themselves admin on their own row (42501, value unchanged)', async () => {
      const { error } = await activeStudent.client
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', activeStudent.id);
      expect(error?.code).toBe('42501');
      expect((await readProfile(activeStudent.id)).is_admin).toBe(false);
    });

    it.each([
      ['is_teacher', true],
      ['is_development', false],
      ['is_active', false],
      ['lesson_rate', 1],
      ['student_status', 'active'],
      ['onboarding_completed', true],
      ['deleted_at', '2026-01-01T00:00:00.000Z'],
      ['email', 'taken-over@example.com'],
    ])('a user CANNOT change their own %s', async (column, value) => {
      const before = await readProfile(activeStudent.id);
      const { error } = await activeStudent.client
        .from('profiles')
        .update({ [column]: value })
        .eq('id', activeStudent.id);
      expect(error?.code).toBe('42501');
      expect((await readProfile(activeStudent.id))[column]).toEqual(before[column]);
    });

    it('a user CANNOT attach themselves to another profile as parent_id', async () => {
      const { error } = await activeStudent.client
        .from('profiles')
        .update({ parent_id: teacher.id })
        .eq('id', activeStudent.id);
      expect(error?.code).toBe('42501');
      expect((await readProfile(activeStudent.id)).parent_id).toBeNull();
    });

    it('a mixed update is rejected whole: the allowed field is not applied either', async () => {
      const before = await readProfile(activeStudent.id);
      const { error } = await activeStudent.client
        .from('profiles')
        .update({ full_name: 'Smuggler', is_admin: true })
        .eq('id', activeStudent.id);
      expect(error?.code).toBe('42501');
      const after = await readProfile(activeStudent.id);
      expect(after.full_name).toBe(before.full_name);
      expect(after.is_admin).toBe(false);
    });

    it('a user can still edit every allowed field on their own row', async () => {
      const { error } = await activeStudent.client
        .from('profiles')
        .update({
          first_name: 'Own',
          last_name: 'Edit',
          full_name: 'Own Edit',
          phone: '+48 555 000 222',
          avatar_url: 'https://example.com/a.png',
          locale: 'pl',
        })
        .eq('id', activeStudent.id);
      expect(error).toBeNull();
      expect(await readProfile(activeStudent.id)).toMatchObject({
        first_name: 'Own',
        last_name: 'Edit',
        full_name: 'Own Edit',
        phone: '+48 555 000 222',
        avatar_url: 'https://example.com/a.png',
        locale: 'pl',
        is_admin: false,
      });
    });

    it('an admin CAN change another profile role flags and rate through the user client', async () => {
      const target = await make('student', 'promote-target');
      const { data, error } = await admin.client
        .from('profiles')
        .update({ is_admin: true, lesson_rate: 120 })
        .eq('id', target.id)
        .select('id');
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(await readProfile(target.id)).toMatchObject({ is_admin: true, lesson_rate: 120 });
    });

    it('a teacher updating ANOTHER profile still matches 0 rows (row policy, not the trigger)', async () => {
      const { data, error } = await teacher.client
        .from('profiles')
        .update({ full_name: 'Not Yours' })
        .eq('id', otherTeachersStudent.id)
        .select('id');
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('service_role (onboarding, lockout, Cal.com intake) is not restricted', async () => {
      const { error } = await service
        .from('profiles')
        .update({ onboarding_completed: true, is_parent: true })
        .eq('id', otherTeachersStudent.id);
      expect(error).toBeNull();
      expect(await readProfile(otherTeachersStudent.id)).toMatchObject({
        onboarding_completed: true,
        is_parent: true,
      });
    });
  });
});
