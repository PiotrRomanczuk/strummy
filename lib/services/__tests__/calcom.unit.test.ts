import crypto from 'crypto';
import { verifyCalcomSignature, processCalcomBookingPayload, CalcomBookingPayload } from '../calcom';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

describe('Cal.com Integration Service', () => {
  const mockSupabase = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('verifyCalcomSignature', () => {
    it('returns true when secret is undefined', () => {
      expect(verifyCalcomSignature('rawbody', 'sig', undefined)).toBe(true);
    });

    it('returns false when signature is missing', () => {
      expect(verifyCalcomSignature('rawbody', null, 'secret')).toBe(false);
    });

    it('verifies valid HMAC sha256 signature', () => {
      const secret = 'mysecret';
      const body = JSON.stringify({ test: 123 });
      const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

      expect(verifyCalcomSignature(body, validSig, secret)).toBe(true);
    });
  });

  describe('processCalcomBookingPayload', () => {
    it('throws if no attendee email is present', async () => {
      const payload: CalcomBookingPayload = {
        triggerEvent: 'BOOKING_CREATED',
        startTime: '2026-08-10T10:00:00Z',
        attendees: [],
      };

      await expect(processCalcomBookingPayload(payload)).rejects.toThrow(
        'Cal.com webhook missing attendee email'
      );
    });

    it('creates shadow student profile and schedules trial lesson on BOOKING_CREATED', async () => {
      const payload: CalcomBookingPayload = {
        triggerEvent: 'BOOKING_CREATED',
        uid: 'cal_booking_123',
        startTime: '2026-08-10T10:00:00.000Z',
        endTime: '2026-08-10T10:45:00.000Z',
        title: 'Trial Lesson - Guitar',
        description: 'First lesson with beginner student',
        attendees: [{ name: 'Alex Smith', email: 'alex@example.com' }],
      };

      // Mock teacher query
      const mockTeacherChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { user_id: 'teacher_uuid_1' } }),
      };

      // Mock profiles lookup (existing profile null)
      const mockProfilesChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'student_uuid_1' }, error: null }),
      };

      // Mock lessons lookup and insert
      const mockLessonsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'lesson_uuid_1' }, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_roles') return mockTeacherChain;
        if (table === 'profiles') return mockProfilesChain;
        if (table === 'lessons') return mockLessonsChain;
        return {};
      });

      const result = await processCalcomBookingPayload(payload);

      expect(result).toEqual({
        success: true,
        action: 'created',
        lessonId: 'lesson_uuid_1',
        studentId: 'student_uuid_1',
      });

      expect(mockProfilesChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Alex Smith',
          invite_email: 'alex@example.com',
          is_shadow: true,
          is_student: true,
          student_status: 'active',
        })
      );

      expect(mockLessonsChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          teacher_id: 'teacher_uuid_1',
          student_id: 'student_uuid_1',
          scheduled_at: '2026-08-10T10:00:00.000Z',
          duration_minutes: 45,
          calcom_booking_id: 'cal_booking_123',
          status: 'SCHEDULED',
        })
      );
    });
  });
});
