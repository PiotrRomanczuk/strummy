/**
 * @jest-environment node
 */
import crypto from 'crypto';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

const SECRET = 'calcom_test_secret';

function sign(rawBody: string, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

/** Builds a request; signs it with SECRET unless `signature` is given (null = no header). */
function makeRequest(body: unknown, signature?: string | null) {
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  const headers: Record<string, string> = {};
  const value = signature === undefined ? sign(rawBody) : signature;
  if (value !== null) headers['x-cal-signature-256'] = value;

  const request = new NextRequest('https://strummy.online/api/webhooks/calcom', {
    method: 'POST',
    body: rawBody,
    headers,
  });
  // The jest.setup.js mock of next/server only implements NextRequest.json(),
  // but the route reads the raw body via .text() to verify the HMAC signature.
  (request as unknown as { text: () => Promise<string> }).text = async () => rawBody;
  return request;
}

function bookingEnvelope(email: string, triggerEvent = 'BOOKING_CREATED') {
  return {
    triggerEvent,
    createdAt: '2026-08-03T17:00:00.000Z',
    payload: {
      uid: 'real_booking_uid',
      startTime: '2026-08-10T10:00:00.000Z',
      endTime: '2026-08-10T10:45:00.000Z',
      title: 'Trial Lesson',
      attendees: [{ name: 'Real Attendee', email }],
    },
  };
}

describe('POST /api/webhooks/calcom', () => {
  const originalSecret = process.env.CALCOM_WEBHOOK_SECRET;
  const mockSupabase = { from: jest.fn() };

  const chain = (overrides: Record<string, unknown> = {}) => ({
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    ...overrides,
  });

  let profilesChain: ReturnType<typeof chain>;
  let lessonsChain: ReturnType<typeof chain>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CALCOM_WEBHOOK_SECRET = SECRET;
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);

    const teacherChain = chain({
      maybeSingle: jest.fn().mockResolvedValue({ data: { user_id: 'teacher_1' } }),
    });
    profilesChain = chain({
      single: jest.fn().mockResolvedValue({ data: { id: 'student_1' }, error: null }),
    });
    lessonsChain = chain({
      single: jest.fn().mockResolvedValue({ data: { id: 'lesson_1' }, error: null }),
    });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_roles') return teacherChain;
      if (table === 'profiles') return profilesChain;
      if (table === 'lessons') return lessonsChain;
      return {};
    });
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.CALCOM_WEBHOOK_SECRET;
    else process.env.CALCOM_WEBHOOK_SECRET = originalSecret;
  });

  describe('authentication (fail closed)', () => {
    it('answers 500 and processes nothing when CALCOM_WEBHOOK_SECRET is not set', async () => {
      delete process.env.CALCOM_WEBHOOK_SECRET;
      const body = bookingEnvelope('real@example.com');

      // Even a request "signed" with an empty secret must not get through.
      const response = await POST(makeRequest(body, sign(JSON.stringify(body), '')));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Webhook not configured' });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('answers 401 when the signature header is missing', async () => {
      const response = await POST(makeRequest(bookingEnvelope('real@example.com'), null));

      expect(response.status).toBe(401);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('answers 401 for a well-formed signature made with the wrong secret', async () => {
      const body = bookingEnvelope('real@example.com');
      const response = await POST(makeRequest(body, sign(JSON.stringify(body), 'another_secret')));

      expect(response.status).toBe(401);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it.each([
      ['not hex', 'zzzz-not-hex'],
      ['too short', 'abcd'],
      ['too long', 'ab'.repeat(40)],
      ['empty', ''],
    ])('answers 401 (no exception) for a signature that is %s', async (_label, signature) => {
      const response = await POST(makeRequest(bookingEnvelope('real@example.com'), signature));

      expect(response.status).toBe(401);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('handling', () => {
    it('unwraps the real Cal.com envelope (booking fields nested under payload)', async () => {
      // Real Cal.com BOOKING_CREATED deliveries wrap booking fields under `payload`,
      // not flat alongside `triggerEvent` — see docs.cal.com/core-features/webhooks.
      const response = await POST(makeRequest(bookingEnvelope('real@example.com')));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result).toEqual({
        success: true,
        action: 'created',
        lessonId: 'lesson_1',
        studentId: 'student_1',
      });
      expect(lessonsChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ calcom_booking_id: 'real_booking_uid' })
      );
    });

    it('looks the attendee up with parameterised .eq() filters, never an interpolated .or()', async () => {
      await POST(makeRequest(bookingEnvelope('Real@Example.com')));

      expect(profilesChain).not.toHaveProperty('or');
      expect(profilesChain.eq).toHaveBeenCalledWith('email', 'real@example.com');
      expect(profilesChain.eq).toHaveBeenCalledWith('invite_email', 'real@example.com');
    });

    it.each(['BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'MEETING_ENDED'])(
      'ignores %s with 200 and creates nothing',
      async (triggerEvent) => {
        const response = await POST(makeRequest(bookingEnvelope('real@example.com', triggerEvent)));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ignored: triggerEvent });
        expect(mockSupabase.from).not.toHaveBeenCalled();
      }
    );

    it.each([
      ['a comma (filter injection)', 'x@y.pl,is_admin.eq.true'],
      ['a closing bracket', 'x@y.pl)'],
      ['an opening bracket', '(x@y.pl'],
      ['whitespace', 'x y@z.pl'],
      ['no domain', 'x@'],
      ['an empty string', ''],
    ])('answers 400 and queries nothing for an attendee e-mail with %s', async (_label, email) => {
      const response = await POST(makeRequest(bookingEnvelope(email)));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Invalid attendee email' });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('answers 400 when the envelope has no attendees', async () => {
      const envelope = {
        triggerEvent: 'BOOKING_CREATED',
        payload: { uid: 'no_attendee_uid', startTime: '2026-08-10T10:00:00.000Z', attendees: [] },
      };

      const response = await POST(makeRequest(envelope));

      expect(response.status).toBe(400);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it.each(['not json at all', 'null', '42'])(
      'answers 400 for a signed body of %s',
      async (raw) => {
        const response = await POST(makeRequest(raw));

        expect(response.status).toBe(400);
        expect(mockSupabase.from).not.toHaveBeenCalled();
      }
    );

    it('answers 500 with a fixed message that does not leak the internal error', async () => {
      lessonsChain.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'relation "lessons" leaked detail' } });

      const response = await POST(makeRequest(bookingEnvelope('real@example.com')));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: 'Webhook processing failed' });
    });
  });
});
