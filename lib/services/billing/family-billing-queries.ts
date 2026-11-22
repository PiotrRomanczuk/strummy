import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

import { packagePriceCents } from './package-price';
import { getStudentAccount, type StudentAccount } from './student-account-queries';
import { summariseAccount, type BillingSummary } from './family-billing.helpers';

const log = createLogger('family-billing-queries');

/** A package on the teacher's price list, priced for this student. */
export type PriceListItem = { id: string; name: string; lessonCount: number; priceCents: number };

export type FamilyBilling = StudentAccount & { priceList: PriceListItem[] };

/**
 * The student's or parent's view of one student's billing. RLS shows the
 * student (or the parent, through `is_child_of_parent`) only their own rows, and
 * only the active price list of teachers they have lessons with.
 */
export async function getFamilyBilling(studentId: string): Promise<FamilyBilling> {
  const [account, priceList] = await Promise.all([
    getStudentAccount(studentId),
    getPriceListFor(studentId),
  ]);
  return {
    ...account,
    priceList: priceList.map((pkg) => ({
      ...pkg,
      priceCents: packagePriceCents({
        lessonRate: account.lessonRate,
        lessonCount: pkg.lessonCount,
        priceCents: pkg.priceCents,
      }),
    })),
  };
}

/**
 * Active packages of this student's own teachers. Filtered by teacher, not only
 * by RLS: a parent may read the price lists of every child's teacher, and one
 * child's page should not show another child's teacher.
 */
async function getPriceListFor(studentId: string): Promise<PriceListItem[]> {
  const supabase = await createClient();
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('teacher_id')
    .eq('student_id', studentId)
    .is('deleted_at', null);
  if (lessonsError) log.error('Failed to load the teachers of a student', { error: lessonsError });
  const teacherIds = [...new Set((lessons ?? []).map((row) => row.teacher_id))];
  if (teacherIds.length === 0) return [];

  const { data, error } = await supabase
    .from('lesson_packages')
    .select('id, name, lesson_count, price_cents')
    .in('teacher_id', teacherIds)
    .eq('is_active', true)
    .order('lesson_count', { ascending: true });
  if (error) log.error('Failed to load the price list', { error });
  return (data ?? []).map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    lessonCount: pkg.lesson_count,
    priceCents: pkg.price_cents,
  }));
}

/** The few numbers a home card needs. Null when billing was never used for this student. */
export async function getBillingSummary(studentId: string): Promise<BillingSummary | null> {
  return summariseAccount(await getStudentAccount(studentId));
}
