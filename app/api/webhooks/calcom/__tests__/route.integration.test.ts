import { POST } from '../route';
import { NextRequest } from 'next/server';
import { verifyCalcomSignature, processCalcomBookingPayload } from '@/lib/services/calcom';

// Mock the Cal.com service helpers
jest.mock('@/lib/services/calcom', () => ({
  verifyCalcomSignature: jest.fn(),
  processCalcomBookingPayload: jest.fn(),
}));

describe('Cal.com Webhook Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CALCOM_WEBHOOK_SECRET: 'test_secret' };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 when x-cal-signature-256 header is missing', async () => {
    (verifyCalcomSignature as jest.Mock).mockReturnValue(false);

    const req = new NextRequest('http://localhost/api/webhooks/calcom', {
      method: 'POST',
      body: JSON.stringify({ test: 'payload' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body).toEqual({ error: 'Invalid HMAC signature' });
    expect(verifyCalcomSignature).toHaveBeenCalledWith(
      JSON.stringify({ test: 'payload' }),
      null,
      'test_secret'
    );
  });

  it('returns 401 when signature verification fails', async () => {
    (verifyCalcomSignature as jest.Mock).mockReturnValue(false);

    const req = new NextRequest('http://localhost/api/webhooks/calcom', {
      method: 'POST',
      headers: {
        'x-cal-signature-256': 'invalid_sig',
      },
      body: JSON.stringify({ test: 'payload' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body).toEqual({ error: 'Invalid HMAC signature' });
  });

  it('returns 200 and processes payload successfully', async () => {
    (verifyCalcomSignature as jest.Mock).mockReturnValue(true);
    const mockResult = {
      success: true,
      action: 'created',
      lessonId: 'lesson-123',
      studentId: 'student-123',
    };
    (processCalcomBookingPayload as jest.Mock).mockResolvedValue(mockResult);

    // Real Cal.com deliveries nest booking fields under `payload` — see
    // route.ts, which unwraps this envelope before calling the service.
    const envelope = {
      triggerEvent: 'BOOKING_CREATED',
      payload: {
        uid: 'cal_booking_123',
        startTime: '2026-08-10T10:00:00.000Z',
        attendees: [{ name: 'Alex Smith', email: 'alex@example.com' }],
      },
    };

    const req = new NextRequest('http://localhost/api/webhooks/calcom', {
      method: 'POST',
      headers: {
        'x-cal-signature-256': 'valid_sig',
      },
      body: JSON.stringify(envelope),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      success: true,
      result: mockResult,
    });
    expect(processCalcomBookingPayload).toHaveBeenCalledWith({
      triggerEvent: envelope.triggerEvent,
      ...envelope.payload,
    });
  });

  it('returns 500 when processing throws an error', async () => {
    (verifyCalcomSignature as jest.Mock).mockReturnValue(true);
    (processCalcomBookingPayload as jest.Mock).mockRejectedValue(new Error('Database error'));

    const req = new NextRequest('http://localhost/api/webhooks/calcom', {
      method: 'POST',
      headers: {
        'x-cal-signature-256': 'valid_sig',
      },
      body: JSON.stringify({ triggerEvent: 'BOOKING_CREATED' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body).toEqual({ error: 'Database error' });
  });
});
