import { GET as authRoute } from '@/app/api/auth/google/route';
import { GET as callbackRoute } from '@/app/api/oauth2/callback/route';
import { getGoogleAuthUrl, getGoogleOAuth2Client } from '@/lib/google';
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

describe('Google Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/google', () => {
    it('should redirect to Google Auth URL', async () => {
      (getGoogleAuthUrl as jest.Mock).mockReturnValue('https://google.com/auth');

      const req = new NextRequest('http://localhost:3000/api/auth/google');
      await authRoute(req);

      expect(getGoogleAuthUrl).toHaveBeenCalledWith('http://localhost:3000/api/oauth2/callback');
      expect(redirect).toHaveBeenCalledWith('https://google.com/auth');
    });
  });

  describe('GET /api/oauth2/callback', () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      upsert: jest.fn(),
    };

    beforeEach(() => {
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('should redirect with error if error param is present', async () => {
      const req = {
        nextUrl: {
          searchParams: new URLSearchParams('error=access_denied'),
          origin: 'http://localhost:3000',
        },
      } as unknown as NextRequest;

      await callbackRoute(req);

      expect(redirect).toHaveBeenCalledWith('/dashboard?error=google_auth_error');
    });

    it('should redirect with error if code param is missing', async () => {
      const req = {
        nextUrl: {
          searchParams: new URLSearchParams(''),
          origin: 'http://localhost:3000',
        },
      } as unknown as NextRequest;

      await callbackRoute(req);

      expect(redirect).toHaveBeenCalledWith('/dashboard?error=no_code');
    });

    it('should redirect to login if user is not authenticated', async () => {
      const req = {
        nextUrl: {
          searchParams: new URLSearchParams('code=valid-code'),
          origin: 'http://localhost:3000',
        },
      } as unknown as NextRequest;
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' });

      await callbackRoute(req);

      expect(redirect).toHaveBeenCalledWith('/login?error=unauthorized');
    });

    it('should exchange code for tokens and store them', async () => {
      const req = {
        nextUrl: {
          searchParams: new URLSearchParams('code=valid-code'),
          origin: 'http://localhost:3000',
        },
      } as unknown as NextRequest;

      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock Google token exchange
      const mockOAuth2Client = {
        getToken: jest.fn().mockResolvedValue({
          tokens: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expiry_date: 1234567890,
          },
        }),
      };
      (getGoogleOAuth2Client as jest.Mock).mockReturnValue(mockOAuth2Client);

      // Mock Supabase upsert success
      mockSupabase.upsert.mockResolvedValue({ error: null });

      await callbackRoute(req);

      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('valid-code');
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
      const req = {
        nextUrl: {
          searchParams: new URLSearchParams('code=valid-code'),
          origin: 'http://localhost:3000',
        },
      } as unknown as NextRequest;

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockOAuth2Client = {
        getToken: jest.fn().mockResolvedValue({
          tokens: { access_token: 'token' },
        }),
      };
      (getGoogleOAuth2Client as jest.Mock).mockReturnValue(mockOAuth2Client);

      mockSupabase.upsert.mockResolvedValue({ error: 'DB Error' });

      await callbackRoute(req);

      expect(redirect).toHaveBeenCalledWith('/dashboard?error=db_error');
    });

    it('propagates a NEXT_REDIRECT control-flow error instead of treating it as a failure', async () => {
      const req = {
        nextUrl: {
          searchParams: new URLSearchParams('code=valid-code'),
          origin: 'http://localhost:3000',
        },
      } as unknown as NextRequest;

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

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

      await expect(callbackRoute(req)).rejects.toBe(redirectDigestError);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs a sanitized error and redirects gracefully on token exchange failure', async () => {
      const req = {
        nextUrl: {
          searchParams: new URLSearchParams('code=valid-code'),
          origin: 'http://localhost:3000',
        },
      } as unknown as NextRequest;

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Shape like a googleapis GaxiosError: a real Error with extra fields.
      const tokenError = new Error('invalid_grant');
      const mockOAuth2Client = { getToken: jest.fn().mockRejectedValue(tokenError) };
      (getGoogleOAuth2Client as jest.Mock).mockReturnValue(mockOAuth2Client);

      await callbackRoute(req);

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
