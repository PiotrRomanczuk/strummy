/**
 * requireAIAuth — profile-id space + role-derivation regression tests
 *
 * Two independent, pre-existing bugs this guards against:
 *
 * 1. `profiles.id` is an independent PK from the auth session id
 *    (migration 20260727110000, "S2"). The caller's own row must be found via
 *    `user_id`, the auth linkage — not `id`, the profile PK. Filtering by
 *    `id` returns nothing for every account created after S2.
 * 2. `profiles` has no `role` column at all. Role must be derived from the
 *    `is_admin` / `is_teacher` / `is_student` boolean flags (admin > teacher >
 *    student precedence, matching `loadAuthedProfile` / `getUserWithRolesSSR`).
 *    Selecting a nonexistent `role` column silently errors, the error is
 *    discarded, and the `|| 'student'` fallback made every account resolve to
 *    'student' regardless of the flags — for every account, independent of S2.
 */

import { requireAIAuth, AIAuthError } from '../auth';

const AUTH_ID = 'auth-aaaa-0000-4000-a000-000000000001';
const PROFILE_ID = 'profile-bbbb-1111-4000-a000-000000000002';

/** Records which column was filtered, and answers only for `user_id`. */
function mockClient(
  user: { id: string; email?: string } | null,
  profileRow: Record<string, unknown> | null
) {
  const filters: Array<{ column: string; value: unknown }> = [];
  const client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'not authenticated' },
      }),
    },
    from: () => ({
      select: () => ({
        eq: (column: string, value: unknown) => {
          filters.push({ column, value });
          return {
            single: async () =>
              column === 'user_id' && value === AUTH_ID
                ? { data: profileRow, error: null }
                : { data: null, error: { message: 'no rows', code: 'PGRST116' } },
          };
        },
      }),
    }),
  };
  return { client, filters };
}

const mockCreateClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

describe('requireAIAuth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves the profile by user_id, not id (post-S2 accounts)', async () => {
    const { client, filters } = mockClient(
      { id: AUTH_ID, email: 'teacher@test.com' },
      { id: PROFILE_ID, is_admin: false, is_teacher: true, is_student: false }
    );
    mockCreateClient.mockResolvedValue(client);

    const result = await requireAIAuth();

    expect(filters).toEqual([{ column: 'user_id', value: AUTH_ID }]);
    expect(result.profileId).toBe(PROFILE_ID);
    expect(result.profileId).not.toBe(result.id);
  });

  it('resolves an admin account to role "admin", not the old "student" fallback', async () => {
    const { client } = mockClient(
      { id: AUTH_ID, email: 'admin@test.com' },
      { id: PROFILE_ID, is_admin: true, is_teacher: false, is_student: false }
    );
    mockCreateClient.mockResolvedValue(client);

    const result = await requireAIAuth();

    expect(result.role).toBe('admin');
  });

  it('resolves a teacher account to role "teacher"', async () => {
    const { client } = mockClient(
      { id: AUTH_ID },
      { id: PROFILE_ID, is_admin: false, is_teacher: true, is_student: false }
    );
    mockCreateClient.mockResolvedValue(client);

    const result = await requireAIAuth();

    expect(result.role).toBe('teacher');
  });

  it('prioritizes admin over teacher when both flags are set', async () => {
    const { client } = mockClient(
      { id: AUTH_ID },
      { id: PROFILE_ID, is_admin: true, is_teacher: true, is_student: false }
    );
    mockCreateClient.mockResolvedValue(client);

    const result = await requireAIAuth();

    expect(result.role).toBe('admin');
  });

  it('falls back to "student" only when no admin/teacher flag is set', async () => {
    const { client } = mockClient(
      { id: AUTH_ID },
      { id: PROFILE_ID, is_admin: false, is_teacher: false, is_student: true }
    );
    mockCreateClient.mockResolvedValue(client);

    const result = await requireAIAuth();

    expect(result.role).toBe('student');
  });

  it('throws AIAuthError when there is no authenticated session', async () => {
    const { client } = mockClient(null, null);
    mockCreateClient.mockResolvedValue(client);

    await expect(requireAIAuth()).rejects.toThrow(AIAuthError);
  });
});
