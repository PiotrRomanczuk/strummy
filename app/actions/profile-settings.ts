'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const ProfileUpdateSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(120),
});

export type ProfileSettingsState = {
  saved?: boolean;
  error?: string;
};

export async function updateProfileNameAction(
  _prev: ProfileSettingsState,
  formData: FormData
): Promise<ProfileSettingsState> {
  const parsed = ProfileUpdateSchema.safeParse({
    full_name: String(formData.get('full_name') ?? '').trim(),
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

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.full_name })
    .eq('id', user.id);

  if (error) {
    logger.warn('[profile-settings] update error', {
      error: error.message,
      code: error.code,
    });
    return { error: 'Could not save. Try again.' };
  }

  revalidatePath('/dashboard/settings');
  return { saved: true };
}
