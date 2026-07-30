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

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    auth: {
      admin: {
        getUserById: (id: string) => mockGetUserById(id),
        updateUserById: (id: string, data: unknown) => mockUpdateUserById(id, data),
      },
    },
    from: () => ({ update: mockAdminUpdate }),
  })),
}));

const ADMIN_AUTH_ID = 'auth-admin-1';
const ADMIN_PROFILE_ID = 'profile-admin-1';
const TARGET_PROFILE_ID = 'profile-target-1';

describe('deleteUser - Authorization & Self-Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_AUTH_ID } } });
    mockSingle.mockResolvedValue({ data: { id: ADMIN_PROFILE_ID, is_admin: true } });
    mockAdminUpdateEq.mockResolvedValue({ error: null });
    mockGetUserById.mockResolvedValue({ data: { user: { id: TARGET_PROFILE_ID } } });
    mockUpdateUserById.mockResolvedValue({ error: null });
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
});
