import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

import { getBillingSettings, getLessonPackages } from './billing-queries';
import { packagePriceCents } from './package-price';
import {
  toLedgerEntry,
  toPurchase,
  type LedgerEntry,
  type StudentPurchase,
} from './student-billing.helpers';

const log = createLogger('student-billing-queries');

/** A package the teacher can sell to this student, priced for them. */
export type SellablePackage = { id: string; name: string; lessonCount: number; priceCents: number };

export type StudentBilling = {
  /** Lessons left; negative = lessons held and not paid for yet. */
  balance: number;
  /** False until the teacher sets a billing start date — held lessons are not counted yet. */
  isCounting: boolean;
  purchases: StudentPurchase[];
  ledger: LedgerEntry[];
  packages: SellablePackage[];
};

const LEDGER_LIMIT = 50;

/**
 * Everything the "Rozliczenia" tab shows for one student, read as the signed-in
 * teacher — RLS decides what is visible. The balance is summed from every
 * ledger row, not only the ones listed.
 */
export async function getStudentBilling(
  studentId: string,
  teacherProfileId: string
): Promise<StudentBilling> {
  const supabase = await createClient();
  const [deltas, ledger, purchases, student, packages, settings] = await Promise.all([
    supabase.from('lesson_credit_entries').select('delta').eq('student_id', studentId),
    supabase
      .from('lesson_credit_entries')
      .select(
        'id, delta, reason, created_at, note, lesson:lessons(scheduled_at), purchase:package_purchases(description)'
      )
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(LEDGER_LIMIT),
    supabase
      .from('package_purchases')
      .select(
        'id, description, lesson_count, amount_cents, status, payment_method, due_on, paid_at, created_at'
      )
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('lesson_rate').eq('id', studentId).maybeSingle(),
    getLessonPackages(teacherProfileId),
    getBillingSettings(teacherProfileId),
  ]);

  const failed = [deltas, ledger, purchases, student].find((result) => result.error);
  if (failed?.error) log.error('Failed to load student billing', { error: failed.error });

  const lessonRate = student.data?.lesson_rate ?? null;
  return {
    balance: (deltas.data ?? []).reduce((sum, row) => sum + row.delta, 0),
    isCounting: settings.billingStartOn !== null,
    purchases: (purchases.data ?? []).map(toPurchase),
    ledger: (ledger.data ?? []).map(toLedgerEntry),
    packages: packages
      .filter((pkg) => pkg.isActive)
      .map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        lessonCount: pkg.lessonCount,
        priceCents: packagePriceCents({
          lessonRate,
          lessonCount: pkg.lessonCount,
          priceCents: pkg.priceCents,
        }),
      })),
  };
}
