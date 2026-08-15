/**
 * User Repository Tests
 *
 * Tests for data access layer with focus on:
 * - Query sanitization (STRUMMY-282)
 * - Role-based access control
 * - Filter application
 * - CRUD operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sanitizeSearchQuery,
  buildUserQuery,
  applyUserFilters,
  getUserById,
  getUsers,
  getUsersWithStats,
  getStudentIdsForTeacher,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getUserByEmail,
  type Profile,
  type UserFilters,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/lib/services/user.repository';

// ============================================================================
// MOCKS
// ============================================================================

type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  is: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

type MockSupabaseClient = {
  from: jest.Mock<MockQueryBuilder>;
};

const mockSupabase: MockSupabaseClient = {
  from: jest.fn(),
};

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
// SANITIZATION TESTS (STRUMMY-282 Fix)
// ============================================================================

describe('sanitizeSearchQuery', () => {
  it('should remove PostgREST special characters', () => {
    expect(sanitizeSearchQuery('test%query')).toBe('testquery');
    expect(sanitizeSearchQuery('test_query')).toBe('testquery');
    expect(sanitizeSearchQuery('test*query')).toBe('testquery');
    expect(sanitizeSearchQuery('test(query)')).toBe('testquery');
    expect(sanitizeSearchQuery('test.query,')).toBe('testquery');
  });

  it('should handle injection attempts', () => {
    // Attempt to inject OR condition
    expect(sanitizeSearchQuery('%OR%1=1')).toBe('OR11');

    // Attempt to inject wildcards
    expect(sanitizeSearchQuery('%%admin%%')).toBe('admin');

    // Attempt to inject parentheses
    expect(sanitizeSearchQuery('(admin)')).toBe('admin');
  });

  it('should limit query length to 100 characters', () => {
    const longQuery = 'a'.repeat(150);
    const sanitized = sanitizeSearchQuery(longQuery);
    expect(sanitized.length).toBe(100);
  });

  it('should trim whitespace', () => {
    expect(sanitizeSearchQuery('  test  ')).toBe('test');
  });

  it('should handle empty input', () => {
    expect(sanitizeSearchQuery('')).toBe('');
    expect(sanitizeSearchQuery('   ')).toBe('');
  });

  it('should preserve safe characters', () => {
    expect(sanitizeSearchQuery('John Doe')).toBe('John Doe');
    expect(sanitizeSearchQuery('test@example.com')).toBe('test@examplecom'); // . removed
    expect(sanitizeSearchQuery('user-123')).toBe('user-123');
  });
});

// ============================================================================
// QUERY BUILDER TESTS
// ============================================================================

describe('buildUserQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow admins to see all users', () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    buildUserQuery(mockSupabase as unknown as SupabaseClient, 'admin-id', adminProfile);

    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockQuery.select).toHaveBeenCalledWith(
      'id, email, full_name, phone, avatar_url, is_admin, is_teacher, is_student, is_shadow, is_active, is_development, student_status, status_changed_at, notes, created_at, updated_at',
      { count: 'exact' }
    );
  });

  it('should restrict teachers to their students', () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const allowedStudents = ['student-1', 'student-2'];
    buildUserQuery(
      mockSupabase as unknown as SupabaseClient,
      'teacher-id',
      teacherProfile,
      allowedStudents
    );

    expect(mockQuery.in).toHaveBeenCalledWith('id', allowedStudents);
  });

  it('should restrict students to themselves only', () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    buildUserQuery(mockSupabase as unknown as SupabaseClient, 'student-id', studentProfile);

    expect(mockQuery.eq).toHaveBeenCalledWith('id', 'student-id');
  });

  it('should return no results for users with no role', () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    buildUserQuery(mockSupabase as unknown as SupabaseClient, 'no-role-id', noRoleProfile);

    expect(mockQuery.eq).toHaveBeenCalledWith(
      'id',
      '00000000-0000-0000-0000-000000000000'
    );
  });
});

// ============================================================================
// FILTER APPLICATION TESTS
// ============================================================================

describe('applyUserFilters', () => {
  let mockQuery: MockQueryBuilder;

  beforeEach(() => {
    mockQuery = {
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
  });

  it('should apply sanitized search filter', () => {
    const filters: UserFilters = {
      search: 'john%doe',
    };

    applyUserFilters(mockQuery, filters);

    // Should sanitize % to prevent injection
    expect(mockQuery.or).toHaveBeenCalledWith(
      expect.stringContaining('johndoe')
    );
  });

  it('should skip empty search queries', () => {
    const filters: UserFilters = {
      search: '   ',
    };

    applyUserFilters(mockQuery, filters);

    expect(mockQuery.or).not.toHaveBeenCalled();
  });

  it('should apply role filter - admin', () => {
    const filters: UserFilters = {
      role: 'admin',
    };

    applyUserFilters(mockQuery, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('is_admin', true);
  });

  it('should apply role filter - teacher', () => {
    const filters: UserFilters = {
      role: 'teacher',
    };

    applyUserFilters(mockQuery, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('is_teacher', true);
  });

  it('should apply role filter - student', () => {
    const filters: UserFilters = {
      role: 'student',
    };

    applyUserFilters(mockQuery, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('is_student', true);
  });

  it('should apply role filter - shadow', () => {
    const filters: UserFilters = {
      role: 'shadow',
    };

    applyUserFilters(mockQuery, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('is_shadow', true);
  });

  it('should apply active status filter', () => {
    const filters: UserFilters = {
      isActive: true,
    };

    applyUserFilters(mockQuery, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('should apply student status filter', () => {
    const filters: UserFilters = {
      studentStatus: 'active',
    };

    applyUserFilters(mockQuery, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('student_status', 'active');
  });

  it('should exclude shadow users when requested', () => {
    const filters: UserFilters = {
      excludeShadow: true,
    };

    applyUserFilters(mockQuery, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('is_shadow', false);
  });

  it('should apply multiple filters together', () => {
    const filters: UserFilters = {
      search: 'test',
      role: 'student',
      isActive: true,
      excludeShadow: true,
    };

    applyUserFilters(mockQuery, filters);

    expect(mockQuery.or).toHaveBeenCalled();
    expect(mockQuery.eq).toHaveBeenCalledWith('is_student', true);
    expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
    expect(mockQuery.eq).toHaveBeenCalledWith('is_shadow', false);
  });
});

// ============================================================================
// HELPER QUERY TESTS
// ============================================================================

describe('getStudentIdsForTeacher', () => {
  it('should return unique student IDs from lessons', async () => {
    const mockData = [
      { student_id: 'student-1' },
      { student_id: 'student-2' },
      { student_id: 'student-1' }, // Duplicate
    ];

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({ data: mockData }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getStudentIdsForTeacher(
      mockSupabase as unknown as SupabaseClient,
      'teacher-id'
    );

    expect(result).toEqual(['student-1', 'student-2']);
    expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
    expect(mockQuery.eq).toHaveBeenCalledWith('teacher_id', 'teacher-id');
    expect(mockQuery.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('should handle no lessons', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({ data: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getStudentIdsForTeacher(
      mockSupabase as unknown as SupabaseClient,
      'teacher-id'
    );

    expect(result).toEqual([]);
  });
});

// ============================================================================
// READ OPERATION TESTS
// ============================================================================

describe('getUserById', () => {
  it('should allow admins to fetch any user', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUserById(
      mockSupabase as unknown as SupabaseClient,
      'user-1',
      'admin-id',
      adminProfile
    );

    expect(result.data).toEqual(mockUser);
    expect(result.error).toBeNull();
  });

  it('should deny students access to other users', async () => {
    const result = await getUserById(
      mockSupabase as unknown as SupabaseClient,
      'other-user-id',
      'student-id',
      studentProfile
    );

    expect(result.data).toBeNull();
    expect(result.error).toBe('Access denied');
  });

  it('should allow students to fetch themselves', async () => {
    const mockUser = { id: 'student-id', email: 'student@example.com' };

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUserById(
      mockSupabase as unknown as SupabaseClient,
      'student-id',
      'student-id',
      studentProfile
    );

    expect(result.data).toEqual(mockUser);
    expect(result.error).toBeNull();
  });

  it('should handle database errors', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Database error' } }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUserById(
      mockSupabase as unknown as SupabaseClient,
      'user-1',
      'admin-id',
      adminProfile
    );

    expect(result.data).toBeNull();
    expect(result.error).toBe('Database error');
  });
});

describe('getUsers', () => {
  it('should return empty array for teachers with no students', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({ data: [] }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUsers(
      mockSupabase as unknown as SupabaseClient,
      'teacher-id',
      teacherProfile
    );

    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('should apply pagination correctly', async () => {
    const mockData = [{ id: 'user-1' }, { id: 'user-2' }];

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockData, count: 10, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUsers(
      mockSupabase as unknown as SupabaseClient,
      'admin-id',
      adminProfile,
      {},
      10,
      20
    );

    expect(mockQuery.range).toHaveBeenCalledWith(20, 29);
    expect(result.data).toEqual(mockData);
    expect(result.count).toBe(10);
  });
});

describe('getUsersWithStats', () => {
  it('should include aggregated counts', async () => {
    const mockData = [
      {
        id: 'user-1',
        email: 'test@example.com',
        lessons: [{}, {}],
        assignments: [{}, {}, {}],
      },
    ];

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockData, count: 1, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUsersWithStats(
      mockSupabase as unknown as SupabaseClient,
      'admin-id',
      adminProfile
    );

    expect(result.data[0].lessons_count).toBe(2);
    expect(result.data[0].assignments_count).toBe(3);
  });

  it('should handle zero counts', async () => {
    const mockData = [
      {
        id: 'user-1',
        email: 'test@example.com',
        lessons: null,
        assignments: undefined,
      },
    ];

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockData, count: 1, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUsersWithStats(
      mockSupabase as unknown as SupabaseClient,
      'admin-id',
      adminProfile
    );

    expect(result.data[0].lessons_count).toBe(0);
    expect(result.data[0].assignments_count).toBe(0);
  });
});

// ============================================================================
// WRITE OPERATION TESTS
// ============================================================================

describe('createUserProfile', () => {
  it('should create a user profile with provided data', async () => {
    const input: CreateUserInput = {
      id: 'new-user-id',
      email: 'new@example.com',
      full_name: 'John Doe',
      is_student: true,
    };

    const mockQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: input, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await createUserProfile(
      mockSupabase as unknown as SupabaseClient,
      input
    );

    expect(result.data).toEqual(input);
    expect(result.error).toBeNull();
    expect(mockQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-user-id',
        email: 'new@example.com',
        full_name: 'John Doe',
        is_student: true,
      })
    );
  });

  it('should default is_student to true when not specified', async () => {
    const input: CreateUserInput = {
      id: 'new-user-id',
      email: 'new@example.com',
    };

    const mockQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    await createUserProfile(mockSupabase as unknown as SupabaseClient, input);

    expect(mockQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        is_student: true,
      })
    );
  });
});

describe('updateUserProfile', () => {
  it('should update user profile fields', async () => {
    const input: UpdateUserInput = {
      full_name: 'Updated Name',
      phone: '123-456-7890',
    };

    const mockQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: input, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await updateUserProfile(
      mockSupabase as unknown as SupabaseClient,
      'user-id',
      input
    );

    expect(result.error).toBeNull();
    expect(mockQuery.eq).toHaveBeenCalledWith('id', 'user-id');
    expect(mockQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Updated Name',
        phone: '123-456-7890',
      })
    );
  });
});

describe('deleteUserProfile', () => {
  it('should delete user profile', async () => {
    const mockQuery = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await deleteUserProfile(
      mockSupabase as unknown as SupabaseClient,
      'user-id'
    );

    expect(result.error).toBeNull();
    expect(mockQuery.eq).toHaveBeenCalledWith('id', 'user-id');
  });
});

describe('getUserByEmail', () => {
  it('should find user by email', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUserByEmail(
      mockSupabase as unknown as SupabaseClient,
      'test@example.com'
    );

    expect(result.data).toEqual(mockUser);
    expect(result.error).toBeNull();
    expect(mockQuery.eq).toHaveBeenCalledWith('email', 'test@example.com');
  });

  it('should return null when user not found', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUserByEmail(
      mockSupabase as unknown as SupabaseClient,
      'nonexistent@example.com'
    );

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});
