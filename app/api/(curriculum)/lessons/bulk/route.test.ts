/**
 * Lesson API Bulk Operations Tests
 * Tests for /api/lessons/bulk endpoints (POST, PUT, DELETE)
 */

import { NextRequest } from 'next/server';
import { POST, PUT, DELETE } from '@/app/api/(curriculum)/lessons/bulk/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Lesson API - Bulk Operations', () => {
  const validStudentId = '00000001-0000-4000-a000-000000000001';
  const validTeacherId = '00000002-0000-4000-a000-000000000002';
  const validUserId = '00000003-0000-4000-a000-000000000003';
  const validLessonId1 = '00000004-0000-4000-a000-000000000004';
  const validLessonId2 = '00000005-0000-4000-a000-000000000005';
  const validLessonId3 = '00000006-0000-4000-a000-000000000006';

  const mockUser = {
    id: validUserId,
    email: 'teacher@example.com',
  };

  const mockProfile = {
    role: 'teacher',
    user_id: validUserId,
  };

  const mockLesson = {
    id: validLessonId1,
    student_id: validStudentId,
    teacher_id: validTeacherId,
    creator_user_id: validUserId,
    title: 'Guitar Basics',
    date: '2024-01-15T10:00:00Z',
    status: 'SCHEDULED',
    created_at: '2024-01-01T00:00:00Z',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabaseClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let profileBuilder: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lessonBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Profile builder mock
    profileBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
    };

    // Lesson builder mock
    lessonBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [] }), // For lesson number check
      single: jest.fn().mockResolvedValue({ data: mockLesson, error: null }),
      // For delete/update without select/single, we need to be thenable
      then: jest.fn((resolve) => resolve({ data: [mockLesson], error: null })),
    };

    // Setup client mock
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: jest.fn((table) => {
        if (table === 'profiles') return profileBuilder;
        if (table === 'lessons') return lessonBuilder;
        return { select: jest.fn().mockReturnThis() };
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
  });

  describe('POST /api/lessons/bulk (Bulk Create)', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'POST',
        body: JSON.stringify({ lessons: [] }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return forbidden if user is not admin or teacher', async () => {
      profileBuilder.single.mockResolvedValue({
        data: { role: 'student' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'POST',
        body: JSON.stringify({ lessons: [] }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return error if lessons array is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Lessons array is required and cannot be empty');
    });

    it('should return error if lessons array is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'POST',
        body: JSON.stringify({ lessons: [] }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Lessons array is required and cannot be empty');
    });

    it('should return error if more than 100 lessons', async () => {
      const lessons = Array(101).fill({
        student_id: validStudentId,
        teacher_id: validTeacherId,
      });

      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'POST',
        body: JSON.stringify({ lessons }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot process more than 100 lessons at once');
    });

    it('should create multiple lessons successfully', async () => {
      const lessons = [
        {
          student_id: validStudentId,
          teacher_id: validTeacherId,
          date: '2024-01-15T10:00:00Z',
        },
        {
          student_id: validStudentId,
          teacher_id: validTeacherId,
          date: '2024-01-16T10:00:00Z',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'POST',
        body: JSON.stringify({ lessons }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(2);
      expect(data.failed).toBe(0);
      expect(data.created).toHaveLength(2);
    });

    it('should handle validation errors for individual lessons', async () => {
      const lessons = [
        {
          student_id: validStudentId,
          teacher_id: validTeacherId,
          date: '2024-01-15T10:00:00Z',
        },
        {
          // Missing required fields (student_id, teacher_id)
          title: 'Invalid Lesson',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'POST',
        body: JSON.stringify({ lessons }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].error).toBe('Validation failed');
    });

    it('should handle database errors for individual lessons', async () => {
      // First lesson succeeds
      lessonBuilder.single.mockResolvedValueOnce({
        data: mockLesson,
        error: null,
      });

      // Second lesson fails
      lessonBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const lessons = [
        {
          student_id: validStudentId,
          teacher_id: validTeacherId,
          date: '2024-01-15T10:00:00Z',
        },
        {
          student_id: validStudentId,
          teacher_id: validTeacherId,
          date: '2024-01-16T10:00:00Z',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'POST',
        body: JSON.stringify({ lessons }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(1);
      expect(data.failed).toBe(1);
    });
  });

  describe('PUT /api/lessons/bulk (Bulk Update)', () => {
    it('should update multiple lessons successfully', async () => {
      const updates = [
        {
          id: validLessonId1,
          title: 'Updated Title 1',
        },
        {
          id: validLessonId2,
          status: 'COMPLETED',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'PUT',
        body: JSON.stringify({ updates }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(2);
      expect(data.failed).toBe(0);
    });

    it('should return error if ID is missing in update', async () => {
      const updates = [
        {
          title: 'Updated Title',
          // Missing id
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'PUT',
        body: JSON.stringify({ updates }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].error).toBe('Lesson ID is required');
    });
  });

  describe('DELETE /api/lessons/bulk (Bulk Delete)', () => {
    it('should delete multiple lessons successfully', async () => {
      // Mock delete success
      lessonBuilder.then = jest.fn((resolve) => resolve({ error: null }));

      const lessonIds = [validLessonId1, validLessonId2, validLessonId3];

      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ lessonIds }),
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(3);
      expect(data.failed).toBe(0);
      expect(data.deleted).toHaveLength(3);
    });

    it('should return error if lessonIds array is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Lesson IDs array is required and cannot be empty');
    });

    it('should handle deletion errors for individual lessons', async () => {
      // Mock delete responses
      // First two succeed, third fails
      lessonBuilder.then = jest
        .fn()
        .mockImplementationOnce((resolve) => resolve({ error: null }))
        .mockImplementationOnce((resolve) => resolve({ error: null }))
        .mockImplementationOnce((resolve) => resolve({ error: { message: 'Not found' } }));

      const lessonIds = [validLessonId1, validLessonId2, validLessonId3];

      const request = new NextRequest('http://localhost:3000/api/lessons/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ lessonIds }),
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(2);
      expect(data.failed).toBe(1);
    });
  });
});
