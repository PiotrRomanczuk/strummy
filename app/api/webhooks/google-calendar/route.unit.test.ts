/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';
import { secretsMatch } from '@/lib/auth/secret-compare';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/lib/services/google-calendar-sync', () => ({ fetchAndSyncRecentEvents: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/auth/secret-compare', () => ({
  secretsMatch: jest.fn(jest.requireActual('@/lib/auth/secret-compare').secretsMatch),
}));

const SECRET = 'calendar-channel-token';

function notification(token?: string): NextRequest {
  const headers = new Headers({
    'x-goog-channel-id': 'channel-1',
    'x-goog-resource-id': 'resource-1',
    'x-goog-resource-state': 'sync',
  });
  if (token !== undefined) headers.set('x-goog-channel-token', token);
  return new NextRequest('http://localhost/api/webhooks/google-calendar', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/webhooks/google-calendar — channel token', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET = SECRET;
    (secretsMatch as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = env;
  });

  it('accepts the configured token, compared in constant time', async () => {
    const res = await POST(notification(SECRET));

    expect(res.status).toBe(200);
    expect(secretsMatch).toHaveBeenCalledWith(SECRET, SECRET);
  });

  it.each([
    ['missing token', undefined],
    ['wrong token of the same length', 'calendar-channel-tokeN'],
    ['token with a suffix', `${SECRET}-extra`],
  ])('returns 401 for a %s', async (_label, token) => {
    const res = await POST(notification(token));
    expect(res.status).toBe(401);
  });

  it.each([
    ['in production', { VERCEL_ENV: 'production', NODE_ENV: 'production' }],
    ['in development', { NODE_ENV: 'development' }],
  ])('returns 401 without a configured secret %s, even with the old skip flag', async (_l, env) => {
    delete process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET;
    Object.assign(process.env, env, { CALENDAR_WEBHOOK_SKIP_TOKEN: 'true' });

    const res = await POST(notification(SECRET));

    expect(res.status).toBe(401);
  });
});
