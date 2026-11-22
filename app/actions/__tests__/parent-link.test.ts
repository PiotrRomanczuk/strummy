/**
 * Linking a parent to a student and inviting them. Profiles are written with
 * the service role, so the checks here are who may call, which addresses are
 * refused, and that a failed invite never undoes the link.
 *
 * @see app/actions/parent-link.ts
 */

import { inviteParent, resendParentInvite, unlinkParent } from '../parent-link';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { sendUserInvite } from '@/app/dashboard/actions';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: jest.fn() }));
jest.mock('@/lib/auth/test-account-guard', () => ({ guardTestAccountMutation: jest.fn() }));
jest.mock('@/app/dashboard/actions', () => ({ sendUserInvite: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

type Call = { op: string; values?: unknown; filters: Array<[string, unknown]> };
const calls: Call[] = [];
/** Answers to reads, in order: first the student lookup, then parent lookups. */
let reads: Array<{ data: unknown }>;
let insertResult: { data: unknown; error: unknown };

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const call: Call = { op: 'select', filters: [] };
      calls.push(call);
      const done = () =>
        Promise.resolve(
          call.op === 'insert'
            ? insertResult
            : call.op === 'update'
              ? { error: null }
              : (reads.shift() ?? { data: null })
        );
      const chain: Record<string, unknown> = {
        select: () => chain,
        insert: (values: unknown) => Object.assign(call, { op: 'insert', values }) && chain,
        update: (values: unknown) => Object.assign(call, { op: 'update', values }) && chain,
        eq: (column: string, value: unknown) => {
          call.filters.push([column, value]);
          return chain;
        },
        limit: () => chain,
        maybeSingle: done,
        single: done,
        then: (resolve: (v: unknown) => unknown) => done().then(resolve),
      };
      return chain;
    },
  }),
}));

const STUDENT = '9a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const PARENT = 'parent-1';
const asRole = (role: Partial<{ isAdmin: boolean; isTeacher: boolean }>) =>
  (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
    user: { id: 'auth-1' },
    isAdmin: false,
    isTeacher: false,
    isDevelopment: false,
    ...role,
  });
const writes = (op: string) => calls.filter((c) => c.op === op);
const studentRow = { data: { id: STUDENT, email: 'kid@example.com', invite_email: null } };
const input = { studentId: STUDENT, fullName: 'Anna Kowalska', email: ' Anna@Example.com ' };

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  reads = [];
  insertResult = { data: { id: PARENT }, error: null };
  (guardTestAccountMutation as jest.Mock).mockReturnValue(null);
  (sendUserInvite as jest.Mock).mockResolvedValue({ success: true });
  asRole({ isTeacher: true });
});

describe('inviteParent', () => {
  it('creates a placeholder parent, links it and sends the invite', async () => {
    reads = [studentRow, { data: null }, { data: null }];
    await expect(inviteParent(input)).resolves.toEqual({ ok: true, invited: true });

    expect(writes('insert')[0].values).toEqual({
      full_name: 'Anna Kowalska',
      invite_email: 'anna@example.com',
      is_shadow: true,
      is_parent: true,
    });
    expect(writes('update')[0]).toMatchObject({
      values: { parent_id: PARENT },
      filters: [['id', STUDENT]],
    });
    expect(sendUserInvite).toHaveBeenCalledWith(PARENT);
  });

  it('links an existing parent instead of creating a second one', async () => {
    reads = [studentRow, { data: { id: 'existing', is_parent: true } }];
    await expect(inviteParent(input)).resolves.toMatchObject({ ok: true });
    expect(writes('insert')).toHaveLength(0);
    expect(writes('update')[0].values).toEqual({ parent_id: 'existing' });
  });

  it('refuses an address that belongs to a student or a teacher', async () => {
    reads = [studentRow, { data: { id: 'x', is_student: true } }];
    await expect(inviteParent(input)).resolves.toEqual({
      error: 'This email belongs to a student or a teacher',
    });
    expect(writes('update')).toHaveLength(0);
    expect(sendUserInvite).not.toHaveBeenCalled();
  });

  it("refuses the student's own address", async () => {
    reads = [{ data: { id: STUDENT, email: 'anna@example.com', invite_email: null } }];
    await expect(inviteParent(input)).resolves.toEqual({
      error: "This is the student's own email",
    });
    expect(writes('insert')).toHaveLength(0);
  });

  it('keeps the link and reports it when the invite fails', async () => {
    reads = [studentRow, { data: null }, { data: null }];
    (sendUserInvite as jest.Mock).mockRejectedValue(new Error('SMTP down'));
    await expect(inviteParent(input)).resolves.toEqual({
      ok: true,
      invited: false,
      inviteError: 'SMTP down',
    });
    expect(writes('update')).toHaveLength(1);
  });

  it('treats a parent who already uses Strummy as linked, without an invite', async () => {
    reads = [studentRow, { data: { id: 'existing', is_parent: true } }];
    (sendUserInvite as jest.Mock).mockRejectedValue(
      new Error('User has already signed in — no invite needed')
    );
    await expect(inviteParent(input)).resolves.toEqual({ ok: true, invited: false });
  });

  it.each([
    [{ ...input, email: 'not-an-email' }],
    [{ ...input, fullName: '  ' }],
    [{ ...input, studentId: 'nope' }],
  ])('refuses invalid input %#', async (bad) => {
    await expect(inviteParent(bad)).resolves.toEqual({ error: 'Invalid name or email' });
    expect(calls).toHaveLength(0);
  });

  it('refuses a student — nobody links a "parent" to themselves', async () => {
    asRole({});
    await expect(inviteParent(input)).resolves.toEqual({
      error: 'Only teachers and admins can link parents',
    });
    expect(calls).toHaveLength(0);
  });

  it('refuses a demo account', async () => {
    (guardTestAccountMutation as jest.Mock).mockReturnValue({ error: 'blocked' });
    await expect(inviteParent(input)).resolves.toEqual({ error: 'blocked' });
    expect(calls).toHaveLength(0);
  });
});

describe('resendParentInvite', () => {
  it("re-sends the linked parent's invite", async () => {
    reads = [{ data: { parent_id: PARENT } }];
    await expect(resendParentInvite({ studentId: STUDENT })).resolves.toEqual({
      ok: true,
      invited: true,
    });
    expect(sendUserInvite).toHaveBeenCalledWith(PARENT);
  });

  it('says so when no parent is linked', async () => {
    reads = [{ data: { parent_id: null } }];
    await expect(resendParentInvite({ studentId: STUDENT })).resolves.toEqual({
      error: 'No parent linked',
    });
  });
});

describe('unlinkParent', () => {
  it('clears the link and nothing else', async () => {
    await expect(unlinkParent({ studentId: STUDENT })).resolves.toEqual({
      ok: true,
      invited: false,
    });
    expect(writes('update')[0]).toMatchObject({
      values: { parent_id: null },
      filters: [['id', STUDENT]],
    });
  });

  it('refuses a student', async () => {
    asRole({});
    await expect(unlinkParent({ studentId: STUDENT })).resolves.toEqual({
      error: 'Only teachers and admins can link parents',
    });
  });
});
