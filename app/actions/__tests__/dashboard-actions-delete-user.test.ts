/**
 * deleteUser() Security Tests
 *
 * CRITICAL: deleteUser() deactivates (soft-deletes) another user's Profile and
 * bans their auth account. Two invariants matter:
 *   1. Only admins may call it (caller's own admin flag, resolved by `user_id`
 *      — not `id` — since profiles.id and auth.users.id diverged after the
 *      2026-07-27 identity-model rebuild).
 *   2. An admin can never deactivate their OWN account. That guard must
 *      compare the caller's own `profiles.id` against the target `userId`
 *      (a profiles.id), never the raw auth id against a profiles.id — those
 *      only coincided for pre-rebuild accounts.
 *
 * @see app/dashboard/actions.ts
 */

import { deleteUser } from '../../dashboard/actions';

const mockGetUser = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: () => mockGetUser() },
      from: () => ({
        select: () => ({
          eq: (field: string, value: string) => {
            mockEq(field, value);
            return { single: () => mockSingle() };
          },
        }),
      }),
    })
  ),
}));

const mockAdminUpdateEq = jest.fn();
const mockAdminUpdate = jest.fn(() => ({ eq: mockAdminUpdateEq }));
const mockGetUserById = jest.fn();
const mockUpdateUserById = jest.fn();
const mockAdminSelectEq = jest.fn();
// deleteUser resolves the target's AUTH id before banning: profiles.id and
// auth.users.id are independent post-rebuild.
const mockAdminTargetSingle = jest.fn();

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    auth: {
      admin: {
        getUserById: (id: string) => mockGetUserById(id),
        updateUserById: (id: string, data: unknown) => mockUpdateUserById(id, data),
      },
    },
    from: () => ({
      update: mockAdminUpdate,
      select: () => ({
        eq: (field: string, value: string) => {
          mockAdminSelectEq(field, value);
          return { single: () => mockAdminTargetSingle() };
        },
      }),
    }),
  })),
}));

const ADMIN_AUTH_ID = 'auth-admin-1';
const ADMIN_PROFILE_ID = 'profile-admin-1';
const TARGET_PROFILE_ID = 'profile-target-1';
const TARGET_AUTH_ID = 'auth-target-1';

describe('deleteUser - Authorization & Self-Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_AUTH_ID } } });
    mockSingle.mockResolvedValue({ data: { id: ADMIN_PROFILE_ID, is_admin: true } });
    mockAdminUpdateEq.mockResolvedValue({ error: null });
    mockGetUserById.mockResolvedValue({ data: { user: { id: TARGET_AUTH_ID } } });
    mockUpdateUserById.mockResolvedValue({ error: null });
    mockAdminTargetSingle.mockResolvedValue({ data: { user_id: TARGET_AUTH_ID }, error: null });
  });

  it('rejects unauthenticated callers', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(deleteUser(TARGET_PROFILE_ID)).rejects.toThrow('Unauthorized');
  });

  it("resolves the caller's own admin flag by user_id, not id", async () => {
    await deleteUser(TARGET_PROFILE_ID);
    expect(mockEq).toHaveBeenCalledWith('user_id', ADMIN_AUTH_ID);
  });

  it('rejects a non-admin caller', async () => {
    mockSingle.mockResolvedValue({ data: { id: ADMIN_PROFILE_ID, is_admin: false } });
    await expect(deleteUser(TARGET_PROFILE_ID)).rejects.toThrow(
      'Unauthorized: Admin access required'
    );
    expect(mockAdminUpdate).not.toHaveBeenCalled();
  });

  it('blocks an admin from deactivating their own profile (by profiles.id, not auth id)', async () => {
    // The caller's auth id (ADMIN_AUTH_ID) never equals a profiles.id
    // post-rebuild — the guard must compare profile.id === userId instead.
    await expect(deleteUser(ADMIN_PROFILE_ID)).rejects.toThrow(
      'You cannot deactivate your own account'
    );
    expect(mockAdminUpdate).not.toHaveBeenCalled();
  });

  it('allows an admin to deactivate a different profile', async () => {
    const result = await deleteUser(TARGET_PROFILE_ID);
    expect(result.success).toBe(true);
    expect(mockAdminUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    expect(mockAdminUpdateEq).toHaveBeenCalledWith('id', TARGET_PROFILE_ID);
  });

  it('bans the target AUTH id, never the profile id', async () => {
    // Regression guard for the fail-open gap: this used to call
    // auth.admin.getUserById(userId) with a profiles.id. Post-rebuild the id
    // spaces are independent, so the lookup missed for every account whose
    // profile id != user id, the ban was silently skipped, and the
    // "deactivated" user could still sign in.
    const result = await deleteUser(TARGET_PROFILE_ID);

    expect(result.success).toBe(true);
    expect(mockAdminSelectEq).toHaveBeenCalledWith('id', TARGET_PROFILE_ID);
    expect(mockUpdateUserById).toHaveBeenCalledWith(
      TARGET_AUTH_ID,
      expect.objectContaining({ ban_duration: expect.any(String) })
    );
    expect(mockUpdateUserById).not.toHaveBeenCalledWith(
      TARGET_PROFILE_ID,
      expect.anything()
    );
  });

  it('skips the ban for a shadow profile with no auth account, without reporting failure', async () => {
    mockAdminTargetSingle.mockResolvedValue({ data: { user_id: null }, error: null });

    const result = await deleteUser(TARGET_PROFILE_ID);

    expect(result.success).toBe(true);
    expect(mockAdminUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('warns the caller when the ban fails instead of reporting a clean success', async () => {
    mockUpdateUserById.mockResolvedValue({ error: { message: 'ban failed' } });

    const result = await deleteUser(TARGET_PROFILE_ID);

    expect(result.warning).toMatch(/may still sign in/);
  });
});
