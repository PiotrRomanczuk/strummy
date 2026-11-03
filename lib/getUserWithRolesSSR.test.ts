/**
 * Tests for getUserWithRolesSSR
 */

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createClient } from '@/lib/supabase/server';
import { loadAuthedProfile } from '@/lib/auth/loadAuthedProfile';
import { resolveViewAs } from '@/lib/auth/view-as';

jest.mock('@/lib/supabase/server');
jest.mock('@/lib/auth/loadAuthedProfile');
jest.mock('@/lib/auth/view-as', () => ({ resolveViewAs: jest.fn() }));
jest.mock('@/lib/supabase/provider-preference', () => ({
  getServerForceRemote: jest.fn().mockResolvedValue(false),
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
};

const baseEmpty = {
  user: null,
  profileId: '',
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  isParent: false,
  isDevelopment: false,
  viewAs: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  (resolveViewAs as jest.Mock).mockResolvedValue(null);
});

describe('getUserWithRolesSSR', () => {
  describe('Admin User', () => {
    it('returns user with admin and teacher roles from profile', async () => {
      const mockUser = { id: 'admin-user-id', email: 'p.romanczuk@gmail.com' };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      (loadAuthedProfile as jest.Mock).mockResolvedValue({
        user: mockUser,
        profileId: '',
        roles: { isAdmin: true, isTeacher: true, isStudent: false },
        flags: { isParent: false, isDevelopment: false },
      });

      const result = await getUserWithRolesSSR();

      expect(result).toEqual({
        user: mockUser,
        profileId: '',
        isAdmin: true,
        isTeacher: true,
        isStudent: false,
        isParent: false,
        isDevelopment: false,
        viewAs: null,
      });
    });
  });

  describe('Teacher User', () => {
    it('returns user with teacher role only from profile', async () => {
      const mockUser = { id: 'teacher-user-id', email: 'teacher@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      (loadAuthedProfile as jest.Mock).mockResolvedValue({
        user: mockUser,
        profileId: '',
        roles: { isAdmin: false, isTeacher: true, isStudent: false },
        flags: { isParent: false, isDevelopment: false },
      });

      const result = await getUserWithRolesSSR();

      expect(result).toEqual({
        user: mockUser,
        profileId: '',
        isAdmin: false,
        isTeacher: true,
        isStudent: false,
        isParent: false,
        isDevelopment: false,
        viewAs: null,
      });
    });
  });

  describe('Student User', () => {
    it('returns user with student role only from profile', async () => {
      const mockUser = { id: 'student-user-id', email: 'student@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      (loadAuthedProfile as jest.Mock).mockResolvedValue({
        user: mockUser,
        profileId: '',
        roles: { isAdmin: false, isTeacher: false, isStudent: true },
        flags: { isParent: false, isDevelopment: false },
      });

      const result = await getUserWithRolesSSR();

      expect(result).toEqual({
        user: mockUser,
        profileId: '',
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
        isParent: false,
        isDevelopment: false,
        viewAs: null,
      });
    });
  });

  describe('No User', () => {
    it('returns all roles false when no user is authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await getUserWithRolesSSR();

      expect(result).toEqual(baseEmpty);
    });
  });

  describe('User with No Profile', () => {
    it('returns user with all roles false when loadAuthedProfile returns null', async () => {
      const mockUser = { id: 'no-roles-user-id', email: 'user@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      (loadAuthedProfile as jest.Mock).mockResolvedValue(null);

      const result = await getUserWithRolesSSR();

      expect(result).toEqual({ ...baseEmpty, user: mockUser });
    });
  });

  describe('Authentication Error', () => {
    it('returns null user when auth fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result = await getUserWithRolesSSR();

      expect(result).toEqual(baseEmpty);
    });
  });

  describe('Admin previewing a student (view as)', () => {
    const mockUser = { id: 'admin-user-id', email: 'admin@example.com' };
    const student = {
      profileId: 'student-profile-id',
      fullName: 'Quentin G',
      email: 'q@example.com',
      isDevelopment: false,
    };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      (loadAuthedProfile as jest.Mock).mockResolvedValue({
        user: mockUser,
        profileId: 'admin-profile-id',
        roles: { isAdmin: true, isTeacher: true, isStudent: false },
        flags: { isParent: false, isDevelopment: false },
      });
    });

    it('returns the student identity with student-only flags', async () => {
      (resolveViewAs as jest.Mock).mockResolvedValue(student);
      const result = await getUserWithRolesSSR();
      expect(resolveViewAs).toHaveBeenCalledWith(true, false);
      expect(result).toEqual({
        user: mockUser,
        profileId: 'student-profile-id',
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
        isParent: false,
        isDevelopment: false,
        viewAs: student,
      });
    });

    it('asks for a preview only with the real admin flag', async () => {
      (loadAuthedProfile as jest.Mock).mockResolvedValue({
        user: mockUser,
        profileId: 'teacher-profile-id',
        roles: { isAdmin: false, isTeacher: true, isStudent: false },
        flags: { isParent: false, isDevelopment: false },
      });
      const result = await getUserWithRolesSSR();
      expect(resolveViewAs).toHaveBeenCalledWith(false, false);
      expect(result.profileId).toBe('teacher-profile-id');
      expect(result.viewAs).toBeNull();
    });
  });
});
