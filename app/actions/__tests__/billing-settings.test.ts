/**
 * Unit tests for the price-list and billing-settings server actions. The
 * billing tables are written with the service role, so the checks that matter
 * here are who may call and that every write is pinned to the caller's profile.
 *
 * @see app/actions/billing-settings.ts
 */

import {
  saveBillingSettings,
  saveLessonPackage,
  setLessonPackageActive,
} from '../billing-settings';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: jest.fn() }));
jest.mock('@/lib/auth/test-account-guard', () => ({ guardTestAccountMutation: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

type Call = { table: string; op: string; values?: unknown; filters: Array<[string, unknown]> };
const calls: Call[] = [];
const rpc = jest.fn();
let writeResult: { data: unknown; error: unknown };

const builder = (table: string) => {
  const call: Call = { table, op: '', filters: [] };
  calls.push(call);
  const chain: Record<string, unknown> = {
    insert: (values: unknown) => Object.assign(call, { op: 'insert', values }) && chain,
    update: (values: unknown) => Object.assign(call, { op: 'update', values }) && chain,
    upsert: (values: unknown) => {
      Object.assign(call, { op: 'upsert', values });
      return Promise.resolve(writeResult);
    },
    eq: (column: string, value: unknown) => {
      call.filters.push([column, value]);
      return chain;
    },
    select: () => chain,
    maybeSingle: () => Promise.resolve(writeResult),
  };
  return chain;
};
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: (table: string) => builder(table), rpc })),
}));

const TEACHER = 'profile-teacher';
const PACKAGE = '3f2b1c9e-8a47-4d1b-9c55-0a1b2c3d4e5f';
const asRole = (role: Partial<{ isAdmin: boolean; isTeacher: boolean; profileId: string }>) =>
  (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
    user: { id: 'auth-1' },
    profileId: TEACHER,
    isAdmin: false,
    isTeacher: false,
    isDevelopment: false,
    ...role,
  });

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  writeResult = { data: { id: PACKAGE }, error: null };
  rpc.mockResolvedValue({ error: null });
  (guardTestAccountMutation as jest.Mock).mockReturnValue(null);
  asRole({ isTeacher: true });
});

describe('saveLessonPackage', () => {
  it("adds a package under the caller's profile, price in grosze", async () => {
    await expect(
      saveLessonPackage({ name: ' Karnet 4 ', lessonCount: '4', price: '480,50' })
    ).resolves.toEqual({ ok: true });
    expect(calls[0]).toMatchObject({
      table: 'lesson_packages',
      op: 'insert',
      values: { name: 'Karnet 4', lesson_count: 4, price_cents: 48050, teacher_id: TEACHER },
    });
  });

  it("edits only the caller's own package", async () => {
    await saveLessonPackage({ id: PACKAGE, name: 'Karnet 8', lessonCount: 8, price: '900' });
    expect(calls[0].op).toBe('update');
    expect(calls[0].filters).toEqual([
      ['id', PACKAGE],
      ['teacher_id', TEACHER],
    ]);
  });

  it("reports a package that is not the caller's as not found", async () => {
    writeResult = { data: null, error: null };
    await expect(
      saveLessonPackage({ id: PACKAGE, name: 'Karnet 8', lessonCount: 8, price: '900' })
    ).resolves.toEqual({ error: 'Package not found' });
  });

  it.each(['abc', '-1', '12,345'])('refuses the price %p without writing', async (price) => {
    await expect(saveLessonPackage({ name: 'Karnet', lessonCount: 4, price })).resolves.toEqual({
      error: 'Invalid price',
    });
    expect(calls).toHaveLength(0);
  });

  it('refuses a student', async () => {
    asRole({});
    await expect(
      saveLessonPackage({ name: 'Karnet', lessonCount: 4, price: '480' })
    ).resolves.toEqual({ error: 'Only teachers and admins can manage billing' });
    expect(calls).toHaveLength(0);
  });

  it('refuses a demo account', async () => {
    (guardTestAccountMutation as jest.Mock).mockReturnValue({ error: 'blocked' });
    await expect(
      saveLessonPackage({ name: 'Karnet', lessonCount: 4, price: '480' })
    ).resolves.toEqual({ error: 'blocked' });
    expect(calls).toHaveLength(0);
  });
});

describe('setLessonPackageActive', () => {
  it("switches the caller's own package off", async () => {
    await expect(setLessonPackageActive(PACKAGE, false)).resolves.toEqual({ ok: true });
    expect(calls[0]).toMatchObject({ op: 'update', values: { is_active: false } });
    expect(calls[0].filters).toContainEqual(['teacher_id', TEACHER]);
  });

  it('refuses a malformed id', async () => {
    await expect(setLessonPackageActive('nope', false)).resolves.toEqual({
      error: 'Invalid request',
    });
  });
});

describe('saveBillingSettings', () => {
  it('saves the settings and rebuilds the lesson entries for the caller', async () => {
    await expect(
      saveBillingSettings({ billingStartOn: '2026-11-01', paymentTermDays: '14' })
    ).resolves.toEqual({ ok: true });
    expect(calls[0]).toMatchObject({
      table: 'billing_settings',
      op: 'upsert',
      values: { teacher_id: TEACHER, billing_start_on: '2026-11-01', payment_term_days: 14 },
    });
    expect(rpc).toHaveBeenCalledWith('rebuild_lesson_credit_entries', { p_teacher_id: TEACHER });
  });

  it('stores an empty start date as null', async () => {
    await saveBillingSettings({ billingStartOn: '', paymentTermDays: 7 });
    expect(calls[0].values).toMatchObject({ billing_start_on: null });
  });

  it.each([
    { billingStartOn: '01.11.2026', paymentTermDays: 7 },
    { billingStartOn: '', paymentTermDays: 120 },
  ])('refuses %p', async (input) => {
    await expect(saveBillingSettings(input)).resolves.toEqual({ error: 'Invalid settings' });
    expect(calls).toHaveLength(0);
  });

  it('reports a failed rebuild', async () => {
    rpc.mockResolvedValue({ error: { message: 'boom' } });
    await expect(
      saveBillingSettings({ billingStartOn: '2026-11-01', paymentTermDays: 7 })
    ).resolves.toEqual({ error: 'boom' });
  });
});
