/**
 * REGRESSION LOCK — divergent identity (finding 1, 2026-07-27 migrations
 * architecture review).
 *
 * The identity model is: profiles.id = independent PK, profiles.user_id =
 * auth linkage, and every domain FK (assignments.student_id, ...) lives in
 * PROFILE-id space. Six migrations shipped comparing those columns to
 * `auth.uid()` instead of `current_profile_id()` — invisible to CI because
 * every fixture forced `profiles.id == user_id`.
 *
 * This suite constructs a student whose profiles.id ≠ auth uid — GUARANTEED,
 * even on a legacy stack whose handle_new_user forces id = auth uid — and
 * proves the student write/read paths still work. If anyone ever reintroduces
 * an `auth.uid()` comparison against a profile-id column on these paths, this
 * suite fails.
 *
 * REQUIRES migration 20260727100000_identity_model_rls_fixes (RPC ownership
 * checks and assignment_history policy/trigger in profile-id space).
 */

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  describeIfRls,
  createServiceClient,
  createSignedInRlsUser,
  signInAs,
  RLS_TEST_PASSWORD,
  type SeededUser,
} from '../index';

describeIfRls('divergent identity RLS lock — profiles.id ≠ auth uid', () => {
  const service = createServiceClient();
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let teacher: SeededUser;
  let studentAuthUid = '';
  let studentProfileId = '';
  let studentClient: SupabaseClient;
  let assignmentId = '';

  beforeAll(async () => {
    teacher = await createSignedInRlsUser(service, 'teacher', `div-${tag}`);

    // 1. Create the auth user (handle_new_user creates a profile row).
    const email = `rls-student-div-${tag}@guitarcrm.local`;
    const created = await service.auth.admin.createUser({
      email,
      password: RLS_TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { isTest: true },
    });
    if (created.error || !created.data.user) {
      throw new Error(`createUser(${email}) failed: ${created.error?.message ?? 'no user'}`);
    }
    studentAuthUid = created.data.user.id;

    // 2. FORCE divergence even on a legacy stack (whose trigger sets
    //    id = auth uid): drop the trigger-created row, insert a fresh one
    //    with an unrelated random PK.
    const del = await service.from('profiles').delete().eq('user_id', studentAuthUid);
    if (del.error) throw new Error(`delete trigger profile failed: ${del.error.message}`);

    studentProfileId = randomUUID();
    const ins = await service.from('profiles').insert({
      id: studentProfileId,
      user_id: studentAuthUid,
      email,
      full_name: `RLS divergent student ${tag}`,
      is_student: true,
      is_development: true,
    });
    if (ins.error) throw new Error(`insert divergent profile failed: ${ins.error.message}`);

    // 3. The teacher (RLS-real client) creates an assignment for the PROFILE id.
    const { data, error } = await teacher.client
      .from('assignments')
      .insert({
        teacher_id: teacher.id,
        student_id: studentProfileId,
        title: 'Divergent identity assignment',
        status: 'not_started',
        checklist: [{ id: 'i1', text: 'Practice the riff', done: false }],
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`teacher insert assignment failed: ${error?.message}`);
    assignmentId = (data as { id: string }).id;

    // 4. Sign in as the divergent student (auth path — email/password).
    studentClient = await signInAs(email, RLS_TEST_PASSWORD);
  }, 30_000);

  afterAll(async () => {
    // deleteUser takes AUTH uids; profiles cascade via profiles.user_id,
    // assignments cascade via their profile FKs.
    const authUids = [studentAuthUid, teacher?.userId].filter(Boolean) as string[];
    await Promise.allSettled(authUids.map((uid) => service.auth.admin.deleteUser(uid)));
  });

  it('sanity: the profile id and the auth uid actually diverge', () => {
    expect(studentProfileId).not.toBe(studentAuthUid);
    expect(studentProfileId).toHaveLength(36);
  });

  it('the student SEES their assignment (select policy in profile-id space)', async () => {
    const { data, error } = await studentClient
      .from('assignments')
      .select('id, student_id')
      .eq('id', assignmentId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(assignmentId);
    expect(data?.student_id).toBe(studentProfileId);
  });

  it('the student can toggle a checklist item via student_toggle_checklist_item', async () => {
    const { error } = await studentClient.rpc('student_toggle_checklist_item', {
      p_assignment_id: assignmentId,
      p_item_id: 'i1',
      p_done: true,
    });
    expect(error).toBeNull();

    const { data } = await service
      .from('assignments')
      .select('checklist')
      .eq('id', assignmentId)
      .single();
    const checklist = (data?.checklist ?? []) as Array<{ id: string; done: boolean }>;
    expect(checklist.find((i) => i.id === 'i1')?.done).toBe(true);
  });

  it('the student can advance status via student_update_assignment_status', async () => {
    const { error } = await studentClient.rpc('student_update_assignment_status', {
      p_assignment_id: assignmentId,
      p_new_status: 'in_progress',
    });
    expect(error).toBeNull();

    const { data } = await service
      .from('assignments')
      .select('status')
      .eq('id', assignmentId)
      .single();
    expect(data?.status).toBe('in_progress');
  });

  it('the student SEES the history; changed_by is their PROFILE id', async () => {
    const { data, error } = await studentClient
      .from('assignment_history')
      .select('change_type, changed_by')
      .eq('assignment_id', assignmentId)
      .order('changed_at', { ascending: true });
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBeGreaterThanOrEqual(2); // created + status_changed

    const statusChange = data?.find((r) => r.change_type === 'status_changed');
    expect(statusChange?.changed_by).toBe(studentProfileId);
    expect(statusChange?.changed_by).not.toBe(studentAuthUid);
  });
});
