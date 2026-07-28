import type { User } from '@supabase/supabase-js';

import { loadAuthedProfile } from '../loadAuthedProfile';

/**
 * Guards the auth-id vs profile-id distinction.
 *
 * Migration 20260727110000 ("S2") made `handle_new_user` mint a profile with
 * `id = gen_random_uuid()`, linked to the account by `user_id`. This loader was
 * still matching the auth id against `profiles.id`, so every account created
 * after that migration resolved to null — no roles, and the dashboard role gate
 * bounced them to /onboarding forever.
 *
 * The column the query filters on is therefore the whole point of these tests,
 * which is why they assert on it directly rather than only on the result.
 */

const AUTH_ID = 'aaaaaaaa-0000-4000-a000-000000000001';
const PROFILE_ID = 'bbbbbbbb-1111-4000-a000-000000000002';

/** Records which column was filtered, and answers only for `user_id`. */
function mockClient(row: Record<string, unknown> | null) {
  const filters: Array<{ column: string; value: unknown }> = [];
  const client = {
    from: () => ({
      select: () => ({
        eq: (column: string, value: unknown) => {
          filters.push({ column, value });
          return {
            // maybeSingle semantics: an unmatched filter is "no row", never
            // an error. The S2 world: only a user_id match finds the row.
            maybeSingle: async () =>
              column === 'user_id' && value === AUTH_ID
                ? { data: row, error: null }
                : { data: null, error: null },
          };
        },
      }),
    }),
  };
  return { client, filters };
}

/** A client whose lookup fails outright (network / PostgREST error). */
function mockErrorClient(message: string) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: { message } }),
        }),
      }),
    }),
  };
}

const mockCreateAdminClient = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (opts?: unknown) => mockCreateAdminClient(opts),
}));

// `fetchProfileRow` is wrapped in React's `cache`, which memoizes per request.
// Outside a request scope it passes through, but reset between tests anyway so
// one test's lookup can't answer another's.
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn: unknown) => fn,
}));

const user = { id: AUTH_ID } as User;

describe('loadAuthedProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('finds the profile by user_id, not by id', async () => {
    const { client, filters } = mockClient({
      id: PROFILE_ID,
      is_admin: false,
      is_teacher: true,
      is_student: false,
      is_parent: false,
      is_development: false,
    });
    mockCreateAdminClient.mockReturnValue(client);

    const result = await loadAuthedProfile(user);

    expect(filters).toEqual([{ column: 'user_id', value: AUTH_ID }]);
    expect(result?.roles.isTeacher).toBe(true);
  });

  it('resolves roles when the profile id differs from the auth id (post-S2 account)', async () => {
    const { client } = mockClient({
      id: PROFILE_ID, // deliberately NOT equal to AUTH_ID
      is_admin: false,
      is_teacher: false,
      is_student: true,
      is_parent: false,
      is_development: true,
    });
    mockCreateAdminClient.mockReturnValue(client);

    const result = await loadAuthedProfile(user);

    // Before the fix this returned null — the account had no roles at all and
    // the dashboard bounced it to /onboarding.
    expect(result).not.toBeNull();
    expect(result?.roles).toEqual({ isAdmin: false, isTeacher: false, isStudent: true });
    expect(result?.flags).toEqual({ isParent: false, isDevelopment: true });
  });

  it('returns null when no profile is linked to the account', async () => {
    const { client } = mockClient(null);
    mockCreateAdminClient.mockReturnValue(client);

    await expect(loadAuthedProfile(user)).resolves.toBeNull();
  });

  it('throws when the lookup errors — infra failure must not read as "no profile"', async () => {
    // Returning null here would let a transient query error impersonate
    // "account has no profile": the dashboard would bounce a valid session
    // to /onboarding and withApiAuth would 403 it. Fail loud instead.
    mockCreateAdminClient.mockReturnValue(mockErrorClient('connection reset'));

    await expect(loadAuthedProfile(user)).rejects.toThrow(
      /profile lookup failed: connection reset/
    );
  });

  it('coerces null role columns to false rather than leaking null', async () => {
    const { client } = mockClient({
      id: PROFILE_ID,
      is_admin: null,
      is_teacher: null,
      is_student: null,
      is_parent: null,
      is_development: null,
    });
    mockCreateAdminClient.mockReturnValue(client);

    const result = await loadAuthedProfile(user);

    expect(result?.roles).toEqual({ isAdmin: false, isTeacher: false, isStudent: false });
    expect(result?.flags).toEqual({ isParent: false, isDevelopment: false });
  });

  it('passes forceRemote through to the admin client', async () => {
    const { client } = mockClient(null);
    mockCreateAdminClient.mockReturnValue(client);

    await loadAuthedProfile(user, { forceRemote: true });

    expect(mockCreateAdminClient).toHaveBeenCalledWith({ forceRemote: true });
  });
});
