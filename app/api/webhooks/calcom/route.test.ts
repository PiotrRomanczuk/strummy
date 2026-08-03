/**
 * @jest-environment node
 */
import { POST } from './route';
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

function makeRequest(body: unknown) {
  const rawBody = JSON.stringify(body);
  const request = new NextRequest('https://strummy.online/api/webhooks/calcom', {
    method: 'POST',
    body: rawBody,
  });
  // The jest.setup.js mock of next/server only implements NextRequest.json(),
  // but the route reads the raw body via .text() to verify the HMAC signature.
  (request as unknown as { text: () => Promise<string> }).text = async () => rawBody;
  return request;
}

describe('POST /api/webhooks/calcom', () => {
  const mockSupabase = { from: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('unwraps the real Cal.com envelope (booking fields nested under payload)', async () => {
    // Real Cal.com BOOKING_CREATED deliveries wrap booking fields under `payload`,
    // not flat alongside `triggerEvent` — see docs.cal.com/core-features/webhooks.
    const envelope = {
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-08-03T17:00:00.000Z',
      payload: {
        uid: 'real_booking_uid',
        startTime: '2026-08-10T10:00:00.000Z',
        endTime: '2026-08-10T10:45:00.000Z',
        title: 'Trial Lesson',
        attendees: [{ name: 'Real Attendee', email: 'real@example.com' }],
      },
    };

    const mockTeacherChain = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { user_id: 'teacher_1' } }),
    };
    const mockProfilesChain = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'student_1' }, error: null }),
    };
    const mockLessonsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'lesson_1' }, error: null }),
    };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_roles') return mockTeacherChain;
      if (table === 'profiles') return mockProfilesChain;
      if (table === 'lessons') return mockLessonsChain;
      return {};
    });

    const response = await POST(makeRequest(envelope));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result).toEqual({
      success: true,
      action: 'created',
      lessonId: 'lesson_1',
      studentId: 'student_1',
    });
    expect(mockLessonsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ calcom_booking_id: 'real_booking_uid' })
    );
  });

  it('returns 500 with a clear message when the envelope has no attendees', async () => {
    const envelope = {
      triggerEvent: 'BOOKING_CREATED',
      payload: { uid: 'no_attendee_uid', startTime: '2026-08-10T10:00:00.000Z', attendees: [] },
    };

    const response = await POST(makeRequest(envelope));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Cal.com webhook missing attendee email');
  });
});
