'use server';

import { revalidatePath } from 'next/cache';

import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { TeacherLeadReplySchema } from '@/schemas/TeacherLeadSchema';

const LEADS_PATH = '/dashboard/admin/teacher-leads';

export type SetTeacherLeadRepliedResult = { success: true } | { success: false; error: string };

/**
 * Mark a `/for-teachers` lead replied (`contacted`) or back to unhandled
 * (`new`). Admin only: checked here for a clear answer, and again by RLS
 * (`teacher_leads_update_admin`), which is the real boundary. The update runs
 * on the user's own session, never the service role. `error` is an i18n key
 * under `TeacherLeads.errors`.
 */
export async function setTeacherLeadReplied(input: unknown): Promise<SetTeacherLeadRepliedResult> {
  const parsed = TeacherLeadReplySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'invalid' };

  const { isAdmin, isDevelopment } = await getUserWithRolesSSR();
  if (!isAdmin) return { success: false, error: 'forbidden' };
  if (guardTestAccountMutation(isDevelopment)) return { success: false, error: 'testAccount' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('teacher_leads')
    .update({ status: parsed.data.isReplied ? 'contacted' : 'new' })
    .eq('id', parsed.data.id)
    .select('id');

  if (error) {
    logger.error('[teacher-leads] status update failed', { message: error.message });
    return { success: false, error: 'failed' };
  }
  // RLS filters rather than errors: zero rows means "not yours" or "gone".
  if (!data?.length) return { success: false, error: 'notFound' };

  revalidatePath(LEADS_PATH);
  return { success: true };
}
