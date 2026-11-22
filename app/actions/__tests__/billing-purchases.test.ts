/**
 * Unit tests for selling a package, recording its payment and withdrawing it.
 * The writes go through the service role, so what matters here is who may
 * call, that every write is pinned to the caller's profile, and that a payment
 * credits the lessons exactly once however often it is retried.
 *
 * @see app/actions/billing-purchases.ts
 */

import {
  cancelPackagePurchase,
  createPackagePurchase,
  markPackagePurchasePaid,
} from '../billing-purchases';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: jest.fn() }));
jest.mock('@/lib/auth/test-account-guard', () => ({ guardTestAccountMutation: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

type Call = { table: string; op: string; values?: unknown; filters: Array<[string, unknown]> };
const calls: Call[] = [];
/** What each table answers to a read (`maybeSingle` / `single`), in order. */
const reads: Record<string, Array<{ data: unknown; error?: unknown }>> = {};
let insertResult: { data?: unknown; error: unknown };
let updateResult: { data?: unknown; error: unknown };

const builder = (table: string) => {
  const call: Call = { table, op: 'select', filters: [] };
  calls.push(call);
  const next = () => {
    if (call.op === 'insert') return Promise.resolve(insertResult);
    if (call.op === 'update') return Promise.resolve(updateResult);
    return Promise.resolve(reads[table]?.shift() ?? { data: null, error: null });
  };
  const chain: Record<string, unknown> = {
    insert: (values: unknown) => {
      Object.assign(call, { op: 'insert', values });
      return chain;
    },
    update: (values: unknown) => {
      Object.assign(call, { op: 'update', values });
      return chain;
    },
    select: () => chain,
    limit: () => chain,
    is: (column: string, value: unknown) => {
      call.filters.push([column, value]);
      return chain;
    },
    eq: (column: string, value: unknown) => {
      call.filters.push([column, value]);
      return chain;
    },
    maybeSingle: next,
    single: next,
    then: (resolve: (value: unknown) => unknown) => next().then(resolve),
  };
  return chain;
};
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: (table: string) => builder(table) })),
}));

const TEACHER = 'profile-teacher';
const STUDENT = '9a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const PACKAGE = '3f2b1c9e-8a47-4d1b-9c55-0a1b2c3d4e5f';
const PURCHASE = '5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';

const asRole = (role: Partial<{ isAdmin: boolean; isTeacher: boolean }>) =>
  (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
    user: { id: 'auth-1' },
    profileId: TEACHER,
    isAdmin: false,
    isTeacher: false,
    isDevelopment: false,
    ...role,
  });

const writes = (op: string, table?: string) =>
  calls.filter((c) => c.op === op && (!table || c.table === table));

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  for (const key of Object.keys(reads)) delete reads[key];
  insertResult = { data: { id: PURCHASE }, error: null };
  updateResult = { data: null, error: null };
  (guardTestAccountMutation as jest.Mock).mockReturnValue(null);
  asRole({ isTeacher: true });
});

describe('createPackagePurchase', () => {
  const sellable = (lessonRate: number | null) => {
    reads.lesson_packages = [
      { data: { id: PACKAGE, name: 'Karnet 4', lesson_count: 4, price_cents: 48000 } },
    ];
    reads.profiles = [{ data: { id: STUDENT, lesson_rate: lessonRate } }];
    reads.billing_settings = [{ data: { payment_term_days: 14 } }];
    reads.lessons = [{ data: { id: 'lesson-1' } }];
  };

  it('sells at the list price, copied into the sale, with a due date', async () => {
    sellable(null);
    await expect(
      createPackagePurchase({ studentId: STUDENT, packageId: PACKAGE })
    ).resolves.toEqual({ purchaseId: PURCHASE });
    const [insert] = writes('insert', 'package_purchases');
    expect(insert.values).toMatchObject({
      teacher_id: TEACHER,
      student_id: STUDENT,
      payer_id: STUDENT,
      package_id: PACKAGE,
      description: 'Karnet 4',
      lesson_count: 4,
      amount_cents: 48000,
      invoice_status: 'skipped',
    });
    expect((insert.values as { due_on: string }).due_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("prices by the student's own rate when there is one", async () => {
    sellable(100);
    await createPackagePurchase({ studentId: STUDENT, packageId: PACKAGE });
    expect(writes('insert', 'package_purchases')[0].values).toMatchObject({ amount_cents: 40000 });
  });

  it("only sells the caller's own active package", async () => {
    sellable(null);
    await createPackagePurchase({ studentId: STUDENT, packageId: PACKAGE });
    const packageRead = calls.find((c) => c.table === 'lesson_packages');
    expect(packageRead?.filters).toEqual(
      expect.arrayContaining([
        ['teacher_id', TEACHER],
        ['is_active', true],
      ])
    );
  });

  it('refuses a package that is not on sale, without writing', async () => {
    reads.profiles = [{ data: { id: STUDENT, lesson_rate: null } }];
    await expect(
      createPackagePurchase({ studentId: STUDENT, packageId: PACKAGE })
    ).resolves.toEqual({ error: 'Package not found' });
    expect(writes('insert')).toHaveLength(0);
  });

  it('refuses a profile that is not a student', async () => {
    reads.lesson_packages = [
      { data: { id: PACKAGE, name: 'Karnet 4', lesson_count: 4, price_cents: 48000 } },
    ];
    await expect(
      createPackagePurchase({ studentId: STUDENT, packageId: PACKAGE })
    ).resolves.toEqual({ error: 'Student not found' });
    const profileRead = calls.find((c) => c.table === 'profiles');
    expect(profileRead?.filters).toEqual(
      expect.arrayContaining([
        ['id', STUDENT],
        ['is_student', true],
      ])
    );
  });

  it("refuses a teacher's sale to a student they have no lesson with, without writing", async () => {
    sellable(null);
    reads.lessons = [];
    await expect(
      createPackagePurchase({ studentId: STUDENT, packageId: PACKAGE })
    ).resolves.toEqual({ error: 'Student not found' });
    const lessonRead = calls.find((c) => c.table === 'lessons');
    expect(lessonRead?.filters).toEqual(
      expect.arrayContaining([
        ['teacher_id', TEACHER],
        ['student_id', STUDENT],
        ['deleted_at', null],
      ])
    );
    expect(writes('insert')).toHaveLength(0);
  });

  it('lets an admin sell to any student without checking lessons', async () => {
    asRole({ isAdmin: true });
    sellable(null);
    await expect(
      createPackagePurchase({ studentId: STUDENT, packageId: PACKAGE })
    ).resolves.toEqual({ purchaseId: PURCHASE });
    expect(calls.some((c) => c.table === 'lessons')).toBe(false);
  });

  it('refuses a student caller', async () => {
    asRole({});
    await expect(
      createPackagePurchase({ studentId: STUDENT, packageId: PACKAGE })
    ).resolves.toEqual({ error: 'Only teachers and admins can manage billing' });
    expect(calls).toHaveLength(0);
  });
});

describe('markPackagePurchasePaid', () => {
  const paidPurchase = {
    id: PURCHASE,
    teacher_id: TEACHER,
    student_id: STUDENT,
    lesson_count: 4,
    status: 'paid',
  };

  it("marks the caller's pending purchase paid and credits its lessons", async () => {
    reads.package_purchases = [{ data: paidPurchase }];
    await expect(
      markPackagePurchasePaid({ purchaseId: PURCHASE, method: 'cash' })
    ).resolves.toEqual({ purchaseId: PURCHASE });

    const [update] = writes('update', 'package_purchases');
    expect(update.values).toMatchObject({ status: 'paid', payment_method: 'cash' });
    expect(update.filters).toEqual([
      ['id', PURCHASE],
      ['teacher_id', TEACHER],
      ['status', 'pending'],
    ]);
    expect(writes('insert', 'lesson_credit_entries')[0].values).toMatchObject({
      student_id: STUDENT,
      delta: 4,
      reason: 'purchase',
      purchase_id: PURCHASE,
    });
  });

  it('treats an existing credit as done — a second click credits nothing more', async () => {
    reads.package_purchases = [{ data: paidPurchase }];
    insertResult = { error: { code: '23505', message: 'duplicate key' } };
    await expect(
      markPackagePurchasePaid({ purchaseId: PURCHASE, method: 'transfer' })
    ).resolves.toEqual({ purchaseId: PURCHASE });
  });

  it('refuses a cancelled purchase without crediting', async () => {
    reads.package_purchases = [{ data: { ...paidPurchase, status: 'cancelled' } }];
    await expect(
      markPackagePurchasePaid({ purchaseId: PURCHASE, method: 'transfer' })
    ).resolves.toEqual({ error: 'Purchase is not awaiting payment' });
    expect(writes('insert')).toHaveLength(0);
  });

  it("reports another teacher's purchase as not found", async () => {
    await expect(
      markPackagePurchasePaid({ purchaseId: PURCHASE, method: 'transfer' })
    ).resolves.toEqual({ error: 'Purchase not found' });
    expect(writes('insert')).toHaveLength(0);
  });

  it('reports a failed credit', async () => {
    reads.package_purchases = [{ data: paidPurchase }];
    insertResult = { error: { code: '42501', message: 'denied' } };
    await expect(
      markPackagePurchasePaid({ purchaseId: PURCHASE, method: 'transfer' })
    ).resolves.toEqual({ error: 'denied' });
  });

  it.each(['infakt', 'card', ''])('refuses the method %p', async (method) => {
    await expect(
      markPackagePurchasePaid({ purchaseId: PURCHASE, method: method as 'cash' })
    ).resolves.toEqual({ error: 'Invalid request' });
    expect(calls).toHaveLength(0);
  });
});

describe('cancelPackagePurchase', () => {
  it("withdraws the caller's pending purchase", async () => {
    updateResult = { data: { id: PURCHASE, student_id: STUDENT }, error: null };
    await expect(cancelPackagePurchase({ purchaseId: PURCHASE })).resolves.toEqual({
      purchaseId: PURCHASE,
    });
    const [update] = writes('update', 'package_purchases');
    expect(update.values).toEqual({ status: 'cancelled' });
    expect(update.filters).toContainEqual(['status', 'pending']);
    expect(update.filters).toContainEqual(['teacher_id', TEACHER]);
  });

  it("refuses a purchase that is paid or not the caller's", async () => {
    await expect(cancelPackagePurchase({ purchaseId: PURCHASE })).resolves.toEqual({
      error: 'Purchase is not awaiting payment',
    });
  });
});
