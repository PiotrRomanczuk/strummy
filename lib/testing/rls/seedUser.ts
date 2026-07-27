import type { SupabaseClient } from '@supabase/supabase-js';
import { signInAs } from './clients';

/** Shared password for all RLS fixture users. */
export const RLS_TEST_PASSWORD = 'rls-test-Password!1';

/**
 * A seeded RLS fixture user. The identity model is SPLIT on purpose:
 *
 *   - `id`     — profiles.id, the app-facing PROFILE id. Every domain FK
 *                (assignments/lessons teacher_id/student_id, student_repertoire,
 *                practice_sessions, user_preferences.user_id, ...) lives in
 *                THIS space. Use it for every FK column.
 *   - `userId` — auth.users.id, the auth linkage (profiles.user_id). Use it
 *                ONLY for genuinely auth-scoped paths: auth.admin.deleteUser
 *                teardown, storage folder names, and the few tables that FK
 *                auth.users(id) directly (user_integrations,
 *                webhook_subscriptions).
 *
 * NEVER assume id === userId. The repo's handle_new_user generates profiles.id
 * via gen_random_uuid(); the two only coincide on legacy stacks — a coincidence
 * that masked real RLS bugs (2026-07-27 migrations review, finding 1).
 */
export type SeededUser = {
  id: string;
  userId: string;
  email: string;
  password: string;
  client: SupabaseClient;
};

export type RlsRole = 'admin' | 'teacher' | 'student';

/**
 * Create an auth user and seed its profile THROUGH the real handle_new_user
 * trigger — no direct profile insert/upsert, and no forcing id == user_id.
 *
 * The trigger fires AFTER INSERT on auth.users inside the same transaction as
 * auth.admin.createUser, so the profile row is committed before the API call
 * returns — a single immediate UPDATE is race-free (no retry needed). We
 * UPDATE the trigger-created row by user_id (never sending email — the trigger
 * already set it) and read back the REAL profiles.id, which is correct under
 * both the repo trigger (id = gen_random_uuid()) and the legacy stack trigger
 * (id = auth uid).
 */
export async function createRlsUser(
  service: SupabaseClient,
  role: RlsRole,
  tag: string,
  profileOverrides: Record<string, unknown> = {}
): Promise<Omit<SeededUser, 'client'>> {
  const email = `rls-${role}-${tag}@guitarcrm.local`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: RLS_TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { isTest: true },
  });
  if (error || !data.user) {
    throw new Error(`createRlsUser(${email}) failed: ${error?.message ?? 'no user returned'}`);
  }
  const userId = data.user.id;

  const { data: profile, error: profileErr } = await service
    .from('profiles')
    .update({
      full_name: `RLS ${role} ${tag}`,
      is_admin: role === 'admin',
      is_teacher: role === 'teacher',
      is_student: role === 'student',
      is_development: true,
      ...profileOverrides,
    })
    .eq('user_id', userId)
    .select('id')
    .single();
  if (profileErr || !profile) {
    throw new Error(
      `profile update for ${email} failed (did handle_new_user run?): ` +
        `${profileErr?.message ?? 'no row returned'}`
    );
  }
  return { id: (profile as { id: string }).id, userId, email, password: RLS_TEST_PASSWORD };
}

/** {@link createRlsUser} + sign-in, for suites that need the RLS-real client immediately. */
export async function createSignedInRlsUser(
  service: SupabaseClient,
  role: RlsRole,
  tag: string,
  profileOverrides: Record<string, unknown> = {}
): Promise<SeededUser> {
  const seeded = await createRlsUser(service, role, tag, profileOverrides);
  const client = await signInAs(seeded.email, seeded.password);
  return { ...seeded, client };
}
