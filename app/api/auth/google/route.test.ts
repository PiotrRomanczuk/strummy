import { GET as authRoute } from '@/app/api/auth/google/route';
import { GET as callbackRoute } from '@/app/api/oauth2/callback/route';
import { getGoogleAuthUrl, getGoogleOAuth2Client } from '@/lib/google';
import { GOOGLE_OAUTH_STATE_COOKIE } from '@/lib/auth/google-oauth-state';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/google', () => ({
  getGoogleAuthUrl: jest.fn(),
  getGoogleOAuth2Client: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Keep the real `unstable_rethrow` (it's a pure control-flow check on the
// error's `.digest`) — only `redirect` is stubbed so tests don't actually throw.
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  redirect: jest.fn(),
}));

// A cookie jar standing in for next/headers' request/response cookie store.
const cookieJar = new Map<string, string>();
const mockCookieSet = jest.fn((name: string, value: string) => cookieJar.set(name, value));

jest.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
    set: (name: string, value: string, options: unknown) => mockCookieSet(name, value, options),
  }),
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  upsert: jest.fn(),
};

const STATE = 'state-from-the-start-route';

function callbackRequest(query: string, origin = 'http://localhost:3000'): NextRequest {
  const url = new URL(`${origin}/api/oauth2/callback?${query}`);
  return { nextUrl: url } as unknown as NextRequest;
}

function signedInAs(id: string | null) {
  mockSupabase.auth.getUser.mockResolvedValue(
    id ? { data: { user: { id } }, error: null } : { data: { user: null }, error: 'No user' }
  );
}

describe('Google Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cookieJar.clear();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/auth/google', () => {
    beforeEach(() => {
      (getGoogleAuthUrl as jest.Mock).mockReturnValue('https://google.com/auth');
    });

    it('sends an anonymous visitor to sign-in without starting the flow', async () => {
      signedInAs(null);

      await authRoute(new NextRequest('http://localhost:3000/api/auth/google'));

      expect(redirect).toHaveBeenCalledWith('/sign-in');
      expect(getGoogleAuthUrl).not.toHaveBeenCalled();
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it('stores a random state in a scoped httpOnly cookie and sends the same state to Google', async () => {
      signedInAs('user-123');

      await authRoute(new NextRequest('http://localhost:3000/api/auth/google'));

      const [name, state, options] = mockCookieSet.mock.calls[0];
      expect(name).toBe(GOOGLE_OAUTH_STATE_COOKIE);
      expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url
      expect(options).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/api/oauth2/callback',
        maxAge: 600,
      });
      expect(getGoogleAuthUrl).toHaveBeenCalledWith({
        state,
        redirectUri: 'http://localhost:3000/api/oauth2/callback',
      });
      expect(redirect).toHaveBeenCalledWith('https://google.com/auth');
    });

    it('marks the cookie Secure over https', async () => {
      signedInAs('user-123');

      await authRoute(new NextRequest('https://strummy.online/api/auth/google'));

      expect(mockCookieSet.mock.calls[0][2]).toMatchObject({ secure: true });
    });

    it('uses a new state on every start', async () => {
      signedInAs('user-123');

      await authRoute(new NextRequest('http://localhost:3000/api/auth/google'));
      await authRoute(new NextRequest('http://localhost:3000/api/auth/google'));

      expect(mockCookieSet.mock.calls[0][1]).not.toBe(mockCookieSet.mock.calls[1][1]);
    });
  });

  describe('GET /api/oauth2/callback', () => {
    function mockTokenExchange(tokens: Record<string, unknown>) {
      const client = { getToken: jest.fn().mockResolvedValue({ tokens }) };
      (getGoogleOAuth2Client as jest.Mock).mockReturnValue(client);
      return client;
    }

    beforeEach(() => {
      cookieJar.set(GOOGLE_OAUTH_STATE_COOKIE, STATE);
    });

    it('should redirect with error if error param is present', async () => {
      await callbackRoute(callbackRequest('error=access_denied'));

      expect(redirect).toHaveBeenCalledWith('/dashboard?error=google_auth_error');
    });

    it('should redirect with error if code param is missing', async () => {
      await callbackRoute(callbackRequest(''));

      expect(redirect).toHaveBeenCalledWith('/dashboard?error=no_code');
    });

    it.each([
      ['missing', 'code=valid-code'],
      ['different', 'code=valid-code&state=another-state-value-entirely'],
      ['empty', 'code=valid-code&state='],
    ])('rejects a code whose state is %s, before any lookup or exchange', async (_label, query) => {
      const client = mockTokenExchange({ access_token: 'token' });

      await callbackRoute(callbackRequest(query));

      expect(redirect).toHaveBeenCalledWith('/dashboard?error=google_auth_state');
      expect(createClient).not.toHaveBeenCalled();
      expect(client.getToken).not.toHaveBeenCalled();
    });

    it('rejects a code when no flow was started in this browser (no cookie)', async () => {
      cookieJar.clear();
      const client = mockTokenExchange({ access_token: 'token' });

      await callbackRoute(callbackRequest(`code=valid-code&state=${STATE}`));

      expect(redirect).toHaveBeenCalledWith('/dashboard?error=google_auth_state');
      expect(client.getToken).not.toHaveBeenCalled();
    });

    it('expires the state cookie on every callback, so a state works once', async () => {
      await callbackRoute(callbackRequest('code=valid-code&state=wrong'));

      expect(mockCookieSet).toHaveBeenCalledWith(
        GOOGLE_OAUTH_STATE_COOKIE,
        '',
        expect.objectContaining({ maxAge: 0, path: '/api/oauth2/callback', httpOnly: true })
      );
      expect(cookieJar.get(GOOGLE_OAUTH_STATE_COOKIE)).toBe('');
    });

    it('should redirect to login if user is not authenticated', async () => {
      signedInAs(null);

      await callbackRoute(callbackRequest(`code=valid-code&state=${STATE}`));

      expect(redirect).toHaveBeenCalledWith('/login?error=unauthorized');
    });

    it('should exchange code for tokens and store them', async () => {
      signedInAs('user-123');
      const client = mockTokenExchange({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiry_date: 1234567890,
      });
      mockSupabase.upsert.mockResolvedValue({ error: null });

      await callbackRoute(callbackRequest(`code=valid-code&state=${STATE}`));

      expect(client.getToken).toHaveBeenCalledWith('valid-code');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_integrations');
      expect(mockSupabase.upsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        provider: 'google',
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_at: 1234567890,
        updated_at: expect.any(String),
      });
      expect(redirect).toHaveBeenCalledWith('/dashboard?success=google_connected');
    });

    it('should handle database errors', async () => {
      signedInAs('user-123');
      mockTokenExchange({ access_token: 'token' });
      mockSupabase.upsert.mockResolvedValue({ error: 'DB Error' });

      await callbackRoute(callbackRequest(`code=valid-code&state=${STATE}`));

      expect(redirect).toHaveBeenCalledWith('/dashboard?error=db_error');
    });

    it('propagates a NEXT_REDIRECT control-flow error instead of treating it as a failure', async () => {
      signedInAs('user-123');

      // Capture a genuine redirect digest error from the real next/navigation
      // implementation (redirect() itself is mocked above, so it won't throw).
      const { redirect: actualRedirect } = jest.requireActual('next/navigation');
      let redirectDigestError: unknown;
      try {
        actualRedirect('/login?error=unauthorized');
      } catch (e) {
        redirectDigestError = e;
      }

      const mockOAuth2Client = { getToken: jest.fn().mockRejectedValue(redirectDigestError) };
      (getGoogleOAuth2Client as jest.Mock).mockReturnValue(mockOAuth2Client);

      await expect(callbackRoute(callbackRequest(`code=valid-code&state=${STATE}`))).rejects.toBe(
        redirectDigestError
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs a sanitized error and redirects gracefully on token exchange failure', async () => {
      signedInAs('user-123');

      // Shape like a googleapis GaxiosError: a real Error with extra fields.
      const tokenError = new Error('invalid_grant');
      const mockOAuth2Client = { getToken: jest.fn().mockRejectedValue(tokenError) };
      (getGoogleOAuth2Client as jest.Mock).mockReturnValue(mockOAuth2Client);

      await callbackRoute(callbackRequest(`code=valid-code&state=${STATE}`));

      expect(redirect).toHaveBeenCalledWith('/dashboard?error=token_exchange_error');
      expect(logger.error).toHaveBeenCalledWith(
        'Error exchanging code for tokens:',
        expect.objectContaining({ message: 'invalid_grant', name: 'Error' })
      );
      // Must not pass the raw Error instance through — that's the shape that
      // crashed Sentry's exception capture in production.
      const loggedArg = (logger.error as jest.Mock).mock.calls[0][1];
      expect(loggedArg).not.toBeInstanceOf(Error);
    });
  });
});
