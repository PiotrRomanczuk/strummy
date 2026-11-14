import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('billing-queries');

export type LessonPackage = {
  id: string;
  name: string;
  lessonCount: number;
  priceCents: number;
  isActive: boolean;
};

export type BillingSettings = {
  /** ISO date (YYYY-MM-DD). Null: lessons do not touch the balance yet. */
  billingStartOn: string | null;
  paymentTermDays: number;
};

export const DEFAULT_PAYMENT_TERM_DAYS = 7;

/** A teacher's price list, active packages first. RLS scopes the read. */
export async function getLessonPackages(teacherProfileId: string): Promise<LessonPackage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lesson_packages')
    .select('id, name, lesson_count, price_cents, is_active')
    .eq('teacher_id', teacherProfileId)
    .order('is_active', { ascending: false })
    .order('lesson_count', { ascending: true });

  if (error) {
    log.error('Failed to load lesson packages', { error });
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    lessonCount: row.lesson_count,
    priceCents: row.price_cents,
    isActive: row.is_active,
  }));
}

/** A teacher's billing settings; defaults when the teacher has never saved any. */
export async function getBillingSettings(teacherProfileId: string): Promise<BillingSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('billing_settings')
    .select('billing_start_on, payment_term_days')
    .eq('teacher_id', teacherProfileId)
    .maybeSingle();

  if (error) log.error('Failed to load billing settings', { error });
  return {
    billingStartOn: data?.billing_start_on ?? null,
    paymentTermDays: data?.payment_term_days ?? DEFAULT_PAYMENT_TERM_DAYS,
  };
}
