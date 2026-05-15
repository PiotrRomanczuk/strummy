/**
 * Student Export API Security Tests
 *
 * Tests for access control fix (STRUMMY-280).
 * Verifies that only authorized users can export student data.
 *
 * Authorization Rules:
 * - Admins: Can export any student's data
 * - Teachers: Can export their students' data only
 * - Students: Can export their own data only
 * - Unauthorized users: Cannot export any data
 */

import { GET } from '../[id]/route';
import { NextRequest } from 'next/server';
import * as getUserWithRolesSSR from '@/lib/getUserWithRolesSSR';
import * as userService from '@/lib/services/user.service';
import * as userRepository from '@/lib/repositories/user.repository';
import * as supabaseServer from '@/lib/supabase/server';

// Mock modules
jest.mock('@/lib/getUserWithRolesSSR');
jest.mock('@/lib/services/user.service');
jest.mock('@/lib/repositories/user.repository');
jest.mock('@/lib/supabase/server');

const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

// Helper to create mock request
const createMockRequest = (studentId: string, format = 'json') => {
  const url = `http://localhost:3000/api/exports/student/${studentId}?format=${format}`;
  return new NextRequest(url);
};

// Helper to create mock params
const createMockParams = (id: string) => Promise.resolve({ id });

describe('GET /api/exports/student/[id] - Access Control (STRUMMY-280)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabaseServer.createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      (getUserWithRolesSSR.getUserWithRolesSSR as jest.Mock).mockResolvedValue({
        user: null,
        isAdmin: false,
        isTeacher: false,
        isStudent: false,
        isDevelopment: false,
      });

      const request = createMockRequest('student-123');
      const params = createMockParams('student-123');

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Admin Authorization', () => {
    it('should allow admins to export any student data', async () => {
      (getUserWithRolesSSR.getUserWithRolesSSR as jest.Mock).mockResolvedValue({
        user: { id: 'admin-id' },
        isAdmin: true,
        isTeacher: false,
        isStudent: false,
        isDevelopment: false,
      });

      (userService.canViewUser as jest.Mock).mockReturnValue({
        allowed: true,
      });

      // Mock successful data fetch
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'student-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = createMockRequest('student-123');
      const params = createMockParams('student-123');

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(userService.canViewUser).toHaveBeenCalledWith(
        'admin-id',
        { isAdmin: true, isTeacher: false, isStudent: false },
        'student-123',
        undefined
      );
    });
  });

  describe('Teacher Authorization', () => {
    it('should allow teachers to export their students data', async () => {
      (getUserWithRolesSSR.getUserWithRolesSSR as jest.Mock).mockResolvedValue({
        user: { id: 'teacher-id' },
        isAdmin: false,
        isTeacher: true,
        isStudent: false,
        isDevelopment: false,
      });

      (userRepository.getStudentIdsForTeacher as jest.Mock).mockResolvedValue([
        'student-123',
        'student-456',
      ]);

      (userService.canViewUser as jest.Mock).mockReturnValue({
        allowed: true,
      });

      // Mock successful data fetch
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'student-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = createMockRequest('student-123');
      const params = createMockParams('student-123');

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(userRepository.getStudentIdsForTeacher).toHaveBeenCalledWith(
        mockSupabase,
        'teacher-id'
      );
      expect(userService.canViewUser).toHaveBeenCalledWith(
        'teacher-id',
        { isAdmin: false, isTeacher: true, isStudent: false },
        'student-123',
        ['student-123', 'student-456']
      );
    });

    it('should deny teachers from exporting non-students data', async () => {
      (getUserWithRolesSSR.getUserWithRolesSSR as jest.Mock).mockResolvedValue({
        user: { id: 'teacher-id' },
        isAdmin: false,
        isTeacher: true,
        isStudent: false,
        isDevelopment: false,
      });

      (userRepository.getStudentIdsForTeacher as jest.Mock).mockResolvedValue([
        'student-123', // Teacher's students
      ]);

      (userService.canViewUser as jest.Mock).mockReturnValue({
        allowed: false,
        reason: 'Teachers can only view their students',
      });

      const request = createMockRequest('other-student-id');
      const params = createMockParams('other-student-id');

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Teachers can only view their students');
      expect(userService.canViewUser).toHaveBeenCalledWith(
        'teacher-id',
        { isAdmin: false, isTeacher: true, isStudent: false },
        'other-student-id',
        ['student-123']
      );
    });
  });

  describe('Student Authorization', () => {
    it('should allow students to export their own data', async () => {
      (getUserWithRolesSSR.getUserWithRolesSSR as jest.Mock).mockResolvedValue({
        user: { id: 'student-123' },
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
        isDevelopment: false,
      });

      (userService.canViewUser as jest.Mock).mockReturnValue({
        allowed: true,
      });

      // Mock successful data fetch
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'student-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = createMockRequest('student-123');
      const params = createMockParams('student-123');

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(userService.canViewUser).toHaveBeenCalledWith(
        'student-123',
        { isAdmin: false, isTeacher: false, isStudent: true },
        'student-123',
        undefined
      );
    });

    it('should deny students from exporting other students data', async () => {
      (getUserWithRolesSSR.getUserWithRolesSSR as jest.Mock).mockResolvedValue({
        user: { id: 'student-123' },
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
        isDevelopment: false,
      });

      (userService.canViewUser as jest.Mock).mockReturnValue({
        allowed: false,
        reason: 'Students can only view their own profile',
      });

      const request = createMockRequest('other-student-id');
      const params = createMockParams('other-student-id');

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Students can only view their own profile');
      expect(userService.canViewUser).toHaveBeenCalledWith(
        'student-123',
        { isAdmin: false, isTeacher: false, isStudent: true },
        'other-student-id',
        undefined
      );
    });
  });

  describe('No Role Authorization', () => {
    it('should deny users with no role from exporting data', async () => {
      (getUserWithRolesSSR.getUserWithRolesSSR as jest.Mock).mockResolvedValue({
        user: { id: 'no-role-id' },
        isAdmin: false,
        isTeacher: false,
        isStudent: false,
        isDevelopment: false,
      });

      (userService.canViewUser as jest.Mock).mockReturnValue({
        allowed: false,
        reason: 'No access',
      });

      const request = createMockRequest('student-123');
      const params = createMockParams('student-123');

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('No access');
    });
  });

  describe('Format Support', () => {
    it('should respect format parameter when authorized', async () => {
      (getUserWithRolesSSR.getUserWithRolesSSR as jest.Mock).mockResolvedValue({
        user: { id: 'admin-id' },
        isAdmin: true,
        isTeacher: false,
        isStudent: false,
        isDevelopment: false,
      });

      (userService.canViewUser as jest.Mock).mockReturnValue({
        allowed: true,
      });

      // Mock successful data fetch
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'student-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = createMockRequest('student-123', 'json');
      const params = createMockParams('student-123');

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      // JSON format returns JSON response
      const data = await response.json();
      expect(data.student).toBeDefined();
    });
  });

  describe('Authorization Before Data Fetch', () => {
    it('should check authorization before fetching sensitive data', async () => {
      (getUserWithRolesSSR.getUserWithRolesSSR as jest.Mock).mockResolvedValue({
        user: { id: 'student-123' },
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
        isDevelopment: false,
      });

      (userService.canViewUser as jest.Mock).mockReturnValue({
        allowed: false,
        reason: 'Access denied',
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = createMockRequest('other-student-id');
      const params = createMockParams('other-student-id');

      const response = await GET(request, { params });

      expect(response.status).toBe(403);
      // Verify that database query was NOT called due to authorization failure
      expect(mockQuery.single).not.toHaveBeenCalled();
    });
  });
});
