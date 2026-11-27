import { createAdminClient } from '@/lib/supabase/admin';
import { CalcomTeacherProfileIdSchema } from '@/schemas/CalcomWebhookSchema';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * The teacher every Cal.com booking is assigned to, named explicitly by
 * `CALCOM_TEACHER_PROFILE_ID` (a profile id, not a secret; set per
 * environment on Vercel). Fails rather than guessing: before this, the lesson
 * went to whichever teacher/admin row the database returned first.
 */
export async function resolveCalcomTeacherId(admin: AdminClient): Promise<string> {
  const parsed = CalcomTeacherProfileIdSchema.safeParse(
    process.env.CALCOM_TEACHER_PROFILE_ID?.trim()
  );
  if (!parsed.success) {
    throw new Error('Cal.com webhook: CALCOM_TEACHER_PROFILE_ID is not set to a profile id');
  }

  const { data, error } = await admin
    .from('user_roles')
    .select('profile_id')
    .eq('profile_id', parsed.data)
    .in('role', ['teacher', 'admin'])
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Cal.com webhook: CALCOM_TEACHER_PROFILE_ID is not a teacher or admin');
  }
  return parsed.data;
}
