import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

import {
  toLedgerEntry,
  toPurchase,
  type LedgerEntry,
  type StudentPurchase,
} from './student-billing.helpers';

const log = createLogger('student-account-queries');

const LEDGER_LIMIT = 50;

const PURCHASE_COLUMNS =
  'id, description, lesson_count, amount_cents, status, payment_method, payment_url, due_on, paid_at, created_at';

const LEDGER_COLUMNS =
  'id, delta, reason, created_at, note, lesson:lessons(scheduled_at), purchase:package_purchases(description)';

export type StudentAccount = {
  /** Lessons left; negative = lessons held and not paid for yet. Summed from every ledger row. */
  balance: number;
  /** The latest ledger rows, newest first. */
  ledger: LedgerEntry[];
  purchases: StudentPurchase[];
  lessonRate: number | null;
  /** False while nothing was ever sold to or charged against this student. */
  hasActivity: boolean;
};

/**
 * One student's balance, ledger and packages, read as whoever is signed in —
 * the teacher, the student, or a parent. RLS decides what is visible, so the
 * same query serves all three.
 */
export async function getStudentAccount(studentId: string): Promise<StudentAccount> {
  const supabase = await createClient();
  const [deltas, ledger, purchases, student] = await Promise.all([
    supabase.from('lesson_credit_entries').select('delta').eq('student_id', studentId),
    supabase
      .from('lesson_credit_entries')
      .select(LEDGER_COLUMNS)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(LEDGER_LIMIT),
    supabase
      .from('package_purchases')
      .select(PURCHASE_COLUMNS)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('lesson_rate').eq('id', studentId).maybeSingle(),
  ]);

  const failed = [deltas, ledger, purchases, student].find((result) => result.error);
  if (failed?.error) log.error('Failed to load student account', { error: failed.error });

  const rows = deltas.data ?? [];
  const purchaseRows = (purchases.data ?? []).map(toPurchase);
  return {
    balance: rows.reduce((sum, row) => sum + row.delta, 0),
    ledger: (ledger.data ?? []).map(toLedgerEntry),
    purchases: purchaseRows,
    lessonRate: student.data?.lesson_rate ?? null,
    hasActivity: rows.length > 0 || purchaseRows.length > 0,
  };
}
