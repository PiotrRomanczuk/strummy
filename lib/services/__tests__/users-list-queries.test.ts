/**
 * Users List Queries Tests
 *
 * Covers the role-scoped profile list used by the users surface:
 * - student-only scope (self row only)
 * - teacher scope (students via lessons)
 * - admin scope (full list)
 * - filter branches (search, role, studentStatus, active)
 * - row mapping defaults and shadow-email masking
 */

import { getUsersList, type UserListScope } from '../users-list-queries';
import { logger } from '@/lib/logger';

const mockProfileSingle = jest.fn();
const mockProfilesLimit = jest.fn();
const mockLessonsIs = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockOr = jest.fn();
const mockOrder = jest.fn();
// profiles_signed_in: SECURITY DEFINER lookup of who has actually signed in.
// Defaults to "nobody", so rows read as unclaimed unless a test says otherwise.
const mockRpc = jest.fn();

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ from: mockFrom, rpc: mockRpc })),
}));

type ProfilesChain = {
  select: () => ProfilesChain;
  eq: (...args: unknown[]) => ProfilesChain;
  in: (...args: unknown[]) => ProfilesChain;
  or: (...args: unknown[]) => ProfilesChain;
  order: (...args: unknown[]) => ProfilesChain;
  limit: () => unknown;
  single: () => unknown;
};

function mockFrom(table: string) {
  if (table === 'lessons') {
    return {
      select: () => ({
        eq: (...args: unknown[]) => {
          mockEq(...args);
          return { is: () => mockLessonsIs() };
        },
      }),
    };
  }
  const chain: ProfilesChain = {
    select: () => chain,
    eq: (...args: unknown[]) => {
      mockEq(...args);
      return chain;
    },
    in: (...args: unknown[]) => {
      mockIn(...args);
      return chain;
    },
    or: (...args: unknown[]) => {
      mockOr(...args);
      return chain;
    },
    order: (...args: unknown[]) => {
      mockOrder(...args);
      return chain;
    },
    limit: () => mockProfilesLimit(),
    single: () => mockProfileSingle(),
  };
  return chain;
}

const studentScope: UserListScope = {
  profileId: 'stu-1',
  isAdmin: false,
  isTeacher: false,
  isStudent: true,
};
const teacherScope: UserListScope = {
  profileId: 'tea-1',
  isAdmin: false,
  isTeacher: true,
  isStudent: false,
};
const adminScope: UserListScope = {
  profileId: 'adm-1',
  isAdmin: true,
  isTeacher: false,
  isStudent: false,
};

const fullRow = {
  id: 'u-1',
  email: 'user@example.com',
  full_name: 'User One',
  is_admin: true,
  is_teacher: true,
  is_student: false,
  is_shadow: false,
  is_active: false,
  invite_email: 'invite@example.com',
  student_status: 'archived',
  created_at: '2026-01-01T00:00:00Z',
};

const nullRow = {
  id: 'u-2',
  email: null,
  full_name: null,
  is_admin: null,
  is_teacher: null,
  is_student: null,
  is_shadow: null,
  is_active: null,
  invite_email: null,
  student_status: null,
  created_at: null,
};

describe('getUsersList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileSingle.mockResolvedValue({ data: null, error: null });
    mockProfilesLimit.mockResolvedValue({ data: [], error: null });
    mockLessonsIs.mockResolvedValue({ data: [], error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  describe('student-only scope', () => {
    it('returns only the student own row', async () => {
      mockProfileSingle.mockResolvedValue({ data: fullRow, error: null });

      const rows = await getUsersList(studentScope);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        id: 'u-1',
        fullName: 'User One',
        email: 'user@example.com',
        isAdmin: true,
        isTeacher: true,
        isStudent: false,
        isShadow: false,
        isActive: false,
        inviteEmail: 'invite@example.com',
        studentStatus: 'archived',
        createdAt: '2026-01-01T00:00:00Z',
        // A student reading their own row is signed in by definition, and the
        // SECURITY DEFINER helper refuses non-teachers anyway.
        hasSignedIn: true,
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'stu-1');
      expect(mockProfilesLimit).not.toHaveBeenCalled();
    });

    it('returns empty list on profile fetch error', async () => {
      mockProfileSingle.mockResolvedValue({
        data: null,
        error: { message: 'not found', code: 'PGRST116' },
      });

      await expect(getUsersList(studentScope)).resolves.toEqual([]);
    });

    it('returns empty list when profile row is missing', async () => {
      mockProfileSingle.mockResolvedValue({ data: null, error: null });

      await expect(getUsersList(studentScope)).resolves.toEqual([]);
    });

    it('does not use the self path for a student who is also admin', async () => {
      await getUsersList({ ...studentScope, isAdmin: true });

      expect(mockProfileSingle).not.toHaveBeenCalled();
      expect(mockProfilesLimit).toHaveBeenCalled();
    });

    it('does not use the self path for a student who is also teacher', async () => {
      mockLessonsIs.mockResolvedValue({ data: [{ student_id: 's-1' }], error: null });

      await getUsersList({ ...studentScope, isTeacher: true });

      expect(mockProfileSingle).not.toHaveBeenCalled();
      expect(mockProfilesLimit).toHaveBeenCalled();
    });
  });

  describe('teacher scope', () => {
    it('scopes the list to deduped student ids from lessons', async () => {
      mockLessonsIs.mockResolvedValue({
        data: [{ student_id: 's-1' }, { student_id: 's-2' }, { student_id: 's-1' }],
        error: null,
      });
      mockProfilesLimit.mockResolvedValue({ data: [fullRow], error: null });

      const rows = await getUsersList(teacherScope);

      expect(mockEq).toHaveBeenCalledWith('teacher_id', 'tea-1');
      expect(mockIn).toHaveBeenCalledWith('id', ['s-1', 's-2']);
      expect(rows).toHaveLength(1);
    });

    it('returns empty list when the teacher has no lessons', async () => {
      mockLessonsIs.mockResolvedValue({ data: [], error: null });

      await expect(getUsersList(teacherScope)).resolves.toEqual([]);
      expect(mockProfilesLimit).not.toHaveBeenCalled();
    });

    it('returns empty list when lesson data is null', async () => {
      mockLessonsIs.mockResolvedValue({ data: null, error: null });

      await expect(getUsersList(teacherScope)).resolves.toEqual([]);
    });

    it('skips lesson scoping for a teacher who is also admin', async () => {
      await getUsersList({ ...teacherScope, isAdmin: true });

      expect(mockLessonsIs).not.toHaveBeenCalled();
      expect(mockIn).not.toHaveBeenCalled();
    });
  });

  describe('admin scope', () => {
    it('lists without id scoping and applies defaults on null fields', async () => {
      mockProfilesLimit.mockResolvedValue({ data: [nullRow], error: null });

      const rows = await getUsersList(adminScope);

      expect(mockIn).not.toHaveBeenCalled();
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(rows[0]).toEqual({
        id: 'u-2',
        fullName: null,
        email: '',
        isAdmin: false,
        isTeacher: false,
        isStudent: false,
        isShadow: false,
        isActive: true,
        inviteEmail: null,
        studentStatus: 'active',
        createdAt: null,
        hasSignedIn: false,
      });
    });

    it('masks shadow placeholder emails to null', async () => {
      mockProfilesLimit.mockResolvedValue({
        data: [{ ...fullRow, email: 'shadow_abc-123@placeholder.com' }],
        error: null,
      });

      const rows = await getUsersList(adminScope);

      expect(rows[0].email).toBeNull();
    });

    // An invited-but-unclaimed profile is is_shadow=false (the invite created
    // the auth user) yet has never signed in. Before profiles_signed_in there
    // was no way to tell it apart from a fully onboarded student, which is why
    // the invite button vanished and an expired invite became unrecoverable.
    it('marks a profile as not signed in when the helper omits it', async () => {
      mockProfilesLimit.mockResolvedValue({
        data: [{ ...fullRow, id: 'u-1', is_shadow: false }],
        error: null,
      });
      mockRpc.mockResolvedValue({ data: [], error: null });

      const rows = await getUsersList(adminScope);

      expect(rows[0].isShadow).toBe(false);
      expect(rows[0].hasSignedIn).toBe(false);
      expect(mockRpc).toHaveBeenCalledWith('profiles_signed_in', { p_profile_ids: ['u-1'] });
    });

    // A successful RPC can still resolve data as null. `(data ?? [])` is what
    // keeps .map from throwing and taking the whole users list down.
    it('treats a null RPC payload as nobody signed in', async () => {
      mockProfilesLimit.mockResolvedValue({
        data: [{ ...fullRow, id: 'u-1', is_shadow: false }],
        error: null,
      });
      mockRpc.mockResolvedValue({ data: null, error: null });

      const rows = await getUsersList(adminScope);

      expect(rows[0].hasSignedIn).toBe(false);
    });

    it('marks a profile as signed in when the helper returns it', async () => {
      mockProfilesLimit.mockResolvedValue({
        data: [{ ...fullRow, id: 'u-1' }],
        error: null,
      });
      mockRpc.mockResolvedValue({ data: [{ profile_id: 'u-1' }], error: null });

      const rows = await getUsersList(adminScope);

      expect(rows[0].hasSignedIn).toBe(true);
    });

    // Degrading to "nobody signed in" at worst offers a redundant resend; the
    // opposite default would hide the button from a student who needs it.
    it('treats everyone as unclaimed when the helper errors', async () => {
      mockProfilesLimit.mockResolvedValue({ data: [{ ...fullRow, id: 'u-1' }], error: null });
      mockRpc.mockResolvedValue({ data: null, error: { message: 'denied' } });

      const rows = await getUsersList(adminScope);

      expect(rows[0].hasSignedIn).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('[users-list-queries] signed-in lookup failed', {
        error: 'denied',
      });
    });

    it('skips the helper entirely when there are no rows', async () => {
      mockProfilesLimit.mockResolvedValue({ data: [], error: null });

      await expect(getUsersList(adminScope)).resolves.toEqual([]);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('returns empty list and warns on query error', async () => {
      mockProfilesLimit.mockResolvedValue({
        data: null,
        error: { message: 'boom', code: '500' },
      });

      await expect(getUsersList(adminScope)).resolves.toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('[users-list-queries] list error', {
        error: 'boom',
        code: '500',
      });
    });

    it('returns empty list when data is null without error', async () => {
      mockProfilesLimit.mockResolvedValue({ data: null, error: null });

      await expect(getUsersList(adminScope)).resolves.toEqual([]);
    });
  });

  describe('filters', () => {
    it('applies the search filter as an OR ilike', async () => {
      await getUsersList(adminScope, { search: 'anna' });

      expect(mockOr).toHaveBeenCalledWith('email.ilike.%anna%,full_name.ilike.%anna%');
    });

    it.each([
      ['admin', 'is_admin'],
      ['teacher', 'is_teacher'],
      ['student', 'is_student'],
      ['shadow', 'is_shadow'],
    ])('maps role=%s to eq(%s, true)', async (role, column) => {
      await getUsersList(adminScope, { role });

      expect(mockEq).toHaveBeenCalledWith(column, true);
    });

    it('ignores an unknown role filter', async () => {
      await getUsersList(adminScope, { role: 'parent' });

      expect(mockEq).not.toHaveBeenCalled();
    });

    it('applies the studentStatus filter', async () => {
      await getUsersList(adminScope, { studentStatus: 'archived' });

      expect(mockEq).toHaveBeenCalledWith('student_status', 'archived');
    });

    it('skips the studentStatus filter when set to all', async () => {
      await getUsersList(adminScope, { studentStatus: 'all' });

      expect(mockEq).not.toHaveBeenCalled();
    });

    it('applies active=true and active=false filters', async () => {
      await getUsersList(adminScope, { active: 'true' });
      expect(mockEq).toHaveBeenCalledWith('is_active', true);

      mockEq.mockClear();
      await getUsersList(adminScope, { active: 'false' });
      expect(mockEq).toHaveBeenCalledWith('is_active', false);
    });

    it('ignores a malformed active filter', async () => {
      await getUsersList(adminScope, { active: 'yes' });

      expect(mockEq).not.toHaveBeenCalled();
    });

    it('applies no filters when none are provided', async () => {
      await getUsersList(adminScope, {});

      expect(mockOr).not.toHaveBeenCalled();
      expect(mockEq).not.toHaveBeenCalled();
    });
  });
});
