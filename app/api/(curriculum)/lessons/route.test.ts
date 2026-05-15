/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Lesson API Route Tests
 * Tests for /api/lessons endpoints (GET, POST)
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/(curriculum)/lessons/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Lesson API - Main Route', () => {
  const validStudentId = '00000001-0000-4000-a000-000000000001';
  const validTeacherId = '00000002-0000-4000-a000-000000000002';
  const validUserId = '00000003-0000-4000-a000-000000000003';
  const validLessonId = '00000004-0000-4000-a000-000000000004';

  const mockUser = {
    id: validUserId,
    email: 'teacher@example.com',
  };

  const mockProfile = {
    is_admin: true, // Use admin to bypass teacher restrictions for filtering tests
    is_teacher: true,
    is_student: false,
    user_id: validUserId,
  };

  const mockLesson = {
    id: validLessonId,
    student_id: validStudentId,
    teacher_id: validTeacherId,
    creator_user_id: validUserId,
    title: 'Guitar Basics',
    notes: 'Introduction to guitar',
    date: '2024-01-15T10:00:00Z',
    start_time: '10:00',
    status: 'SCHEDULED',
    lesson_number: 1,
    lesson_teacher_number: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    profile: {
      email: 'student@example.com',
      first_name: 'John',
      last_name: 'Doe',
    },
    teacher_profile: {
      email: 'teacher@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
    },
  };

   
  let mockSupabaseClient: any;
   
  let mockSupabaseQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup query builder mock
    mockSupabaseQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      in: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(), // Added limit
      // Make the object thenable to simulate query execution
      then: jest.fn((resolve) => resolve({ data: [mockLesson], error: null, count: 1 })),
    };

    // Setup client mock
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue(mockSupabaseQueryBuilder),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
  });

  describe('GET /api/lessons', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/lessons');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all lessons for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/lessons');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.lessons).toHaveLength(1);
      expect(data.lessons[0].id).toBe(validLessonId);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('lessons');
    });

    it('should filter lessons by userId', async () => {
      const request = new NextRequest(`http://localhost:3000/api/lessons?userId=${validStudentId}`);
      const response = await GET(request);
      await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabaseQueryBuilder.or).toHaveBeenCalledWith(
        `student_id.eq.${validStudentId},teacher_id.eq.${validStudentId}`
      );
    });

    it('should filter lessons by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/lessons?filter=SCHEDULED');
      const response = await GET(request);
      await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabaseQueryBuilder.eq).toHaveBeenCalledWith('status', 'SCHEDULED');
    });

    it('should ignore invalid status filter (permissive)', async () => {
      const request = new NextRequest('http://localhost:3000/api/lessons?filter=INVALID_STATUS');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseQueryBuilder.eq).toHaveBeenCalledWith('status', 'INVALID_STATUS');
    });

    it('should sort lessons by date', async () => {
      const request = new NextRequest('http://localhost:3000/api/lessons?sort=date');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseQueryBuilder.select).toHaveBeenCalled();
      expect(mockSupabaseQueryBuilder.order).toHaveBeenCalledWith('date', {
        ascending: false,
      });
    });

    it('should filter lessons by studentId', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/lessons?studentId=${validStudentId}`
      );
      const response = await GET(request);
      await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabaseQueryBuilder.eq).toHaveBeenCalledWith('student_id', validStudentId);
    });

    it('should ignore invalid studentId format (permissive)', async () => {
      const request = new NextRequest('http://localhost:3000/api/lessons?studentId=invalid-uuid');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should handle database errors gracefully', async () => {
      // For admin, it goes straight to query
      mockSupabaseQueryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) =>
        resolve({
          data: null,
          error: { message: 'Database connection failed' },
          count: 0,
        })
      );

      const request = new NextRequest('http://localhost:3000/api/lessons');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle lessons with null profile data', async () => {
      const lessonWithNullProfile = {
        ...mockLesson,
        profile: null,
        teacher_profile: null,
      };

      mockSupabaseQueryBuilder.then.mockImplementation((resolve: (value: unknown) => void) =>
        resolve({
          data: [lessonWithNullProfile],
          error: null,
          count: 1,
        })
      );

      const request = new NextRequest('http://localhost:3000/api/lessons');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.lessons).toHaveLength(1);
      expect(data.lessons[0].profile).toBeNull();
    });

    it('should handle lessons with missing optional fields', async () => {
      const minimalLesson = {
        id: validLessonId,
        student_id: validStudentId,
        teacher_id: validTeacherId,
        creator_user_id: validUserId,
        status: 'SCHEDULED',
        date: '2024-01-15T10:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseQueryBuilder.then.mockImplementation((resolve: (value: unknown) => void) =>
        resolve({
          data: [minimalLesson],
          error: null,
          count: 1,
        })
      );

      const request = new NextRequest('http://localhost:3000/api/lessons');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.lessons).toHaveLength(1);
    });
  });

  describe('POST /api/lessons', () => {
    beforeEach(() => {
      // Reset mocks for POST tests
      // Default single implementation for profile check
      mockSupabaseQueryBuilder.single.mockResolvedValue({ data: mockProfile, error: null });
    });

    it('should return unauthorized if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/lessons', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return forbidden if user is not admin or teacher', async () => {
      mockSupabaseQueryBuilder.single.mockResolvedValue({
        data: { ...mockProfile, is_teacher: false, is_admin: false },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/lessons', {
        method: 'POST',
        body: JSON.stringify({
          student_id: validStudentId,
          teacher_id: validTeacherId,
          date: '2024-01-15',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only admins and teachers can create lessons');
    });

    it('should create a lesson with valid data', async () => {
      // 1. Profile check
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });
      // 2. Next lesson number check
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: { lesson_teacher_number: 0 },
        error: null,
      });
      // 3. Insert result
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockLesson,
        error: null,
      });

      const lessonData = {
        student_id: validStudentId,
        teacher_id: validTeacherId,
        title: 'Guitar Basics',
        notes: 'Introduction to guitar',
        date: '2024-01-15',
        start_time: '10:00',
      };

      const request = new NextRequest('http://localhost:3000/api/lessons', {
        method: 'POST',
        body: JSON.stringify(lessonData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe(validLessonId);
      expect(mockSupabaseQueryBuilder.insert).toHaveBeenCalled();
    });

    it('should return validation error for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/lessons', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Guitar Basics',
          // Missing student_id and teacher_id
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation error');
    });

    it('should return validation error for invalid UUID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/lessons', {
        method: 'POST',
        body: JSON.stringify({
          student_id: 'invalid-uuid',
          teacher_id: validTeacherId,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation error');
    });

    it('should handle database insertion errors', async () => {
      // 1. Profile check
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });
      // 2. Next lesson number check
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: { lesson_teacher_number: 0 },
        error: null,
      });
      // 3. Insert error
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const request = new NextRequest('http://localhost:3000/api/lessons', {
        method: 'POST',
        body: JSON.stringify({
          student_id: validStudentId,
          teacher_id: validTeacherId,
          date: '2024-01-15',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });

    it('should set default status to SCHEDULED if not provided', async () => {
      // 1. Profile check
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });
      // 2. Next lesson number check
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: { lesson_teacher_number: 0 },
        error: null,
      });
      // 3. Insert result
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockLesson, status: 'SCHEDULED' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/lessons', {
        method: 'POST',
        body: JSON.stringify({
          student_id: validStudentId,
          teacher_id: validTeacherId,
          date: '2024-01-15',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.status).toBe('SCHEDULED');
    });
  });
});
