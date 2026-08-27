/**
 * RLS-real coverage for `teacher_leads` (migration
 * `20260826150000_teacher_leads.sql`).
 *
 * This table is unusual in that its writers have no account: the public
 * interest form is filled in by teachers who are evaluating Strummy. The
 * write path is therefore a SECURITY DEFINER function and NOT a table grant,
 * so the properties worth pinning are:
 *   - anon may call `submit_teacher_lead`, and only that,
 *   - anon may not read the table, and neither may a signed-in non-admin —
 *     these rows are other people's contact details,
 *   - submitting twice from one address updates rather than duplicates,
 *   - the hourly cap actually caps.
 *
 * ## Running this suite
 * Auto-skips unless an RLS test DB is configured (see `lib/testing/rls/env.ts`).
 */

import { createClient } from '@supabase/supabase-js';

import {
  createSignedInRlsUser,
  createServiceClient,
  describeIfRls,
  readRlsEnv,
  type SeededUser,
} from '../index';

describeIfRls('teacher_leads RLS — public interest form', () => {
  const service = createServiceClient();
  const runId = Math.random().toString(36).slice(2, 10);
  const leadEmail = `rls-lead-${runId}@example.com`;
  const capEmail = `rls-cap-${runId}@example.com`;

  let anon: ReturnType<typeof createClient>;
  let student: SeededUser;

  beforeAll(async () => {
    const env = readRlsEnv();
    if (!env) throw new Error('RLS env unavailable inside describeIfRls');
    anon = createClient(env.supabaseUrl, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    student = await createSignedInRlsUser(service, 'student', `lead-${runId}`);
  }, 30_000);

  afterAll(async () => {
    await service.from('teacher_leads').delete().in('email', [leadEmail, capEmail]);
    await service.from('auth_rate_limits').delete().in('identifier', [leadEmail, capEmail]);
    if (student?.userId) await service.auth.admin.deleteUser(student.userId);
  });

  it('lets an anonymous visitor submit through the function', async () => {
    const { data, error } = await anon.rpc('submit_teacher_lead', {
      p_full_name: 'Anna Kowalska',
      p_email: leadEmail,
      p_teaching_context: 'private',
      p_student_count: '6-15',
      p_biggest_pain: 'Ginę w notatkach',
      p_wants_contact: true,
      p_source: 'facebook',
      p_locale: 'pl',
    });
    expect(error).toBeNull();
    expect(typeof data).toBe('string');
  });

  it('updates instead of duplicating when the same address submits again', async () => {
    const { error } = await anon.rpc('submit_teacher_lead', {
      p_full_name: 'Anna Kowalska-Nowak',
      p_email: leadEmail.toUpperCase(),
      p_wants_contact: false,
    });
    expect(error).toBeNull();

    const { data } = await service.from('teacher_leads').select('*').eq('email', leadEmail);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.full_name).toBe('Anna Kowalska-Nowak');
    expect(data?.[0]?.wants_contact).toBe(false);
    // Details the second, shorter submission did not carry must survive it.
    expect(data?.[0]?.source).toBe('facebook');
  });

  it('rejects a malformed address', async () => {
    const { error } = await anon.rpc('submit_teacher_lead', {
      p_full_name: 'Broken',
      p_email: 'not-an-email',
    });
    expect(error).not.toBeNull();
  });

  it('caps repeated submissions from one address', async () => {
    for (let i = 0; i < 5; i++) {
      const { error } = await anon.rpc('submit_teacher_lead', {
        p_full_name: 'Spam',
        p_email: capEmail,
      });
      expect(error).toBeNull();
    }
    const { error } = await anon.rpc('submit_teacher_lead', {
      p_full_name: 'Spam',
      p_email: capEmail,
    });
    expect(error?.message).toContain('too many submissions');
  });

  it('hides the table from anon and from a signed-in non-admin', async () => {
    const anonRead = await anon.from('teacher_leads').select('id');
    expect(anonRead.data ?? []).toHaveLength(0);

    const studentRead = await student.client.from('teacher_leads').select('id');
    expect(studentRead.data ?? []).toHaveLength(0);
  });

  it('refuses a direct insert that bypasses the function', async () => {
    const { error } = await anon
      .from('teacher_leads')
      .insert({ full_name: 'Direct', email: `direct-${runId}@example.com` });
    expect(error).not.toBeNull();
  });
});
