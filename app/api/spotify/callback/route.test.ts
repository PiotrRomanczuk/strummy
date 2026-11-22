/**
 * @jest-environment node
 */
import { GET } from './route';
import { logger } from '@/lib/logger';

// jest.setup.js stubs next/server; this test needs real redirects and Set-Cookie headers.
jest.mock('next/server', () => jest.requireActual('next/server'));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

global.fetch = jest.fn();

const SECRET_TOKEN = 'AQD-super-secret-refresh-token';
const originalEnv = process.env;

function callback(query: string) {
  return GET(new Request(`https://strummy.test/api/spotify/callback${query}`));
}

function loggedText() {
  return JSON.stringify([
    ...(logger.info as jest.Mock).mock.calls,
    ...(logger.error as jest.Mock).mock.calls,
  ]);
}

describe('GET /api/spotify/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      SPOTIFY_CLIENT_ID: 'cid',
      SPOTIFY_CLIENT_SECRET: 'csecret',
      SPOTIFY_REDIRECT_URI: 'https://strummy.test/api/spotify/callback',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('keeps the refresh token out of the redirect URL and the logs, and parks it in an httpOnly cookie', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'at', refresh_token: SECRET_TOKEN }),
    });

    const res = await callback('?code=abc');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://accounts.spotify.com/api/token',
      expect.objectContaining({ method: 'POST' })
    );
    expect(res.status).toBe(307);
    const location = res.headers.get('location') as string;
    expect(new URL(location).pathname).toBe('/dashboard/admin/spotify-connect');
    expect(new URL(location).search).toBe('?success=true');
    expect(location).not.toContain(SECRET_TOKEN);
    expect(loggedText()).not.toContain(SECRET_TOKEN);

    const cookie = res.cookies.get('spotify_refresh_token_once');
    expect(cookie?.value).toBe(SECRET_TOKEN);
    const setCookie = res.headers.get('set-cookie') as string;
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Max-Age=300/i);
    expect(setCookie).toMatch(/Path=\/dashboard\/admin\/spotify-connect/i);
  });

  it('marks the cookie Secure in production', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ refresh_token: SECRET_TOKEN }),
    });

    const res = await callback('?code=abc');

    expect(res.headers.get('set-cookie')).toMatch(/Secure/i);
  });

  it('redirects with an error and no token or cookie when Spotify rejects the code', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error":"invalid_grant"}',
    });

    const res = await callback('?code=bad');

    const location = res.headers.get('location') as string;
    expect(new URL(location).search).toBe('?error=token_exchange_failed');
    expect(res.cookies.get('spotify_refresh_token_once')).toBeUndefined();
  });

  it('redirects with an error when the response has no refresh_token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'at' }),
    });

    const res = await callback('?code=abc');

    expect(new URL(res.headers.get('location') as string).search).toBe('?error=no_refresh_token');
    expect(res.cookies.get('spotify_refresh_token_once')).toBeUndefined();
  });

  it('passes through an OAuth error from Spotify without calling the token endpoint', async () => {
    const res = await callback('?error=access_denied');

    expect(new URL(res.headers.get('location') as string).search).toBe('?error=access_denied');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('redirects with missing_code when there is no code', async () => {
    const res = await callback('');

    expect(new URL(res.headers.get('location') as string).search).toBe('?error=missing_code');
  });
});
