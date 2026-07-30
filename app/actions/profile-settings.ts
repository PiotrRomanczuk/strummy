'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { PhoneSchema } from '@/schemas/shared/phone';
import { logger } from '@/lib/logger';
import { LOCALES, LOCALE_COOKIE, type AppLocale } from '@/i18n/locales';

const ProfileUpdateSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(120),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: PhoneSchema,
  avatar_url: z.union([z.string().url('Enter a valid URL'), z.literal('')]).optional(),
});

export type ProfileSettingsState = {
  saved?: boolean;
  error?: string;
};

const opt = (v: FormDataEntryValue | null): string | undefined => {
  const s = String(v ?? '').trim();
  return s === '' ? undefined : s;
};

/**
 * Self-edit of the caller's own Profile (RLS-scoped to auth.uid()). Covers
 * full_name + first/last name + phone + avatar_url — the same field set the
 * self route PUT /api/users/profile supports. Only sent fields are written.
 */
export async function updateProfileNameAction(
  _prev: ProfileSettingsState,
  formData: FormData
): Promise<ProfileSettingsState> {
  const parsed = ProfileUpdateSchema.safeParse({
    full_name: String(formData.get('full_name') ?? '').trim(),
    first_name: opt(formData.get('first_name')),
    last_name: opt(formData.get('last_name')),
    phone: opt(formData.get('phone')),
    avatar_url: opt(formData.get('avatar_url')),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not signed in.' };
  }

  const updates: Record<string, unknown> = { full_name: parsed.data.full_name };
  if (parsed.data.first_name !== undefined) updates.first_name = parsed.data.first_name;
  if (parsed.data.last_name !== undefined) updates.last_name = parsed.data.last_name;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.avatar_url !== undefined) {
    updates.avatar_url = parsed.data.avatar_url === '' ? null : parsed.data.avatar_url;
  }

  // `.select('id')` makes a 0-row update detectable — without it supabase-js
  // reports success even when the WHERE clause (or RLS) matched nothing, and
  // the UI shows "✓ Saved" for a write that never happened.
  // `profiles.id` is an independent PK from `auth.uid()` since the July 27
  // rebuild — `user.id` here is the auth session id, so match on `user_id`.
  const { data: updatedRows, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    logger.warn('[profile-settings] update error', { error: error.message, code: error.code });
    return { error: 'Could not save. Try again.' };
  }
  if (!updatedRows || updatedRows.length === 0) {
    logger.warn('[profile-settings] update matched no rows', { userId: user.id });
    return { error: 'Could not save. Try again.' };
  }

  revalidatePath('/dashboard/settings');
  return { saved: true };
}

const LocaleSchema = z.enum(LOCALES);

/**
 * Sets the display language. Always writes the NEXT_LOCALE cookie (works for
 * logged-out visitors on the landing page); additionally persists to
 * profiles.locale when signed in, so the preference follows the user across
 * devices/browsers.
 */
export async function updateLocaleAction(locale: AppLocale): Promise<{ error?: string }> {
  const parsed = LocaleSchema.safeParse(locale);
  if (!parsed.success) {
    return { error: 'Invalid language.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: updatedRows, error } = await supabase
      .from('profiles')
      .update({ locale: parsed.data })
      .eq('user_id', user.id)
      .select('id');

    if (error || !updatedRows || updatedRows.length === 0) {
      logger.warn('[profile-settings] locale update error', {
        error: error?.message,
        userId: user.id,
      });
      return { error: 'Could not save. Try again.' };
    }
  }

  const store = await cookies();
  store.set(LOCALE_COOKIE, parsed.data, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
  return {};
}
