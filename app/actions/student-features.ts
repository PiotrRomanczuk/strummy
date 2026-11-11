'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { STUDENT_FEATURES } from '@/lib/config/student-features';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const log = createLogger('student-features');

const InputSchema = z.object({
  studentId: z.string().uuid(),
  feature: z.enum(STUDENT_FEATURES),
  isEnabled: z.boolean(),
});

export async function setStudentFeature(input: unknown): Promise<{ error?: string }> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input' };

  const { user, profileId, isAdmin, isTeacher, isDevelopment } = await getUserWithRolesSSR();
  if (!user) return { error: 'Unauthorized' };
  if (!isAdmin && !isTeacher) return { error: 'Forbidden' };

  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const { studentId, feature, isEnabled } = parsed.data;
  const supabase = await createClient();
  const table = supabase.from('student_feature_access');
  const { error } = isEnabled
    ? await table.upsert(
        { student_id: studentId, feature_key: feature, enabled_by: profileId },
        { onConflict: 'student_id,feature_key', ignoreDuplicates: true }
      )
    : await table.delete().eq('student_id', studentId).eq('feature_key', feature);

  if (error) {
    log.error('Could not change student feature', { code: error.code, feature });
    return { error: 'Could not save' };
  }

  revalidatePath(`/dashboard/users/${studentId}`);
  return {};
}
