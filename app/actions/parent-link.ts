'use server';

import { revalidatePath } from 'next/cache';

import { sendUserInvite } from '@/app/dashboard/actions';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createLogger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ParentInviteSchema,
  StudentIdSchema,
  type ParentInviteInput,
} from '@/schemas/ParentLinkSchema';

const log = createLogger('parent-link');

export type ParentLinkResult =
  { ok: true; invited: boolean; inviteError?: string } | { error: string };

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Teachers and admins only. Profiles are written with the service role —
 * `profiles_update_own` lets a teacher change no one else's row — so this check
 * is the whole access control for the actions below.
 */
async function requireStaff(): Promise<{ error: string } | null> {
  const { user, isAdmin, isTeacher, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };
  if (!user) return { error: 'Unauthorized' };
  if (!isAdmin && !isTeacher) return { error: 'Only teachers and admins can link parents' };
  return null;
}

/**
 * The profile that will be the parent: an existing parent with this address,
 * or a new placeholder (shadow) profile the invite will claim. An address that
 * already belongs to a student or a member of staff is refused — linking it
 * would make that person a parent by mistake.
 */
async function resolveParentProfile(
  admin: AdminClient,
  fullName: string,
  email: string
): Promise<{ id: string } | { error: string }> {
  for (const column of ['email', 'invite_email'] as const) {
    const { data } = await admin
      .from('profiles')
      .select('id, is_parent, is_student, is_teacher, is_admin')
      .eq(column, email)
      .limit(1)
      .maybeSingle();
    if (!data) continue;
    if (data.is_student || data.is_teacher || data.is_admin) {
      return { error: 'This email belongs to a student or a teacher' };
    }
    if (!data.is_parent) await admin.from('profiles').update({ is_parent: true }).eq('id', data.id);
    return { id: data.id };
  }

  const { data: created, error } = await admin
    .from('profiles')
    .insert({ full_name: fullName, invite_email: email, is_shadow: true, is_parent: true })
    .select('id')
    .single();
  if (error || !created) {
    log.error('Failed to create the parent profile', { error });
    return { error: 'Could not create the parent profile' };
  }
  return { id: created.id };
}

/** Send (or re-send) the invite; a failure is reported, never thrown — the link already stands. */
async function invite(parentId: string): Promise<{ invited: boolean; inviteError?: string }> {
  try {
    await sendUserInvite(parentId);
    return { invited: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invite failed';
    // An account that already signed in needs no invite: linking was the whole job.
    if (message.includes('already signed in')) return { invited: false };
    log.warn('Parent invite failed', { message });
    return { invited: false, inviteError: message };
  }
}

/** Link a parent to a student by e-mail and send them the invite to Strummy. */
export async function inviteParent(input: ParentInviteInput): Promise<ParentLinkResult> {
  const denied = await requireStaff();
  if (denied) return denied;
  const parsed = ParentInviteSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid name or email' };
  const { studentId, fullName, email } = parsed.data;

  const admin = createAdminClient();
  const { data: student } = await admin
    .from('profiles')
    .select('id, email, invite_email')
    .eq('id', studentId)
    .eq('is_student', true)
    .maybeSingle();
  if (!student) return { error: 'Student not found' };
  if ([student.email, student.invite_email].some((own) => own?.toLowerCase() === email)) {
    return { error: "This is the student's own email" };
  }

  const parent = await resolveParentProfile(admin, fullName, email);
  if ('error' in parent) return parent;

  const { error: linkError } = await admin
    .from('profiles')
    .update({ parent_id: parent.id })
    .eq('id', studentId);
  if (linkError) {
    log.error('Failed to link the parent', { error: linkError });
    return { error: 'Could not link the parent' };
  }

  const sent = await invite(parent.id);
  revalidatePath(`/dashboard/users/${studentId}`);
  return { ok: true, ...sent };
}

/** Send the linked parent's invite again (an expired or lost e-mail). */
export async function resendParentInvite(input: { studentId: string }): Promise<ParentLinkResult> {
  const denied = await requireStaff();
  if (denied) return denied;
  const parsed = StudentIdSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid request' };

  const { data: student } = await createAdminClient()
    .from('profiles')
    .select('parent_id')
    .eq('id', parsed.data.studentId)
    .maybeSingle();
  if (!student?.parent_id) return { error: 'No parent linked' };

  const sent = await invite(student.parent_id);
  return { ok: true, ...sent };
}

/** Remove the link. The parent's account stays; they just stop seeing this student. */
export async function unlinkParent(input: { studentId: string }): Promise<ParentLinkResult> {
  const denied = await requireStaff();
  if (denied) return denied;
  const parsed = StudentIdSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid request' };

  const { error } = await createAdminClient()
    .from('profiles')
    .update({ parent_id: null })
    .eq('id', parsed.data.studentId);
  if (error) {
    log.error('Failed to unlink the parent', { error });
    return { error: 'Could not unlink the parent' };
  }
  revalidatePath(`/dashboard/users/${parsed.data.studentId}`);
  return { ok: true, invited: false };
}
