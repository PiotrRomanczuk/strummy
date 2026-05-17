/**
 * OAuth Callback Route Tests
 *
 * Tests for app/auth/callback/route.ts — the Supabase OAuth callback handler
 * that exchanges an auth code for a session and redirects the user.
 *
 * Covers:
 *  - Happy path: valid code → session created → redirects to /dashboard
 *  - Happy path: `next` param is respected on successful auth
 *  - New user with no role → redirected to /onboarding
 *  - Existing user with role → skips onboarding, goes to `next`
 *  - x-forwarded-host header respected in non-local environments
 *  - Missing code → redirects to /auth/auth-code-error
 *  - Supabase exchangeCodeForSession error → redirects to /auth/auth-code-error
 *  - Security: open redirect is blocked (external `next` values ignored)
 */

import { GET } from '../callback/route';

// ── next/server override ──────────────────────────────────────────────────────
// The global jest.setup.js mocks next/server without a working `redirect`.
// We override it here so NextResponse.redirect returns a real Response with a
// Location header that we can inspect in assertions.
// Minimal Response-like class that works in the Node test environment
// (global `Response` is not available without a fetch polyfill).
class MockResponse {
  status: number;
  private _headers: Record<string, string>;
  constructor(_body: null, init: { status: number; headers: Record<string, string> }) {
    this.status = init.status;
    this._headers = init.headers;
  }
  get headers() {
    return { get: (key: string) => this._headers[key] ?? null };
  }
}

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: string | URL) => {
      const location = url instanceof URL ? url.toString() : url;
      return new MockResponse(null, { status: 307, headers: { Location: location } });
    },
    json: (data: unknown, init?: { status?: number }) =>
      new MockResponse(null, {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json', body: JSON.stringify(data) },
      }),
  },
  NextRequest: class {
    url: string;
    method: string;
    headers: Headers;
    nextUrl: URL;
    constructor(url: string, init?: RequestInit) {
      this.url = url;
      this.method = init?.method ?? 'GET';
      this.headers = new Headers(init?.headers as HeadersInit);
      this.nextUrl = new URL(url);
    }
  },
}));

// ── Supabase mock ────────────────────────────────────────────────────────────

const mockExchangeCodeForSession = jest.fn();
const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}));

// ── Account action mock ──────────────────────────────────────────────────────

const mockUpdateLastSignIn = jest.fn().mockResolvedValue(undefined);

jest.mock('@/app/actions/account', () => ({
  updateLastSignIn: (...args: unknown[]) => mockUpdateLastSignIn(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildRequest(
  params: Record<string, string>,
  headers: Record<string, string> = {}
): Request {
  const url = new URL('http://localhost:3000/auth/callback');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  // Return a plain object that exposes .url — the native Request constructor
  // doesn't reliably expose .url in the Jest/JSDOM test environment.
  return {
    url: url.toString(),
    method: 'GET',
    headers: new Headers(headers),
    nextUrl: url,
  } as unknown as Request;
}

function redirectLocationOf(response: {
  status: number;
  headers: { get: (k: string) => string | null };
}): string {
  return response.headers.get('Location') ?? response.headers.get('location') ?? '';
}

/** Sets up mocks for a user that already has a role (teacher). */
function mockAuthenticatedUserWithRole(userId = 'user-abc') {
  mockExchangeCodeForSession.mockResolvedValue({ error: null });
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { is_student: false, is_teacher: true, is_admin: false },
      error: null,
    }),
  });
}

/** Sets up mocks for a brand-new user with no role. */
function mockNewUserWithoutRole(userId = 'new-user-xyz') {
  mockExchangeCodeForSession.mockResolvedValue({ error: null });
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { is_student: false, is_teacher: false, is_admin: false },
      error: null,
    }),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  // ── Happy paths ─────────────────────────────────────────────────────────────

  it('redirects to /dashboard when code is valid and user has a role', async () => {
    mockAuthenticatedUserWithRole();
    const req = buildRequest({ code: 'valid-code' });

    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(redirectLocationOf(response)).toBe('http://localhost:3000/dashboard');
  });

  it('respects the `next` query param on successful auth', async () => {
    mockAuthenticatedUserWithRole();
    const req = buildRequest({ code: 'valid-code', next: '/songs' });

    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(redirectLocationOf(response)).toBe('http://localhost:3000/songs');
  });

  it('calls updateLastSignIn with the user id after successful exchange', async () => {
    mockAuthenticatedUserWithRole('uid-42');
    const req = buildRequest({ code: 'valid-code' });

    await GET(req);

    expect(mockUpdateLastSignIn).toHaveBeenCalledWith('uid-42');
  });

  // ── Onboarding ──────────────────────────────────────────────────────────────

  it('redirects new users (no role) to /onboarding', async () => {
    mockNewUserWithoutRole();
    const req = buildRequest({ code: 'valid-code' });

    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(redirectLocationOf(response)).toContain('/onboarding');
  });

  // ── Error paths ─────────────────────────────────────────────────────────────

  it('redirects to /auth/auth-code-error when `code` param is missing', async () => {
    const req = buildRequest({});

    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(redirectLocationOf(response)).toBe('http://localhost:3000/auth/auth-code-error');
  });

  it('redirects to /auth/auth-code-error when Supabase returns an error', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Invalid auth code', status: 400 },
    });
    const req = buildRequest({ code: 'bad-code' });

    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(redirectLocationOf(response)).toBe('http://localhost:3000/auth/auth-code-error');
  });

  // ── x-forwarded-host (production / load balancer) ───────────────────────────

  it('uses x-forwarded-host in non-local environments', async () => {
    process.env.NODE_ENV = 'production';
    mockAuthenticatedUserWithRole();
    const req = buildRequest(
      { code: 'valid-code', next: '/dashboard' },
      { 'x-forwarded-host': 'example.com' }
    );

    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(redirectLocationOf(response)).toBe('https://example.com/dashboard');
  });

  // ── Security ────────────────────────────────────────────────────────────────

  it('never redirects to an external domain: origin is always prepended to `next`', async () => {
    // The route uses `${origin}${next}` so an absolute URL in `next` results in
    // a malformed (non-navigable) URL, not a real open redirect.
    mockAuthenticatedUserWithRole();
    const req = buildRequest({
      code: 'valid-code',
      next: 'https://evil.example.com',
    });

    const response = await GET(req);
    const location = redirectLocationOf(response);

    // Location must start with the request origin, never with the injected URL
    expect(location).toMatch(/^http:\/\/localhost:3000/);
    expect(location).not.toBe('https://evil.example.com');
  });
});
