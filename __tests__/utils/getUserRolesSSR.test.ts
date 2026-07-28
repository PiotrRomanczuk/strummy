import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// getUserWithRolesSSR resolves the session via the cookie-bound client, then
// loads role flags via loadAuthedProfile — which reads `profiles` through the
// SERVICE-ROLE admin client, not `user_roles` and not the cookie client. Both
// seams need mocking.
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.Mock;
const mockCreateAdminClient = createAdminClient as jest.Mock;

function mockAuthedUser(user: { id: string; email: string } | null) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }) },
  });
}

function mockProfileRow(
  row: {
    is_admin?: boolean;
    is_teacher?: boolean;
    is_student?: boolean;
    is_parent?: boolean;
    is_development?: boolean;
  } | null
) {
  // maybeSingle semantics: "no row" is { data: null, error: null } — NOT an
  // error. Query errors are mocked separately via mockProfileQueryError.
  mockCreateAdminClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
    }),
  });
}

function mockProfileQueryError(message: string) {
  mockCreateAdminClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message } }),
    }),
  });
}

describe('getUserWithRolesSSR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user with profile roles when authenticated and a profile row exists', async () => {
    // fetchProfileRow is wrapped in React's cache() and memoizes by userId —
    // every test uses a distinct id so no test observes another's mock.
    const mockUser = { id: 'u-roles-1', email: 'test@example.com' };
    mockAuthedUser(mockUser);
    mockProfileRow({
      is_admin: true,
      is_teacher: false,
      is_student: true,
      is_parent: false,
      is_development: false,
    });

    const result = await getUserWithRolesSSR();
    expect(result).toEqual({
      user: mockUser,
      isAdmin: true,
      isTeacher: false,
      isStudent: true,
      isParent: false,
      isDevelopment: false,
    });
  });

  it('surfaces the is_parent flag when set', async () => {
    const mockUser = { id: 'u-roles-2', email: 'parent@example.com' };
    mockAuthedUser(mockUser);
    mockProfileRow({
      is_admin: false,
      is_teacher: false,
      is_student: false,
      is_parent: true,
      is_development: false,
    });

    const result = await getUserWithRolesSSR();
    expect(result.isParent).toBe(true);
  });

  it('returns all-false roles for a real admin email when no profile row exists — no email-based backdoor', async () => {
    // Regression guard: an earlier version of this test asserted a
    // hardcoded isAdmin=true fallback for a specific email. No such
    // special-casing exists in loadAuthedProfile — a missing profile row
    // means no roles, full stop, regardless of whose email it is.
    const mockUser = { id: 'u-roles-3', email: 'p.romanczuk@gmail.com' };
    mockAuthedUser(mockUser);
    mockProfileRow(null);

    const result = await getUserWithRolesSSR();
    expect(result).toEqual({
      user: mockUser,
      isAdmin: false,
      isTeacher: false,
      isStudent: false,
      isParent: false,
      isDevelopment: false,
    });
  });

  it('returns all false when unauthenticated', async () => {
    mockAuthedUser(null);

    const result = await getUserWithRolesSSR();
    expect(result).toEqual({
      user: null,
      isAdmin: false,
      isTeacher: false,
      isStudent: false,
      isParent: false,
      isDevelopment: false,
    });
  });

  it('returns all false when the profile row is not found for a regular user', async () => {
    const mockUser = { id: 'u-roles-4', email: 'regular@example.com' };
    mockAuthedUser(mockUser);
    mockProfileRow(null);

    const result = await getUserWithRolesSSR();
    expect(result).toEqual({
      user: mockUser,
      isAdmin: false,
      isTeacher: false,
      isStudent: false,
      isParent: false,
      isDevelopment: false,
    });
  });

  it('throws when the profile lookup errors — infra failure must not read as "no roles"', async () => {
    // A transient query error previously collapsed into null roles, which the
    // dashboard layout translated into an /onboarding redirect for a fully
    // authenticated user. Errors now propagate so callers fail loud instead.
    const mockUser = { id: 'u-roles-5', email: 'unlucky@example.com' };
    mockAuthedUser(mockUser);
    mockProfileQueryError('connection reset');

    await expect(getUserWithRolesSSR()).rejects.toThrow(/profile lookup failed: connection reset/);
  });
});
