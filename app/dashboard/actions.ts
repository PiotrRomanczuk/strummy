'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logInviteSent, logInviteFailed, logShadowUserCreated } from '@/lib/auth/auth-event-logger';
import type { AuthEvent } from '@/components/dashboard/admin/auth-events/auth-events.helpers';
import { logger } from '@/lib/logger';

/**
 * Prepares an existing auth account to receive an invite: refuses if they have
 * already signed in, otherwise clears email confirmation so the invite link
 * works on an already-confirmed user. No-op for shadow profiles, which have no
 * auth.users row yet.
 *
 * `authUserId` MUST be a profiles.user_id (auth id space) — passing a
 * profiles.id silently addresses the wrong account post-rebuild.
 */
async function prepareAuthUserForInvite(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  authUserId: string
) {
  // Replaces the old `sign_in_count > 0` guard with the equivalent signal that
  // still exists — auth.users.last_sign_in_at.
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(authUserId);

  if (authUser?.user?.last_sign_in_at) {
    throw new Error('User has already signed in — no invite needed');
  }

  await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    email_confirm: false,
  });
}

export async function sendUserInvite(userId: string) {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    throw new Error('Unauthorized: Authentication required');
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('is_admin, is_teacher')
    .eq('user_id', currentUser.id)
    .single();

  if (!callerProfile?.is_admin && !callerProfile?.is_teacher) {
    throw new Error('Unauthorized: Only admins and teachers can send invites');
  }

  // Read with the admin client: the caller's authorization was verified above,
  // and the profiles SELECT policy does not grant teachers read access to a
  // shadow student's row (only UPDATE, via inviteShadowUser).
  const supabaseAdmin = createAdminClient();

  // NOTE: do not re-add `sign_in_count` here. The July 2026 identity rebuild
  // dropped it (along with last_sign_in_at) and it exists only in the stale
  // generated types — selecting it makes Postgres reject the whole query with
  // 42703, which is what broke every invite. `user_id` is the live signal:
  // null == shadow (no auth account yet).
  const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
    .from('profiles')
    .select('email, is_shadow, invite_email, user_id, full_name')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    logger.error('sendUserInvite: admin lookup of target profile failed', {
      userId,
      targetProfileError,
    });
    throw new Error(
      targetProfileError ? `User not found: ${targetProfileError.message}` : 'User not found'
    );
  }

  // Shadow profiles carry a placeholder email; the real address lives in
  // invite_email (set via PATCH /api/users). Prefer it when present so shadows
  // can be invited without first promoting them to a real account.
  const inviteAddress =
    targetProfile.is_shadow && targetProfile.invite_email
      ? targetProfile.invite_email
      : targetProfile.email;

  if (targetProfile.is_shadow && !targetProfile.invite_email) {
    throw new Error('Set an invite email for this unclaimed profile before sending an invite');
  }

  // Both invite_email and email are nullable in the schema, so this can be null
  // — the old hand-written types claimed email was NOT NULL, which is why
  // handing null to Supabase compiled fine.
  if (!inviteAddress) {
    throw new Error('This profile has no email address to invite');
  }

  // `userId` is a profiles.id; auth.admin takes an auth.users id. They are
  // independent id spaces post-rebuild, so always go through user_id.
  if (targetProfile.user_id) {
    await prepareAuthUserForInvite(supabaseAdmin, targetProfile.user_id);
  }

  // APP_URL is a server-only env var (no NEXT_PUBLIC_ prefix) so it is read at
  // runtime, not baked at build time. Fall back to NEXT_PUBLIC_APP_URL for
  // local dev where the server var may not be set.
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000';

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(inviteAddress, {
    redirectTo: `${baseUrl}/accept-invitation`,
  });

  if (inviteError) {
    logInviteFailed(inviteAddress, currentUser.id, inviteError.message);
    throw new Error(`Failed to send invite: ${inviteError.message}`);
  }

  logInviteSent(inviteAddress, currentUser.id, userId);
  return { success: true };
}

/**
 * Invite an unclaimed (shadow) Profile: persist the real invite_email on the
 * shadow row, then dispatch the invite. Teacher/admin only (RLS + sendUserInvite
 * re-check). Surfaces errors to the caller; nothing is swallowed.
 */
export async function inviteShadowUser(userId: string, inviteEmail: string) {
  const trimmed = inviteEmail.trim();
  if (!trimmed) {
    throw new Error('An invite email is required');
  }

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) {
    throw new Error('Unauthorized: Authentication required');
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('is_admin, is_teacher')
    .eq('user_id', currentUser.id)
    .single();

  if (!callerProfile?.is_admin && !callerProfile?.is_teacher) {
    throw new Error('Unauthorized: Only admins and teachers can send invites');
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ invite_email: trimmed })
    .eq('id', userId)
    .eq('is_shadow', true);

  if (updateError) {
    logger.error('Error setting invite_email on shadow profile:', updateError);
    throw new Error('Could not save the invite email — try again');
  }

  return sendUserInvite(userId);
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: 'student' | 'teacher' | 'admin' = 'student',
  phone?: string
) {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    throw new Error('Unauthorized: Authentication required');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', currentUser.id)
    .single();

  if (!profile?.is_admin) {
    throw new Error('Unauthorized: Only admins can invite users');
  }

  const supabaseAdmin = createAdminClient();

  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers.users.find((u) => u.email === email);

  let authUserId = existingUser?.id;

  if (!authUserId) {
    const { data: authData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      logInviteFailed(email, currentUser.id, inviteError.message);
      throw new Error(`Failed to invite user: ${inviteError.message}`);
    }
    if (!authData.user) throw new Error('User creation failed');
    authUserId = authData.user.id;
    logInviteSent(email, currentUser.id, authUserId);
  }

  const updates: Record<string, unknown> = {
    full_name: fullName,
    phone: phone || null,
    is_student: role === 'student',
    is_teacher: role === 'teacher',
    is_admin: role === 'admin',
  };

  // `authUserId` lives in auth.users id-space. handle_new_user mints the
  // Profile row with its own independent gen_random_uuid() id, linked only via
  // user_id — so we must resolve the actual profiles.id before updating,
  // otherwise this update silently matches 0 rows and the admin-picked role
  // (and full_name/phone) are dropped.
  const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .single();

  if (targetProfileError || !targetProfile) {
    logger.error('Error locating profile for invited user:', targetProfileError);
    throw new Error(
      'User was invited but their profile could not be found — role and details were not saved'
    );
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', targetProfile.id);

  if (profileError) logger.error('Error updating profile:', profileError);

  return { success: true, userId: authUserId };
}

export async function findOrCreateAuthUser(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  studentEmail: string
): Promise<string> {
  // 1. Search existing auth users
  let page = 1;
  while (page <= 5) {
    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });

    if (error || !users || users.length === 0) break;

    const found = users.find((u) => u.email?.toLowerCase() === studentEmail.toLowerCase());
    if (found) return found.id;
    page++;
  }

  // 2. Try generateLink, then createUser as fallback
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: studentEmail,
    options: {
      data: { is_student: true },
    },
  });

  if (linkError) {
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      email_confirm: true,
      user_metadata: { is_student: true },
    });

    if (createError) throw new Error(`Failed to create/find user: ${createError.message}`);
    return newUser.user.id;
  }

  if (linkData?.user) {
    if (!linkData.user.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(linkData.user.id, { email_confirm: true });
    }
    return linkData.user.id;
  }

  throw new Error('Could not obtain user ID for shadow user');
}

export async function upsertStudentProfile(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  studentEmail: string
): Promise<void> {
  const { error } = await supabaseAdmin.from('profiles').upsert(
    {
      id: userId,
      email: studentEmail,
      full_name: null,
      is_student: true,
      is_teacher: false,
      is_admin: false,
      is_development: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (!error) return;

  // Handle duplicate email (orphan profile)
  if (error.code === '23505' && error.message?.includes('email')) {
    await cleanupOrphanProfiles(supabaseAdmin, userId, studentEmail);
    return;
  }

  logger.error('Failed to upsert shadow profile:', error);
  throw new Error('Failed to ensure shadow profile exists');
}

async function cleanupOrphanProfiles(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  studentEmail: string
): Promise<void> {
  const { data: orphan } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', studentEmail)
    .single();

  if (!orphan || orphan.id === userId) return;

  // Rename orphan email to free constraint
  const tempEmail = `${studentEmail}_migrated_${Date.now()}`;
  await supabaseAdmin.from('profiles').update({ email: tempEmail }).eq('id', orphan.id);

  // Create new profile
  const { error } = await supabaseAdmin.from('profiles').upsert(
    {
      id: userId,
      email: studentEmail,
      full_name: null,
      is_student: true,
      is_teacher: false,
      is_admin: false,
      is_development: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) throw new Error(`Failed to create profile after cleanup: ${error.message}`);

  // Migrate related data
  await supabaseAdmin.from('lessons').update({ student_id: userId }).eq('student_id', orphan.id);
  await supabaseAdmin.from('lessons').update({ teacher_id: userId }).eq('teacher_id', orphan.id);
  await supabaseAdmin
    .from('assignments')
    .update({ student_id: userId })
    .eq('student_id', orphan.id);
  await supabaseAdmin
    .from('assignments')
    .update({ teacher_id: userId })
    .eq('teacher_id', orphan.id);

  // Delete orphan
  await supabaseAdmin.from('profiles').delete().eq('id', orphan.id);
}

export async function createShadowUser(studentEmail: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_teacher')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_teacher) {
    throw new Error('Unauthorized: Only teachers and admins can create shadow users');
  }

  const supabaseAdmin = createAdminClient();
  const userId = await findOrCreateAuthUser(supabaseAdmin, studentEmail);
  await upsertStudentProfile(supabaseAdmin, userId, studentEmail);

  logShadowUserCreated(studentEmail, user.id, userId);
  return { success: true, userId };
}

/**
 * Soft-delete (deactivate) a Profile. Sets is_active=false + deleted_at and
 * bans the auth user indefinitely. NEVER hard-deletes the profile or auth user —
 * lesson/assignment/repertoire FKs are preserved (MASTER_SPEC ledger D-09).
 * Reactivation is the admin PUT /api/users/[id] with isActive=true.
 */
export async function deleteUser(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // `userId` is a profiles.id (target), while `user.id` is an auth id (caller).
  // These only coincided for pre-rebuild accounts, so the self-deactivation
  // guard below compares the caller's own profiles.id against `userId`
  // instead of the raw auth id.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) {
    throw new Error('Unauthorized: Admin access required');
  }

  if (profile.id === userId) {
    throw new Error('You cannot deactivate your own account');
  }

  const supabaseAdmin = createAdminClient();

  // Resolve the target's AUTH id before mutating: auth.admin takes an
  // auth.users id, but `userId` is a profiles.id. Post-rebuild these are
  // independent id spaces, so passing the profile id made getUserById miss,
  // silently skipping the ban — the account stayed able to sign in.
  const { data: targetProfile } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('id', userId)
    .single();

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileError) {
    logger.error('Error deactivating profile:', profileError);
    throw new Error(`Failed to deactivate user: ${profileError.message}`);
  }

  // A shadow profile has no auth account yet — nothing to ban, and that is not
  // a failure. Anything else MUST be banned or deactivation is cosmetic.
  if (!targetProfile?.user_id) {
    return { success: true };
  }

  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(targetProfile.user_id, {
    ban_duration: '876000h', // ~100 years = indefinite
  });

  if (banError) {
    logger.error('Error banning auth user:', banError);
    return {
      success: true,
      warning: 'Profile deactivated but login ban failed — user may still sign in',
    };
  }

  return { success: true };
}

export interface AuthEventFilters {
  email?: string;
  eventType?: string;
  success?: boolean;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export async function getAuthEvents(filters: AuthEventFilters = {}): Promise<AuthEvent[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) {
    throw new Error('Unauthorized: Admin access required');
  }

  const limit = filters.limit ?? 100;

  // Use supabase client (RLS enforces admin-only SELECT)
  let query = supabase
    .from('auth_events' as never)
    .select('*' as never)
    .order('occurred_at' as never, { ascending: false } as never)
    .limit(limit);

  if (filters.email) {
    query = query.ilike('user_email' as never, `%${filters.email}%` as never);
  }
  if (filters.eventType) {
    query = query.eq('event_type' as never, filters.eventType as never);
  }
  if (filters.success !== undefined) {
    query = query.eq('success' as never, filters.success as never);
  }
  if (filters.fromDate) {
    query = query.gte('occurred_at' as never, filters.fromDate as never);
  }
  if (filters.toDate) {
    query = query.lte('occurred_at' as never, filters.toDate as never);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching auth events:', error);
    return [];
  }

  return (data ?? []) as unknown as AuthEvent[];
}

export async function deleteShadowUser(userId: string) {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) throw new Error('Unauthorized: Authentication required');

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('is_admin, is_teacher')
    .eq('user_id', currentUser.id)
    .single();

  if (!callerProfile?.is_admin && !callerProfile?.is_teacher) {
    throw new Error('Unauthorized: Only admins and teachers can delete shadow profiles');
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('is_shadow')
    .eq('id', userId)
    .single();

  if (!target) throw new Error('Profile not found');
  if (!target.is_shadow) throw new Error('Only unclaimed (shadow) profiles can be deleted here');

  const { error } = await supabase.from('profiles').delete().eq('id', userId).eq('is_shadow', true);

  if (error) throw new Error(`Failed to delete profile: ${error.message}`);
}
