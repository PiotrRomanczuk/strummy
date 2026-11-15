import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type ParentAccountStatus = 'active' | 'invited' | 'not_invited';

export type StudentParent = {
  /** The linked parent profile; null when nobody is linked yet. */
  linked: {
    id: string;
    name: string | null;
    email: string | null;
    status: ParentAccountStatus;
  } | null;
  /** What the intake form recorded about the parent — prefills the invite. */
  suggestedName: string | null;
  suggestedEmail: string | null;
};

/**
 * The student's parent as the teacher sees it on the student page. Read with
 * the teacher's session: `profiles_select_staff` covers both rows, and the
 * signed-in check is the same admin/teacher-gated RPC the student header uses.
 */
export async function getStudentParent(studentId: string): Promise<StudentParent> {
  const supabase = await createClient();
  const { data: student, error } = await supabase
    .from('profiles')
    .select('parent_id, parent_name, parent_email')
    .eq('id', studentId)
    .maybeSingle();
  if (error) logger.warn('[student-parent] student lookup failed', { error: error.message });

  const empty = {
    linked: null,
    suggestedName: student?.parent_name ?? null,
    suggestedEmail: student?.parent_email ?? null,
  };
  if (!student?.parent_id) return empty;

  const [{ data: parent }, { data: signedIn }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, invite_email, is_shadow, user_id')
      .eq('id', student.parent_id)
      .maybeSingle(),
    supabase.rpc('profiles_signed_in', { p_profile_ids: [student.parent_id] }),
  ]);
  if (!parent) return empty;

  const status: ParentAccountStatus =
    (signedIn ?? []).length > 0 ? 'active' : parent.user_id ? 'invited' : 'not_invited';
  return {
    ...empty,
    linked: {
      id: parent.id,
      name: parent.full_name,
      email: parent.is_shadow ? parent.invite_email : parent.email,
      status,
    },
  };
}
