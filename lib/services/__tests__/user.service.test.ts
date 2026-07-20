/**
 * User Service Tests
 *
 * Tests for business logic and authorization layer with focus on:
 * - Authorization checks (canViewUser, canCreateUser, etc.)
 * - Business operations (getUserService, createUser, etc.)
 * - Error handling
 * - Repository integration (mocked)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  canViewUser,
  canListUsers,
  canCreateUser,
  canUpdateUser,
  canDeleteUser,
  getUserService,
  getUsersList,
  getUsersListWithStats,
  createUser,
  updateUser,
  deleteUser,
} from '@/lib/services/user.service';
import type { Profile, CreateUserInput, UpdateUserInput } from '@/lib/repositories/user.repository';

// ============================================================================
// MOCKS
// ============================================================================

// Mock the repository module
jest.mock('@/lib/repositories/user.repository', () => ({
  getUserById: jest.fn(),
  getUsers: jest.fn(),
  getUsersWithStats: jest.fn(),
  createUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  deleteUserProfile: jest.fn(),
  getUserByEmail: jest.fn(),
  getStudentIdsForTeacher: jest.fn(),
}));

import * as userRepository from '@/lib/repositories/user.repository';

const mockSupabase = {} as SupabaseClient;

const adminProfile: Profile = {
  isAdmin: true,
  isTeacher: false,
  isStudent: false,
};

const teacherProfile: Profile = {
  isAdmin: false,
  isTeacher: true,
  isStudent: false,
};

const studentProfile: Profile = {
  isAdmin: false,
  isTeacher: false,
  isStudent: true,
};

const noRoleProfile: Profile = {
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
};

// ============================================================================
// AUTHORIZATION TESTS
// ============================================================================

describe('canViewUser', () => {
  it('should allow admins to view any user', () => {
    const result = canViewUser('admin-id', adminProfile, 'any-user-id');
    expect(result.allowed).toBe(true);
  });

  it('should allow teachers to view their students', () => {
    const allowedStudents = ['student-1', 'student-2'];
    const result = canViewUser('teacher-id', teacherProfile, 'student-1', allowedStudents);
    expect(result.allowed).toBe(true);
  });

  it('should deny teachers from viewing non-students', () => {
    const allowedStudents = ['student-1', 'student-2'];
    const result = canViewUser('teacher-id', teacherProfile, 'other-user-id', allowedStudents);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Teachers can only view their students');
  });

  it('should allow students to view themselves', () => {
    const result = canViewUser('student-id', studentProfile, 'student-id');
    expect(result.allowed).toBe(true);
  });

  it('should deny students from viewing other users', () => {
    const result = canViewUser('student-id', studentProfile, 'other-user-id');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Students can only view their own profile');
  });

  it('should deny users with no role', () => {
    const result = canViewUser('no-role-id', noRoleProfile, 'any-user-id');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('No access');
  });
});

describe('canListUsers', () => {
  it('should allow admins to list users', () => {
    const result = canListUsers(adminProfile);
    expect(result.allowed).toBe(true);
  });

  it('should allow teachers to list users', () => {
    const result = canListUsers(teacherProfile);
    expect(result.allowed).toBe(true);
  });

  it('should allow students to list users (repository enforces self-only)', () => {
    const result = canListUsers(studentProfile);
    expect(result.allowed).toBe(true);
  });

  it('should deny users with no role', () => {
    const result = canListUsers(noRoleProfile);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('No access to user list');
  });
});

describe('canCreateUser', () => {
  it('should allow admins to create any user', () => {
    const input: CreateUserInput = {
      id: 'new-id',
      email: 'new@example.com',
      is_admin: true,
    };
    const result = canCreateUser(adminProfile, input);
    expect(result.allowed).toBe(true);
  });

  it('should allow teachers to create students', () => {
    const input: CreateUserInput = {
      id: 'new-id',
      email: 'student@example.com',
      is_student: true,
    };
    const result = canCreateUser(teacherProfile, input);
    expect(result.allowed).toBe(true);
  });

  it('should deny teachers from creating admins', () => {
    const input: CreateUserInput = {
      id: 'new-id',
      email: 'admin@example.com',
      is_admin: true,
    };
    const result = canCreateUser(teacherProfile, input);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Teachers can only create students');
  });

  it('should deny teachers from creating other teachers', () => {
    const input: CreateUserInput = {
      id: 'new-id',
      email: 'teacher@example.com',
      is_teacher: true,
    };
    const result = canCreateUser(teacherProfile, input);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Teachers can only create students');
  });

  it('should deny students from creating users', () => {
    const input: CreateUserInput = {
      id: 'new-id',
      email: 'new@example.com',
    };
    const result = canCreateUser(studentProfile, input);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Only admins and teachers can create users');
  });
});

describe('canUpdateUser', () => {
  it('should allow admins to update any user', () => {
    const input: UpdateUserInput = { full_name: 'Updated Name' };
    const result = canUpdateUser('admin-id', adminProfile, 'any-user-id', input);
    expect(result.allowed).toBe(true);
  });

  it('should allow teachers to update their students (limited fields)', () => {
    const allowedStudents = ['student-1', 'student-2'];
    const input: UpdateUserInput = { full_name: 'Updated Name', phone: '123-456-7890' };
    const result = canUpdateUser('teacher-id', teacherProfile, 'student-1', input, allowedStudents);
    expect(result.allowed).toBe(true);
  });

  it('should deny teachers from updating non-students', () => {
    const allowedStudents = ['student-1', 'student-2'];
    const input: UpdateUserInput = { full_name: 'Updated Name' };
    const result = canUpdateUser(
      'teacher-id',
      teacherProfile,
      'other-user-id',
      input,
      allowedStudents
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Teachers can only update their students');
  });

  it('should deny teachers from changing user roles', () => {
    const allowedStudents = ['student-1'];
    const input: UpdateUserInput = { is_admin: true };
    const result = canUpdateUser('teacher-id', teacherProfile, 'student-1', input, allowedStudents);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Teachers cannot change user roles');
  });

  it('should allow students to update themselves (limited fields)', () => {
    const input: UpdateUserInput = { full_name: 'My New Name' };
    const result = canUpdateUser('student-id', studentProfile, 'student-id', input);
    expect(result.allowed).toBe(true);
  });

  it('should deny students from updating other users', () => {
    const input: UpdateUserInput = { full_name: 'Updated Name' };
    const result = canUpdateUser('student-id', studentProfile, 'other-user-id', input);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Students can only update their own profile');
  });

  it('should deny students from changing roles', () => {
    const input: UpdateUserInput = { is_teacher: true };
    const result = canUpdateUser('student-id', studentProfile, 'student-id', input);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Students cannot change roles');
  });
});

describe('canDeleteUser', () => {
  it('should allow admins to delete other users', () => {
    const result = canDeleteUser('admin-id', adminProfile, 'other-user-id');
    expect(result.allowed).toBe(true);
  });

  it('should deny admins from deleting themselves', () => {
    const result = canDeleteUser('admin-id', adminProfile, 'admin-id');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Cannot delete your own account');
  });

  it('should allow teachers to delete their students', () => {
    const allowedStudents = ['student-1', 'student-2'];
    const result = canDeleteUser('teacher-id', teacherProfile, 'student-1', allowedStudents);
    expect(result.allowed).toBe(true);
  });

  it('should deny teachers from deleting non-students', () => {
    const allowedStudents = ['student-1', 'student-2'];
    const result = canDeleteUser('teacher-id', teacherProfile, 'other-user-id', allowedStudents);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Teachers can only delete their students');
  });

  it('should deny students from deleting users', () => {
    const result = canDeleteUser('student-id', studentProfile, 'any-user-id');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Only admins and teachers can delete users');
  });
});

// ============================================================================
// BUSINESS OPERATION TESTS
// ============================================================================

describe('getUserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user when authorized', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    (userRepository.getUserById as jest.Mock).mockResolvedValue({
      data: mockUser,
      error: null,
    });

    const result = await getUserService(mockSupabase, 'admin-id', adminProfile, 'user-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockUser);
    }
  });

  it('should deny access when unauthorized', async () => {
    const result = await getUserService(
      mockSupabase,
      'student-id',
      studentProfile,
      'other-user-id'
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('FORBIDDEN');
      expect(result.error).toContain('own profile');
    }
  });

  it('should return not found when user does not exist', async () => {
    (userRepository.getUserById as jest.Mock).mockResolvedValue({
      data: null,
      error: 'Not found',
    });

    const result = await getUserService(mockSupabase, 'admin-id', adminProfile, 'nonexistent-id');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('should handle repository errors', async () => {
    (userRepository.getUserById as jest.Mock).mockRejectedValue(new Error('Database error'));

    const result = await getUserService(mockSupabase, 'admin-id', adminProfile, 'user-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INTERNAL_ERROR');
    }
  });
});

describe('getUsersList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return users list when authorized', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'user1@example.com' },
      { id: 'user-2', email: 'user2@example.com' },
    ];
    (userRepository.getUsers as jest.Mock).mockResolvedValue({
      data: mockUsers,
      count: 2,
      error: null,
    });

    const result = await getUsersList(mockSupabase, 'admin-id', adminProfile);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data).toEqual(mockUsers);
      expect(result.data.total).toBe(2);
    }
  });

  it('should deny access when unauthorized', async () => {
    const result = await getUsersList(mockSupabase, 'no-role-id', noRoleProfile);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('FORBIDDEN');
    }
  });

  it('should handle repository errors', async () => {
    (userRepository.getUsers as jest.Mock).mockResolvedValue({
      data: [],
      count: 0,
      error: 'Database error',
    });

    const result = await getUsersList(mockSupabase, 'admin-id', adminProfile);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INTERNAL_ERROR');
    }
  });
});

describe('getUsersListWithStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return users with stats when authorized', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        email: 'user1@example.com',
        lessons_count: 5,
        assignments_count: 10,
      },
    ];
    (userRepository.getUsersWithStats as jest.Mock).mockResolvedValue({
      data: mockUsers,
      count: 1,
      error: null,
    });

    const result = await getUsersListWithStats(mockSupabase, 'admin-id', adminProfile);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data[0].lessons_count).toBe(5);
      expect(result.data.data[0].assignments_count).toBe(10);
    }
  });
});

describe('createUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create user when authorized', async () => {
    const input: CreateUserInput = {
      id: 'new-id',
      email: 'new@example.com',
      is_student: true,
    };
    const mockCreatedUser = { id: 'new-id', email: 'new@example.com' };

    (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });
    (userRepository.createUserProfile as jest.Mock).mockResolvedValue({
      data: mockCreatedUser,
      error: null,
    });

    const result = await createUser(mockSupabase, 'admin-id', adminProfile, input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockCreatedUser);
    }
  });

  it('should deny creation when unauthorized', async () => {
    const input: CreateUserInput = {
      id: 'new-id',
      email: 'new@example.com',
    };

    const result = await createUser(mockSupabase, 'student-id', studentProfile, input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('FORBIDDEN');
    }
  });

  it('should return conflict when user exists', async () => {
    const input: CreateUserInput = {
      id: 'new-id',
      email: 'existing@example.com',
    };

    (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({
      data: { id: 'existing-id', email: 'existing@example.com' },
      error: null,
    });

    const result = await createUser(mockSupabase, 'admin-id', adminProfile, input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('CONFLICT');
      expect(result.error).toContain('already exists');
    }
  });
});

describe('updateUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update user when authorized', async () => {
    const input: UpdateUserInput = { full_name: 'Updated Name' };
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockUpdatedUser = { ...mockUser, full_name: 'Updated Name' };

    (userRepository.getStudentIdsForTeacher as jest.Mock).mockResolvedValue([]);
    (userRepository.getUserById as jest.Mock).mockResolvedValue({
      data: mockUser,
      error: null,
    });
    (userRepository.updateUserProfile as jest.Mock).mockResolvedValue({
      data: mockUpdatedUser,
      error: null,
    });

    const result = await updateUser(mockSupabase, 'admin-id', adminProfile, 'user-1', input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.full_name).toBe('Updated Name');
    }
  });

  it('should deny update when unauthorized', async () => {
    const input: UpdateUserInput = { full_name: 'Updated Name' };

    const result = await updateUser(
      mockSupabase,
      'student-id',
      studentProfile,
      'other-user-id',
      input
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('FORBIDDEN');
    }
  });

  it('should return not found when user does not exist', async () => {
    const input: UpdateUserInput = { full_name: 'Updated Name' };

    (userRepository.getStudentIdsForTeacher as jest.Mock).mockResolvedValue([]);
    (userRepository.getUserById as jest.Mock).mockResolvedValue({
      data: null,
      error: 'Not found',
    });

    const result = await updateUser(
      mockSupabase,
      'admin-id',
      adminProfile,
      'nonexistent-id',
      input
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete user when authorized', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    (userRepository.getStudentIdsForTeacher as jest.Mock).mockResolvedValue([]);
    (userRepository.getUserById as jest.Mock).mockResolvedValue({
      data: mockUser,
      error: null,
    });
    (userRepository.deleteUserProfile as jest.Mock).mockResolvedValue({
      error: null,
    });

    const result = await deleteUser(mockSupabase, 'admin-id', adminProfile, 'user-1');

    expect(result.success).toBe(true);
  });

  it('should deny deletion when unauthorized', async () => {
    const result = await deleteUser(mockSupabase, 'student-id', studentProfile, 'any-user-id');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('FORBIDDEN');
    }
  });

  it('should return not found when user does not exist', async () => {
    (userRepository.getStudentIdsForTeacher as jest.Mock).mockResolvedValue([]);
    (userRepository.getUserById as jest.Mock).mockResolvedValue({
      data: null,
      error: 'Not found',
    });

    const result = await deleteUser(mockSupabase, 'admin-id', adminProfile, 'nonexistent-id');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });
});

// ============================================================================
// FAILURE + TEACHER-SCOPING PATHS
//
// The happy paths and authorization matrix are covered above; this block closes
// the repository-error, missing-row, teacher-scoping and catch branches of the
// six async service functions.
// ============================================================================

describe('service failure paths', () => {
  const REPO_ERROR = new Error('connection reset');

  beforeEach(() => {
    jest.clearAllMocks();
    (userRepository.getStudentIdsForTeacher as jest.Mock).mockResolvedValue(['student-1']);
  });

  describe('teacher scoping', () => {
    it.each([
      [
        'getUserService',
        () => getUserService(mockSupabase, 'teacher-id', teacherProfile, 'student-1'),
      ],
      [
        'updateUser',
        () =>
          updateUser(mockSupabase, 'teacher-id', teacherProfile, 'student-1', { full_name: 'X' }),
      ],
      ['deleteUser', () => deleteUser(mockSupabase, 'teacher-id', teacherProfile, 'student-1')],
    ])('%s resolves the teacher roster before authorizing', async (_name, run) => {
      (userRepository.getUserById as jest.Mock).mockResolvedValue({
        data: { id: 'student-1' },
        error: null,
      });
      (userRepository.updateUserProfile as jest.Mock).mockResolvedValue({
        data: { id: 'student-1' },
        error: null,
      });
      (userRepository.deleteUserProfile as jest.Mock).mockResolvedValue({ error: null });

      await run();

      expect(userRepository.getStudentIdsForTeacher).toHaveBeenCalledWith(
        mockSupabase,
        'teacher-id'
      );
    });

    it('does not resolve the roster for an admin', async () => {
      (userRepository.getUserById as jest.Mock).mockResolvedValue({
        data: { id: 'u1' },
        error: null,
      });

      await getUserService(mockSupabase, 'admin-id', adminProfile, 'u1');

      expect(userRepository.getStudentIdsForTeacher).not.toHaveBeenCalled();
    });
  });

  describe('getUserService', () => {
    it('returns NOT_FOUND when the repository yields no row and no error', async () => {
      (userRepository.getUserById as jest.Mock).mockResolvedValue({ data: null, error: null });

      const result = await getUserService(mockSupabase, 'admin-id', adminProfile, 'missing');

      expect(result).toEqual({ success: false, error: 'User not found', code: 'NOT_FOUND' });
    });

    it('returns INTERNAL_ERROR when the repository throws', async () => {
      (userRepository.getUserById as jest.Mock).mockRejectedValue(REPO_ERROR);

      const result = await getUserService(mockSupabase, 'admin-id', adminProfile, 'u1');

      expect(result).toEqual({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('getUsersList', () => {
    it('returns INTERNAL_ERROR when the repository throws', async () => {
      (userRepository.getUsers as jest.Mock).mockRejectedValue(REPO_ERROR);

      const result = await getUsersList(mockSupabase, 'admin-id', adminProfile);

      expect(result).toEqual({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('getUsersListWithStats', () => {
    it('denies a caller with no role', async () => {
      const result = await getUsersListWithStats(mockSupabase, 'nobody', noRoleProfile);

      expect(result).toEqual({
        success: false,
        error: 'No access to user list',
        code: 'FORBIDDEN',
      });
      expect(userRepository.getUsersWithStats).not.toHaveBeenCalled();
    });

    it('surfaces a repository error', async () => {
      (userRepository.getUsersWithStats as jest.Mock).mockResolvedValue({
        data: [],
        count: 0,
        error: 'stats view missing',
      });

      const result = await getUsersListWithStats(mockSupabase, 'admin-id', adminProfile);

      expect(result).toEqual({
        success: false,
        error: 'stats view missing',
        code: 'INTERNAL_ERROR',
      });
    });

    it('returns INTERNAL_ERROR when the repository throws', async () => {
      (userRepository.getUsersWithStats as jest.Mock).mockRejectedValue(REPO_ERROR);

      const result = await getUsersListWithStats(mockSupabase, 'admin-id', adminProfile);

      expect(result).toEqual({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('createUser', () => {
    const input: CreateUserInput = { email: 'new@example.com', full_name: 'New User' };

    beforeEach(() => {
      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({ data: null, error: null });
    });

    it('surfaces a repository error', async () => {
      (userRepository.createUserProfile as jest.Mock).mockResolvedValue({
        data: null,
        error: 'insert violated a constraint',
      });

      const result = await createUser(mockSupabase, 'admin-id', adminProfile, input);

      expect(result).toEqual({
        success: false,
        error: 'insert violated a constraint',
        code: 'INTERNAL_ERROR',
      });
    });

    it('returns INTERNAL_ERROR when the insert yields no row and no error', async () => {
      (userRepository.createUserProfile as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await createUser(mockSupabase, 'admin-id', adminProfile, input);

      expect(result).toEqual({
        success: false,
        error: 'Failed to create user',
        code: 'INTERNAL_ERROR',
      });
    });

    it('returns INTERNAL_ERROR when the repository throws', async () => {
      (userRepository.getUserByEmail as jest.Mock).mockRejectedValue(REPO_ERROR);

      const result = await createUser(mockSupabase, 'admin-id', adminProfile, input);

      expect(result).toEqual({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('updateUser', () => {
    const input: UpdateUserInput = { full_name: 'Renamed' };

    beforeEach(() => {
      (userRepository.getUserById as jest.Mock).mockResolvedValue({
        data: { id: 'u1' },
        error: null,
      });
    });

    it('surfaces a repository error', async () => {
      (userRepository.updateUserProfile as jest.Mock).mockResolvedValue({
        data: null,
        error: 'update rejected',
      });

      const result = await updateUser(mockSupabase, 'admin-id', adminProfile, 'u1', input);

      expect(result).toEqual({ success: false, error: 'update rejected', code: 'INTERNAL_ERROR' });
    });

    it('returns INTERNAL_ERROR when the update yields no row and no error', async () => {
      (userRepository.updateUserProfile as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await updateUser(mockSupabase, 'admin-id', adminProfile, 'u1', input);

      expect(result).toEqual({
        success: false,
        error: 'Failed to update user',
        code: 'INTERNAL_ERROR',
      });
    });

    it('denies a caller with no role', async () => {
      const result = await updateUser(mockSupabase, 'nobody', noRoleProfile, 'u1', input);

      expect(result).toEqual({
        success: false,
        error: 'No update access',
        code: 'FORBIDDEN',
      });
      expect(userRepository.updateUserProfile).not.toHaveBeenCalled();
    });

    it('returns INTERNAL_ERROR when the repository throws', async () => {
      (userRepository.updateUserProfile as jest.Mock).mockRejectedValue(REPO_ERROR);

      const result = await updateUser(mockSupabase, 'admin-id', adminProfile, 'u1', input);

      expect(result).toEqual({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      (userRepository.getUserById as jest.Mock).mockResolvedValue({
        data: { id: 'u1' },
        error: null,
      });
    });

    it('surfaces a repository error', async () => {
      (userRepository.deleteUserProfile as jest.Mock).mockResolvedValue({
        error: 'row is referenced',
      });

      const result = await deleteUser(mockSupabase, 'admin-id', adminProfile, 'u1');

      expect(result).toEqual({
        success: false,
        error: 'row is referenced',
        code: 'INTERNAL_ERROR',
      });
    });

    it('returns INTERNAL_ERROR when the repository throws', async () => {
      (userRepository.deleteUserProfile as jest.Mock).mockRejectedValue(REPO_ERROR);

      const result = await deleteUser(mockSupabase, 'admin-id', adminProfile, 'u1');

      expect(result).toEqual({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });
  });
});
