/**
 * Unit tests for unsubscribe API route
 *
 * Tests the GET endpoint for unsubscribing from notifications
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => {
            if (table === 'profiles') {
              return {
                data: { id: 'user-123', email: 'test@example.com' },
                error: null,
              };
            }
            return { data: null, error: null };
          }),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

describe('Unsubscribe API Route', () => {
  const mockUserId = 'user-123';
  const mockNotificationType = 'lesson_reminder_24h';

  describe('GET /api/notifications/unsubscribe', () => {
    it('should redirect to success page with valid params', async () => {
      const url = `http://localhost:3000/api/notifications/unsubscribe?userId=${mockUserId}&type=${mockNotificationType}`;
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get('location');
      expect(location).toContain('/unsubscribe');
      expect(location).toContain('success=true');
      expect(location).toContain(`type=${mockNotificationType}`);
    });

    it('should redirect to error page with missing userId', async () => {
      const url = `http://localhost:3000/api/notifications/unsubscribe?type=${mockNotificationType}`;
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/unsubscribe');
      expect(location).toContain('error=missing_params');
    });

    it('should redirect to error page with missing type', async () => {
      const url = `http://localhost:3000/api/notifications/unsubscribe?userId=${mockUserId}`;
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/unsubscribe');
      expect(location).toContain('error=missing_params');
    });

    it('should redirect to error page with invalid notification type', async () => {
      const url = `http://localhost:3000/api/notifications/unsubscribe?userId=${mockUserId}&type=invalid_type`;
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/unsubscribe');
      expect(location).toContain('error=invalid_type');
    });

    it('should handle URL encoding correctly', async () => {
      const encodedUserId = encodeURIComponent(mockUserId);
      const encodedType = encodeURIComponent(mockNotificationType);
      const url = `http://localhost:3000/api/notifications/unsubscribe?userId=${encodedUserId}&type=${encodedType}`;
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/unsubscribe');
      expect(location).toContain('success=true');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error
      jest.clearAllMocks();
      jest.mock('@/lib/supabase/server', () => ({
        createClient: jest.fn(() => ({
          from: jest.fn(() => ({
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: null,
                  error: { message: 'Database error' },
                })),
              })),
            })),
          })),
        })),
      }));

      const url = `http://localhost:3000/api/notifications/unsubscribe?userId=${mockUserId}&type=${mockNotificationType}`;
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/unsubscribe');
      expect(location).toContain('error=');
    });
  });

  describe('Notification Types', () => {
    const validTypes = [
      'lesson_reminder_24h',
      'lesson_recap',
      'lesson_cancelled',
      'lesson_rescheduled',
      'assignment_created',
      'assignment_due_reminder',
      'assignment_overdue_alert',
      'assignment_completed',
      'song_mastery_achievement',
      'milestone_reached',
      'student_welcome',
      'trial_ending_reminder',
      'teacher_daily_summary',
      'weekly_progress_digest',
      'calendar_conflict_alert',
      'webhook_expiration_notice',
      'admin_error_alert',
    ];

    validTypes.forEach((type) => {
      it(`should accept valid notification type: ${type}`, async () => {
        const url = `http://localhost:3000/api/notifications/unsubscribe?userId=${mockUserId}&type=${type}`;
        const request = new NextRequest(url);

        const response = await GET(request);

        const location = response.headers.get('location');
        expect(location).not.toContain('error=invalid_type');
      });
    });
  });
});
