'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { requireBillingTeacher } from '@/lib/services/billing/billing-auth';
import { parsePlnToCents } from '@/lib/services/billing/package-price';
import {
  BillingSettingsInputSchema,
  LessonPackageActiveSchema,
  LessonPackageInputSchema,
  type BillingSettingsInput,
  type LessonPackageInput,
} from '@/schemas/BillingSchema';

const log = createLogger('billing-settings');

type BillingResult = { ok: true } | { error: string };

const SETTINGS_PATH = '/dashboard/settings';

/** Add a package to the price list, or change one (when `id` is given). */
export async function saveLessonPackage(input: LessonPackageInput): Promise<BillingResult> {
  const auth = await requireBillingTeacher();
  if ('error' in auth) return auth;

  const parsed = LessonPackageInputSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid package' };
  const priceCents = parsePlnToCents(parsed.data.price);
  if (priceCents === null) return { error: 'Invalid price' };

  const values = {
    name: parsed.data.name,
    lesson_count: parsed.data.lessonCount,
    price_cents: priceCents,
  };
  const admin = createAdminClient();
  const { data, error } = parsed.data.id
    ? await admin
        .from('lesson_packages')
        .update(values)
        .eq('id', parsed.data.id)
        .eq('teacher_id', auth.teacherId)
        .select('id')
        .maybeSingle()
    : await admin
        .from('lesson_packages')
        .insert({ ...values, teacher_id: auth.teacherId })
        .select('id')
        .maybeSingle();

  if (error) {
    log.error('Failed to save lesson package', { error });
    return { error: error.message };
  }
  if (!data) return { error: 'Package not found' };

  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

/**
 * Take a package off the price list, or put it back. Packages are never
 * deleted: sold packages keep pointing at them.
 */
export async function setLessonPackageActive(
  id: string,
  isActive: boolean
): Promise<BillingResult> {
  const auth = await requireBillingTeacher();
  if ('error' in auth) return auth;

  const parsed = LessonPackageActiveSchema.safeParse({ id, isActive });
  if (!parsed.success) return { error: 'Invalid request' };

  const { data, error } = await createAdminClient()
    .from('lesson_packages')
    .update({ is_active: parsed.data.isActive })
    .eq('id', parsed.data.id)
    .eq('teacher_id', auth.teacherId)
    .select('id')
    .maybeSingle();

  if (error) {
    log.error('Failed to switch lesson package', { error });
    return { error: error.message };
  }
  if (!data) return { error: 'Package not found' };

  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

/**
 * Save the billing start date and payment term. Moving the start date changes
 * which held lessons count, so the lesson entries of the ledger are rebuilt in
 * the same call — purchases and manual entries are not touched.
 */
export async function saveBillingSettings(input: BillingSettingsInput): Promise<BillingResult> {
  const auth = await requireBillingTeacher();
  if ('error' in auth) return auth;

  const parsed = BillingSettingsInputSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid settings' };

  const admin = createAdminClient();
  const { error } = await admin.from('billing_settings').upsert({
    teacher_id: auth.teacherId,
    billing_start_on: parsed.data.billingStartOn || null,
    payment_term_days: parsed.data.paymentTermDays,
  });
  if (error) {
    log.error('Failed to save billing settings', { error });
    return { error: error.message };
  }

  const { error: rebuildError } = await admin.rpc('rebuild_lesson_credit_entries', {
    p_teacher_id: auth.teacherId,
  });
  if (rebuildError) {
    log.error('Failed to rebuild lesson credit entries', { error: rebuildError });
    return { error: rebuildError.message };
  }

  revalidatePath(SETTINGS_PATH);
  revalidatePath('/dashboard/users');
  return { ok: true };
}
