/**
 * Lesson API [id] Route Tests
 * Tests for /api/lessons/[id] endpoints (GET, PUT, DELETE)
 */

import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/(curriculum)/lessons/[id]/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Lesson API - [id] Route', () => {
  const validStudentId = '00000000-0000-0000-0000-000000000001';
  const validTeacherId = '00000000-0000-0000-0000-000000000002';
  const validUserId = '00000000-0000-0000-0000-000000000003';
  const validLessonId = '00000000-0000-0000-0000-000000000004';

  const mockUser = {
    id: validUserId,
    email: 'teacher@example.com',
  };

  const mockProfile = {
    id: validUserId,
    is_admin: true,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabaseClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabaseQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup query builder mock
    mockSupabaseQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(), // No default implementation
      maybeSingle: jest.fn(),
      // Make the object thenable to simulate query execution
      then: jest.fn((resolve) => resolve({ data: mockLesson, error: null })),
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

  describe('GET /api/lessons/[id]', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${validLessonId}`);
      const params = Promise.resolve({ id: validLessonId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return a lesson by id', async () => {
      // 1. Profile fetch
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });
      // 2. Lesson fetch
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockLesson,
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${validLessonId}`);
      const params = Promise.resolve({ id: validLessonId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(validLessonId);
    });

    it('should return 404 if lesson is not found', async () => {
      // 1. Profile fetch
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });
      // 2. Lesson fetch (not found)
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${validLessonId}`);
      const params = Promise.resolve({ id: validLessonId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Lesson not found');
    });

    it('should handle database errors', async () => {
      // 1. Profile fetch
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });
      // 2. Lesson fetch (error)
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${validLessonId}`);
      const params = Promise.resolve({ id: validLessonId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });

  describe('PUT /api/lessons/[id]', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/lessons/${validLessonId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated Title' }),
        }
      );
      const params = Promise.resolve({ id: validLessonId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return forbidden if user is not admin or teacher', async () => {
      // 1. Profile fetch (student)
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockProfile, is_teacher: false, is_admin: false },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/lessons/${validLessonId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated Title' }),
        }
      );
      const params = Promise.resolve({ id: validLessonId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only admins and teachers can update lessons');
    });

    it('should update a lesson with valid data', async () => {
      // 1. Profile fetch
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });
      // 2. Update result
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockLesson, title: 'Updated Title' },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/lessons/${validLessonId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated Title' }),
        }
      );
      const params = Promise.resolve({ id: validLessonId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
      expect(mockSupabaseQueryBuilder.update).toHaveBeenCalled();
    });

    it('should return 404 if lesson does not exist', async () => {
      // 1. Profile fetch
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });
      // 2. Update result (not found)
      // The handler likely uses update().eq().select().single()
      // If update finds no rows, single() returns PGRST116
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/lessons/${validLessonId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated Title' }),
        }
      );
      const params = Promise.resolve({ id: validLessonId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Lesson not found');
    });

    it('should return validation error for invalid update data', async () => {
      // 1. Profile fetch
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/lessons/${validLessonId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: 'INVALID_STATUS' }),
        }
      );
      const params = Promise.resolve({ id: validLessonId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation error');
    });
  });

  describe('DELETE /api/lessons/[id]', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/lessons/${validLessonId}`,
        {
          method: 'DELETE',
        }
      );
      const params = Promise.resolve({ id: validLessonId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return forbidden if user is not admin or teacher', async () => {
      // 1. Profile fetch (student)
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockProfile, is_teacher: false, is_admin: false },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/lessons/${validLessonId}`,
        {
          method: 'DELETE',
        }
      );
      const params = Promise.resolve({ id: validLessonId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only admins and teachers can delete lessons');
    });

    it('should delete a lesson successfully', async () => {
      // 1. Profile fetch
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });
      
      // 2. Delete result
      // The handler likely uses delete().eq() and checks error
      // It might NOT use single() or select() if it just deletes.
      // But if it returns the deleted lesson, it uses select().single()
      // Let's assume it just checks for error based on previous test failure analysis (it didn't fail on this step before)
      
      // However, the previous test passed!
      // "should delete a lesson successfully" passed.
      // That means my previous mock setup for DELETE was "good enough" or lucky.
      // Previous setup:
      // mockSupabaseQueryBuilder.eq.mockReturnThis();
      // mockSupabaseQueryBuilder.then = jest.fn((resolve) => resolve({ error: null }));
      
      // I'll stick to that for DELETE, but I need to handle the profile fetch first.
      
      // Wait, if I use `mockResolvedValueOnce` for single(), it only affects `single()`.
      // `delete()` returns the builder. `eq()` returns the builder.
      // `then()` is called at the end.
      // If `deleteLessonHandler` calls `single()` (e.g. to return the deleted lesson), I need to mock it.
      // If it just awaits the query builder, `then()` is called.
      
      // Let's check `deleteLessonHandler` in `handlers.ts` if possible, or just assume standard Supabase usage.
      // Usually `delete().eq('id', id)` returns `{ error, count, data }`.
      
      // I will mock `then` to return success.
      mockSupabaseQueryBuilder.then = jest.fn((resolve) => resolve({ error: null }));

      const request = new NextRequest(
        `http://localhost:3000/api/lessons/${validLessonId}`,
        {
          method: 'DELETE',
        }
      );
      const params = Promise.resolve({ id: validLessonId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle database errors', async () => {
      // 1. Profile fetch
      mockSupabaseQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });
      
      // 2. Delete error
      mockSupabaseQueryBuilder.then = jest.fn((resolve) => resolve({ error: { message: 'Database connection failed' } }));

      const request = new NextRequest(
        `http://localhost:3000/api/lessons/${validLessonId}`,
        {
          method: 'DELETE',
        }
      );
      const params = Promise.resolve({ id: validLessonId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });
});
