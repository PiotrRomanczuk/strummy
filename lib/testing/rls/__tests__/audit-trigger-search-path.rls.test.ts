/**
 * REGRESSION LOCK — audit trigger search_path (2026-07-30).
 *
 * Deleting ANY auth user used to fail in production with
 *   ERROR: type "audit_action" does not exist (SQLSTATE 42704)
 * surfacing as 500 "Database error deleting user" from
 * DELETE /auth/v1/admin/users/<id>.
 *
 * The four tr_audit_* functions are SECURITY DEFINER with no `SET search_path`,
 * so they inherit the caller's. GoTrue connects as supabase_auth_admin, whose
 * role config is `search_path=auth` — no public. Deleting auth.users cascades
 * to public.profiles (profiles_user_id_fkey ON DELETE CASCADE), firing
 * tr_audit_profiles, which references the `audit_action` type and the
 * `audit_log` table unqualified. Neither resolves, the trigger aborts the
 * transaction, and the delete can never succeed through the Auth API.
 *
 * This suite deletes a user via the ADMIN API specifically — not via psql as
 * `postgres`, whose search_path includes public and therefore masks the bug
 * entirely. That distinction is the whole point of the test.
 *
 * REQUIRES migration 20260730103000_pin_audit_trigger_search_path.
 */

import { describeIfRls, createServiceClient, RLS_TEST_PASSWORD } from '../index';

describeIfRls('audit trigger search_path lock — admin user deletion', () => {
  const service = createServiceClient();
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdUserIds: string[] = [];

  afterAll(async () => {
    // Belt-and-braces: if an assertion failed mid-test the user may survive.
    for (const id of createdUserIds) {
      await service.auth.admin.deleteUser(id).catch(() => undefined);
    }
  });

  it('deletes an auth user through the admin API without a database error', async () => {
    const email = `rls-del-${tag}@guitarcrm.local`;
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password: RLS_TEST_PASSWORD,
      email_confirm: true,
    });

    expect(createError).toBeNull();
    const userId = created?.user?.id;
    expect(userId).toBeTruthy();
    createdUserIds.push(userId!);

    const { error: deleteError } = await service.auth.admin.deleteUser(userId!);

    // Pre-migration this is: "Database error deleting user" (500).
    expect(deleteError).toBeNull();

    // The cascade must really be gone, not merely un-erroring.
    const { data: profile } = await service
      .from('profiles')
      .select('id')
      .eq('user_id', userId!)
      .maybeSingle();
    expect(profile).toBeNull();

    createdUserIds.length = 0;
  });

  it('still writes an audit row for the cascaded profile delete', async () => {
    const email = `rls-del-audit-${tag}@guitarcrm.local`;
    const { data: created } = await service.auth.admin.createUser({
      email,
      password: RLS_TEST_PASSWORD,
      email_confirm: true,
    });
    const userId = created?.user?.id;
    expect(userId).toBeTruthy();
    createdUserIds.push(userId!);

    const { data: profile } = await service
      .from('profiles')
      .select('id')
      .eq('user_id', userId!)
      .single();
    const profileId = profile?.id as string;
    expect(profileId).toBeTruthy();

    const { error: deleteError } = await service.auth.admin.deleteUser(userId!);
    expect(deleteError).toBeNull();
    createdUserIds.length = 0;

    // Pinning search_path must FIX the trigger, not bypass it — the delete has
    // to still land in audit_log.
    const { data: rows } = await service
      .from('audit_log')
      .select('action, entity_type')
      .eq('entity_type', 'profile')
      .eq('entity_id', profileId)
      .eq('action', 'deleted');

    expect(rows?.length).toBeGreaterThan(0);
  });
});
