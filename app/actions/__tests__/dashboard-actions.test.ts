/**
 * Dashboard Server Actions Security Tests
 *
 * CRITICAL: Tests authorization for user invite and shadow user creation.
 * These functions were previously vulnerable to privilege escalation.
 *
 * Tests:
 * - inviteUser() - Only admins can invite users
 * - createShadowUser() - Only teachers/admins can create shadow users
 *
 * @see app/dashboard/actions.ts
 */

import {
  inviteUser,
  createShadowUser,
  sendUserInvite,
  inviteShadowUser,
} from '../../dashboard/actions';

// Mock createClient
const mockGetUser = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();
const mockRlsUpdate = jest.fn();
const mockRlsUpdateEq = jest.fn();
// inviteShadowUser's `.update({...}).eq('id', ...).eq('is_shadow', true)` —
// tests override via mockRlsUpdateResult.mockResolvedValueOnce(...) to simulate failure.
const mockRlsUpdateResult = jest.fn(() => Promise.resolve({ error: null }));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: () => mockGetUser(),
      },
      from: (table: string) => {
        mockFrom(table);
        return {
          select: (fields: string) => {
            mockSelect(fields);
            return {
              eq: (field: string, value: string) => {
                mockEq(field, value);
                return {
                  single: () => mockSingle(),
                };
              },
            };
          },
          update: (data: unknown) => {
            mockRlsUpdate(data);
            return {
              eq: (field1: string, value1: string) => {
                mockRlsUpdateEq(field1, value1);
                return {
                  eq: (field2: string, value2: string) => {
                    mockRlsUpdateEq(field2, value2);
                    return mockRlsUpdateResult();
                  },
                };
              },
            };
          },
        };
      },
    })
  ),
}));

// Mock createAdminClient
const mockAdminListUsers = jest.fn();
const mockAdminInviteUserByEmail = jest.fn();
const mockAdminUpdate = jest.fn();
const mockAdminEq = jest.fn();
const mockAdminGenerateLink = jest.fn();
const mockAdminCreateUser = jest.fn();
const mockAdminUpdateUserById = jest.fn();
// Default: an invited-but-never-signed-in auth user (last_sign_in_at null).
const mockAdminGetUserById = jest.fn(() =>
  Promise.resolve({ data: { user: { last_sign_in_at: null } }, error: null })
);
const mockAdminUpsert = jest.fn();
const mockAdminSelect = jest.fn();
const mockAdminSelectEq = jest.fn();
// `authUserId` (auth.users id-space) is distinct from `profiles.id` post-rebuild.
// Default resolves the invited user's PROFILE id — tests can override via
// mockAdminProfileSingle.mockResolvedValueOnce(...) to simulate lookup failure.
const INVITED_PROFILE_ID = 'invited-profile-id-distinct-from-auth-id';
const mockAdminProfileSingle = jest.fn(() =>
  Promise.resolve({ data: { id: INVITED_PROFILE_ID }, error: null })
);

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    auth: {
      admin: {
        listUsers: () => mockAdminListUsers(),
        inviteUserByEmail: (...args: [string, unknown?]) => mockAdminInviteUserByEmail(...args),
        generateLink: (options: unknown) => mockAdminGenerateLink(options),
        createUser: (options: unknown) => mockAdminCreateUser(options),
        updateUserById: (userId: string, data: unknown) => mockAdminUpdateUserById(userId, data),
        getUserById: (userId: string) => mockAdminGetUserById(userId),
      },
    },
    from: (_table: string) => ({
      update: (data: unknown) => {
        mockAdminUpdate(data);
        return {
          eq: (field: string, value: string) => {
            mockAdminEq(field, value);
            return Promise.resolve({ error: null });
          },
        };
      },
      upsert: (data: unknown, options?: unknown) => {
        mockAdminUpsert(data, options);
        return Promise.resolve({ error: null });
      },
      select: (fields: string) => {
        mockAdminSelect(fields);
        return {
          eq: (field: string, value: string) => {
            mockAdminSelectEq(field, value);
            return {
              single: () => mockAdminProfileSingle(),
            };
          },
        };
      },
    }),
  })),
}));

// Mock google modules
jest.mock('@/lib/google', () => ({
  getGoogleOAuth2Client: jest.fn(),
}));

jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn(),
  },
  calendar_v3: {},
}));

describe('inviteUser - Authorization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow admin to invite student', async () => {
    const adminId = '123e4567-e89b-12d3-a456-426614174000';
    mockGetUser.mockResolvedValue({
      data: { user: { id: adminId, email: 'admin@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: { is_admin: true },
    });

    mockAdminListUsers.mockResolvedValue({
      data: { users: [] },
    });

    mockAdminInviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-student-id' } },
      error: null,
    });

    const result = await inviteUser('student@example.com', 'New Student', 'student');

    expect(result.success).toBe(true);
    expect(mockAdminInviteUserByEmail).toHaveBeenCalledWith('student@example.com');
    // Caller's own admin check must resolve profiles by `user_id` (auth id
    // space), never by `id` (profile id space) — see 20260727 identity rebuild.
    expect(mockEq).toHaveBeenCalledWith('user_id', adminId);
    // The role/profile update must target the resolved PROFILE id, not the
    // freshly-minted auth id — otherwise it silently matches 0 rows.
    expect(mockAdminSelectEq).toHaveBeenCalledWith('user_id', 'new-student-id');
    expect(mockAdminEq).toHaveBeenCalledWith('id', INVITED_PROFILE_ID);
  });

  it('should allow admin to invite teacher', async () => {
    const adminId = '123e4567-e89b-12d3-a456-426614174000';
    mockGetUser.mockResolvedValue({
      data: { user: { id: adminId, email: 'admin@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: { is_admin: true },
    });

    mockAdminListUsers.mockResolvedValue({
      data: { users: [] },
    });

    mockAdminInviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-teacher-id' } },
      error: null,
    });

    const result = await inviteUser('teacher@example.com', 'New Teacher', 'teacher');

    expect(result.success).toBe(true);
  });

  it('should allow admin to invite admin', async () => {
    const adminId = '123e4567-e89b-12d3-a456-426614174000';
    mockGetUser.mockResolvedValue({
      data: { user: { id: adminId, email: 'admin@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: { is_admin: true },
    });

    mockAdminListUsers.mockResolvedValue({
      data: { users: [] },
    });

    mockAdminInviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-admin-id' } },
      error: null,
    });

    const result = await inviteUser('newadmin@example.com', 'New Admin', 'admin');

    expect(result.success).toBe(true);
    expect(mockAdminUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        is_admin: true,
        is_teacher: false,
        is_student: false,
      })
    );
  });

  it('should reject teacher attempting to invite users', async () => {
    const teacherId = '223e4567-e89b-12d3-a456-426614174001';
    mockGetUser.mockResolvedValue({
      data: { user: { id: teacherId, email: 'teacher@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: { is_admin: false },
    });

    await expect(inviteUser('student@example.com', 'New Student', 'student')).rejects.toThrow(
      'Unauthorized: Only admins can invite users'
    );

    expect(mockAdminInviteUserByEmail).not.toHaveBeenCalled();
  });

  it('should reject student attempting to invite users', async () => {
    const studentId = '323e4567-e89b-12d3-a456-426614174002';
    mockGetUser.mockResolvedValue({
      data: { user: { id: studentId, email: 'student@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: { is_admin: false },
    });

    await expect(inviteUser('friend@example.com', 'Friend', 'student')).rejects.toThrow(
      'Unauthorized: Only admins can invite users'
    );

    expect(mockAdminInviteUserByEmail).not.toHaveBeenCalled();
  });

  it('should reject unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    await expect(inviteUser('student@example.com', 'New Student', 'student')).rejects.toThrow(
      'Unauthorized: Authentication required'
    );

    expect(mockAdminInviteUserByEmail).not.toHaveBeenCalled();
  });

  it('should reject when profile lookup fails', async () => {
    const userId = '423e4567-e89b-12d3-a456-426614174003';
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId, email: 'user@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: null,
    });

    await expect(inviteUser('student@example.com', 'New Student', 'student')).rejects.toThrow(
      'Unauthorized: Only admins can invite users'
    );
  });

  it('should surface an error and NOT persist role/details when the invited profile cannot be located', async () => {
    const adminId = '123e4567-e89b-12d3-a456-426614174000';
    mockGetUser.mockResolvedValue({
      data: { user: { id: adminId, email: 'admin@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: { is_admin: true },
    });

    mockAdminListUsers.mockResolvedValue({
      data: { users: [] },
    });

    mockAdminInviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-orphan-auth-id' } },
      error: null,
    });

    // Simulate handle_new_user not having created the profile row yet (or a
    // lookup failure) — this must be a hard error, not a silent 0-row update.
    mockAdminProfileSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(inviteUser('orphan@example.com', 'Orphan', 'student')).rejects.toThrow(
      'profile could not be found'
    );

    expect(mockAdminUpdate).not.toHaveBeenCalled();
  });
});

describe('createShadowUser - Authorization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow admin to create shadow user', async () => {
    const adminId = '123e4567-e89b-12d3-a456-426614174000';
    mockGetUser.mockResolvedValue({
      data: { user: { id: adminId, email: 'admin@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: { is_admin: true, is_teacher: false },
    });

    mockAdminListUsers.mockResolvedValue({
      data: { users: [] },
    });

    mockAdminGenerateLink.mockResolvedValue({
      data: { user: { id: 'shadow-user-id', email_confirmed_at: null } },
      error: null,
    });

    const result = await createShadowUser('shadow@example.com');

    expect(result.success).toBe(true);
    expect(result.userId).toBe('shadow-user-id');
    expect(mockAdminUpsert).toHaveBeenCalled();
    // Caller's own admin/teacher check must resolve profiles by `user_id`.
    expect(mockEq).toHaveBeenCalledWith('user_id', adminId);
  });

  it('should allow teacher to create shadow user', async () => {
    const teacherId = '223e4567-e89b-12d3-a456-426614174001';
    mockGetUser.mockResolvedValue({
      data: { user: { id: teacherId, email: 'teacher@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: { is_admin: false, is_teacher: true },
    });

    mockAdminListUsers.mockResolvedValue({
      data: { users: [] },
    });

    mockAdminGenerateLink.mockResolvedValue({
      data: { user: { id: 'shadow-user-id', email_confirmed_at: null } },
      error: null,
    });

    const result = await createShadowUser('shadow@example.com');

    expect(result.success).toBe(true);
  });

  it('should reject student attempting to create shadow user', async () => {
    const studentId = '323e4567-e89b-12d3-a456-426614174002';
    mockGetUser.mockResolvedValue({
      data: { user: { id: studentId, email: 'student@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: { is_admin: false, is_teacher: false },
    });

    await expect(createShadowUser('shadow@example.com')).rejects.toThrow(
      'Unauthorized: Only teachers and admins can create shadow users'
    );

    expect(mockAdminGenerateLink).not.toHaveBeenCalled();
    expect(mockAdminCreateUser).not.toHaveBeenCalled();
  });

  it('should reject unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    await expect(createShadowUser('shadow@example.com')).rejects.toThrow('Unauthorized');

    expect(mockAdminGenerateLink).not.toHaveBeenCalled();
  });

  it('should reject when profile lookup fails', async () => {
    const userId = '423e4567-e89b-12d3-a456-426614174003';
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId, email: 'user@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: null,
    });

    await expect(createShadowUser('shadow@example.com')).rejects.toThrow(
      'Unauthorized: Only teachers and admins can create shadow users'
    );
  });
});

describe('Authorization Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inviteUser - should handle null is_admin gracefully', async () => {
    const userId = '523e4567-e89b-12d3-a456-426614174004';
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId, email: 'user@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: { is_admin: null },
    });

    await expect(inviteUser('student@example.com', 'Student', 'student')).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('createShadowUser - should handle missing role fields', async () => {
    const userId = '623e4567-e89b-12d3-a456-426614174005';
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId, email: 'user@example.com' } },
    });

    mockSingle.mockResolvedValue({
      data: {},
    });

    await expect(createShadowUser('shadow@example.com')).rejects.toThrow('Unauthorized');
  });
});

describe('sendUserInvite / inviteShadowUser - RLS regression (2026-07-30)', () => {
  const teacherId = '723e4567-e89b-12d3-a456-426614174006';
  const shadowProfileId = 'shadow-profile-id-c20ae208';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: teacherId, email: 'teacher@example.com' } },
    });
    // Caller authorization check (RLS client, profiles.user_id = auth id).
    mockSingle.mockResolvedValue({ data: { is_admin: false, is_teacher: true } });
    mockAdminInviteUserByEmail.mockResolvedValue({ data: {}, error: null });
  });

  it('sends an invite for an unclaimed shadow profile', async () => {
    // Regression guard for the invite-to-claim 500: the select used to include
    // `sign_in_count`, a column the July 2026 identity rebuild dropped, so
    // Postgres rejected the whole query with 42703 and the null result was
    // reported to the user as "User not found".
    mockAdminProfileSingle.mockResolvedValueOnce({
      data: {
        email: 'placeholder@shadow.internal',
        is_shadow: true,
        invite_email: 'real.student@example.com',
        user_id: null,
        full_name: 'QA Test Invitee',
      },
      error: null,
    });

    const result = await sendUserInvite(shadowProfileId);

    expect(result.success).toBe(true);
    expect(mockAdminInviteUserByEmail).toHaveBeenCalledWith(
      'real.student@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/accept-invitation') })
    );
  });

  it('throws "User not found" if the admin lookup itself finds no row', async () => {
    mockAdminProfileSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(sendUserInvite(shadowProfileId)).rejects.toThrow('User not found');
    expect(mockAdminInviteUserByEmail).not.toHaveBeenCalled();
  });

  it('never selects columns the identity rebuild dropped', async () => {
    // The real 42703 guard: a dropped column in the select list makes Postgres
    // reject the entire query, and the stale generated types mean `tsc` will
    // not catch it. Assert against the live schema explicitly.
    const DROPPED_COLUMNS = ['sign_in_count', 'last_sign_in_at', 'deletion_scheduled_for'];

    mockAdminProfileSingle.mockResolvedValueOnce({
      data: {
        email: 'placeholder@shadow.internal',
        is_shadow: true,
        invite_email: 'real.student@example.com',
        user_id: null,
        full_name: 'QA Test Invitee',
      },
      error: null,
    });

    await sendUserInvite(shadowProfileId);

    const selectedColumns = mockAdminSelect.mock.calls.flatMap(([fields]) =>
      String(fields)
        .split(',')
        .map((f) => f.trim())
    );
    expect(selectedColumns.length).toBeGreaterThan(0);
    for (const dropped of DROPPED_COLUMNS) {
      expect(selectedColumns).not.toContain(dropped);
    }
  });

  it('refuses to re-invite a user who has already signed in', async () => {
    mockAdminProfileSingle.mockResolvedValueOnce({
      data: {
        email: 'active.student@example.com',
        is_shadow: false,
        invite_email: null,
        user_id: 'auth-user-id-distinct-from-profile-id',
        full_name: 'Already Active',
      },
      error: null,
    });
    mockAdminGetUserById.mockResolvedValueOnce({
      data: { user: { last_sign_in_at: '2026-07-01T10:00:00Z' } },
      error: null,
    });

    await expect(sendUserInvite(shadowProfileId)).rejects.toThrow('already signed in');
    expect(mockAdminInviteUserByEmail).not.toHaveBeenCalled();
  });

  it('passes the auth user id — not the profile id — to the auth admin API', async () => {
    const authUserId = 'auth-user-id-distinct-from-profile-id';
    mockAdminProfileSingle.mockResolvedValueOnce({
      data: {
        email: 'invited.student@example.com',
        is_shadow: false,
        invite_email: null,
        user_id: authUserId,
        full_name: 'Invited Not Yet Signed In',
      },
      error: null,
    });

    await sendUserInvite(shadowProfileId);

    // Regression guard: these took `userId` (a profiles.id) before, which is a
    // different id space post-rebuild and silently addressed the wrong user.
    expect(mockAdminGetUserById).toHaveBeenCalledWith(authUserId);
    expect(mockAdminUpdateUserById).toHaveBeenCalledWith(authUserId, { email_confirm: false });
  });

  it('inviteShadowUser persists invite_email via the RLS client, then sends through the admin-read path', async () => {
    mockAdminProfileSingle.mockResolvedValueOnce({
      data: {
        email: 'placeholder@shadow.internal',
        is_shadow: true,
        invite_email: 'real.student@example.com',
        user_id: null,
        full_name: 'QA Test Invitee',
      },
      error: null,
    });

    const result = await inviteShadowUser(shadowProfileId, 'real.student@example.com');

    expect(result.success).toBe(true);
    expect(mockRlsUpdate).toHaveBeenCalledWith({ invite_email: 'real.student@example.com' });
    expect(mockRlsUpdateEq).toHaveBeenCalledWith('id', shadowProfileId);
    expect(mockRlsUpdateEq).toHaveBeenCalledWith('is_shadow', true);
    expect(mockAdminInviteUserByEmail).toHaveBeenCalledWith(
      'real.student@example.com',
      expect.anything()
    );
  });

  it('surfaces a clear error when persisting invite_email fails, without attempting to send', async () => {
    mockRlsUpdateResult.mockResolvedValueOnce({ error: { message: 'permission denied' } });

    await expect(inviteShadowUser(shadowProfileId, 'real.student@example.com')).rejects.toThrow(
      'Could not save the invite email'
    );
    expect(mockAdminInviteUserByEmail).not.toHaveBeenCalled();
  });

  it('rejects students from sending invites', async () => {
    mockSingle.mockResolvedValue({ data: { is_admin: false, is_teacher: false } });

    await expect(sendUserInvite(shadowProfileId)).rejects.toThrow(
      'Unauthorized: Only admins and teachers can send invites'
    );
    expect(mockAdminInviteUserByEmail).not.toHaveBeenCalled();
  });
});
