'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { requireBillingTeacher } from '@/lib/services/billing/billing-auth';
import { dueOnFor } from '@/lib/services/billing/billing-dates';
import { packagePriceCents } from '@/lib/services/billing/package-price';
import { DEFAULT_PAYMENT_TERM_DAYS } from '@/lib/services/billing/billing-queries';
import {
  PackagePurchaseCreateSchema,
  PackagePurchaseIdSchema,
  PackagePurchasePaidSchema,
  type PackagePurchaseCreateInput,
  type PackagePurchasePaidInput,
} from '@/schemas/BillingSchema';

const log = createLogger('billing-purchases');

type PurchaseResult = { purchaseId: string } | { error: string };

/** Postgres unique_violation: the ledger already holds this purchase's credit. */
const UNIQUE_VIOLATION = '23505';

const revalidateStudent = (studentId: string) => revalidatePath(`/dashboard/users/${studentId}`);

type AdminClient = ReturnType<typeof createAdminClient>;

type Sale = {
  pkg: { id: string; name: string; lesson_count: number; price_cents: number };
  student: { id: string; lesson_rate: number | null };
  paymentTermDays: number;
};

/**
 * Whether the teacher has (had) a lesson with the student — the relation the
 * `lesson_packages_select` policy uses. The writes here bypass RLS, so a
 * non-admin teacher is held to it explicitly.
 */
async function teachesStudent(
  admin: AdminClient,
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const { data } = await admin
    .from('lessons')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/** The package (the caller's own, still on sale), the student and the payment term of a sale. */
async function loadSale(
  admin: AdminClient,
  teacherId: string,
  isAdmin: boolean,
  input: PackagePurchaseCreateInput
): Promise<Sale | { error: string }> {
  const [pkg, student, settings] = await Promise.all([
    admin
      .from('lesson_packages')
      .select('id, name, lesson_count, price_cents')
      .eq('id', input.packageId)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('id, lesson_rate')
      .eq('id', input.studentId)
      .eq('is_student', true)
      .maybeSingle(),
    admin
      .from('billing_settings')
      .select('payment_term_days')
      .eq('teacher_id', teacherId)
      .maybeSingle(),
  ]);
  if (!pkg.data) return { error: 'Package not found' };
  if (!student.data) return { error: 'Student not found' };
  if (!isAdmin && !(await teachesStudent(admin, teacherId, student.data.id))) {
    return { error: 'Student not found' };
  }
  return {
    pkg: pkg.data,
    student: student.data,
    paymentTermDays: settings.data?.payment_term_days ?? DEFAULT_PAYMENT_TERM_DAYS,
  };
}

/**
 * Sell a package from the caller's price list. The price is fixed now — the
 * student's own `lesson_rate` overrides the list price — and copied into the
 * sale, so later price-list edits never change it.
 *
 * `invoice_status` starts as `skipped`: no invoice is issued yet. Once the
 * inFakt connection exists (BIL-11) new sales start as `pending` instead; old
 * sales are deliberately not swept into it, because a package already paid in
 * cash must not get an invoice by surprise.
 */
export async function createPackagePurchase(
  input: PackagePurchaseCreateInput
): Promise<PurchaseResult> {
  const auth = await requireBillingTeacher();
  if ('error' in auth) return auth;
  const parsed = PackagePurchaseCreateSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid request' };

  const admin = createAdminClient();
  const sale = await loadSale(admin, auth.teacherId, auth.isAdmin, parsed.data);
  if ('error' in sale) return sale;
  const { pkg, student, paymentTermDays } = sale;

  const { data, error } = await admin
    .from('package_purchases')
    .insert({
      teacher_id: auth.teacherId,
      student_id: student.id,
      payer_id: student.id,
      package_id: pkg.id,
      description: pkg.name,
      lesson_count: pkg.lesson_count,
      amount_cents: packagePriceCents({
        lessonRate: student.lesson_rate,
        lessonCount: pkg.lesson_count,
        priceCents: pkg.price_cents,
      }),
      due_on: dueOnFor(new Date(), paymentTermDays),
      invoice_status: 'skipped',
      created_by: auth.teacherId,
    })
    .select('id')
    .single();
  if (error || !data) {
    log.error('Failed to create package purchase', { error });
    return { error: error?.message ?? 'Could not save' };
  }

  revalidateStudent(student.id);
  return { purchaseId: data.id };
}

/**
 * Record that a package was paid (transfer, cash, other) and credit its
 * lessons. The status change and the credit are two writes, ordered so that a
 * retry always converges: the purchase becomes `paid` first, then the credit
 * is ensured — and the ledger's unique index turns a second credit for the
 * same purchase into a no-op. Clicking twice, or retrying after a failed
 * credit, leaves exactly one `+N`.
 */
export async function markPackagePurchasePaid(
  input: PackagePurchasePaidInput
): Promise<PurchaseResult> {
  const auth = await requireBillingTeacher();
  if ('error' in auth) return auth;
  const parsed = PackagePurchasePaidSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid request' };

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from('package_purchases')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: parsed.data.method,
    })
    .eq('id', parsed.data.purchaseId)
    .eq('teacher_id', auth.teacherId)
    .eq('status', 'pending');
  if (updateError) {
    log.error('Failed to mark package purchase paid', { error: updateError });
    return { error: updateError.message };
  }

  const { data: purchase } = await admin
    .from('package_purchases')
    .select('id, teacher_id, student_id, lesson_count, status')
    .eq('id', parsed.data.purchaseId)
    .eq('teacher_id', auth.teacherId)
    .maybeSingle();
  if (!purchase) return { error: 'Purchase not found' };
  if (purchase.status !== 'paid') return { error: 'Purchase is not awaiting payment' };

  const { error: creditError } = await admin.from('lesson_credit_entries').insert({
    teacher_id: purchase.teacher_id,
    student_id: purchase.student_id,
    delta: purchase.lesson_count,
    reason: 'purchase',
    purchase_id: purchase.id,
    created_by: auth.teacherId,
  });
  if (creditError && creditError.code !== UNIQUE_VIOLATION) {
    log.error('Failed to credit package purchase', { error: creditError });
    return { error: creditError.message };
  }

  revalidateStudent(purchase.student_id);
  return { purchaseId: purchase.id };
}

/** Withdraw a package that was never paid. A paid one stays: it is in the ledger. */
export async function cancelPackagePurchase(input: {
  purchaseId: string;
}): Promise<PurchaseResult> {
  const auth = await requireBillingTeacher();
  if ('error' in auth) return auth;
  const parsed = PackagePurchaseIdSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid request' };

  const { data, error } = await createAdminClient()
    .from('package_purchases')
    .update({ status: 'cancelled' })
    .eq('id', parsed.data.purchaseId)
    .eq('teacher_id', auth.teacherId)
    .eq('status', 'pending')
    .select('id, student_id')
    .maybeSingle();
  if (error) {
    log.error('Failed to cancel package purchase', { error });
    return { error: error.message };
  }
  if (!data) return { error: 'Purchase is not awaiting payment' };

  revalidateStudent(data.student_id);
  return { purchaseId: data.id };
}
