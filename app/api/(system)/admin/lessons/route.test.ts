import { GET, POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { getLessonsHandler, createLessonHandler } from '../../lessons/handlers';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('../../lessons/handlers', () => ({
  getLessonsHandler: jest.fn(),
  createLessonHandler: jest.fn(),
}));

describe('Admin Lessons API', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET', () => {
    it('returns 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      
      const req = new NextRequest('http://localhost/api/admin/lessons');
      const res = await GET(req);
      
      expect(res.status).toBe(401);
    });

    it('returns 403 if not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } } });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [{ role: 'student' }], error: null }),
        }),
      });

      const req = new NextRequest('http://localhost/api/admin/lessons');
      const res = await GET(req);
      
      expect(res.status).toBe(403);
    });

    it('returns lessons if admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin1' } } });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [{ role: 'admin' }], error: null }),
        }),
      });

      (getLessonsHandler as jest.Mock).mockResolvedValue({
        lessons: [{ id: 1 }],
        count: 1,
        status: 200,
      });

      const req = new NextRequest('http://localhost/api/admin/lessons?page=1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.lessons).toHaveLength(1);
      expect(getLessonsHandler).toHaveBeenCalled();
    });

    it('handles handler errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin1' } } });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [{ role: 'admin' }], error: null }),
        }),
      });

      (getLessonsHandler as jest.Mock).mockResolvedValue({
        error: 'DB Error',
        status: 500,
      });

      const req = new NextRequest('http://localhost/api/admin/lessons');
      const res = await GET(req);
      
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    it('returns 401 if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      
      const req = new NextRequest('http://localhost/api/admin/lessons', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      
      expect(res.status).toBe(401);
    });

    it('returns 403 if not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } } });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [{ role: 'student' }], error: null }),
        }),
      });

      const req = new NextRequest('http://localhost/api/admin/lessons', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      
      expect(res.status).toBe(403);
    });

    it('creates lesson if admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin1' } } });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [{ role: 'admin' }], error: null }),
        }),
      });

      (createLessonHandler as jest.Mock).mockResolvedValue({
        lesson: { id: 1 },
        status: 201,
      });

      const req = new NextRequest('http://localhost/api/admin/lessons', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Lesson' }),
      });
      const res = await POST(req);
      
      expect(res.status).toBe(201);
      expect(createLessonHandler).toHaveBeenCalled();
    });
  });
});
