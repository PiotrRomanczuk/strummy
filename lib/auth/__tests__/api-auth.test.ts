/**
 * @jest-environment node
 *
 * Direct unit tests for lib/auth/api-auth.ts.
 *
 * This module underpins every route that supports API-key bearer auth
 * (via withApiAuth), but until now it was only ever exercised indirectly
 * through routes that mock `withApiAuth`/`authenticateRequest` away entirely
 * — so the actual header-parsing, key-hashing, and DB-lookup logic here had
 * no direct coverage.
 */

import { hashApiKey } from '@/lib/api-keys';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { authenticateRequest, requireAuth } from '../api-auth';

jest.mock('@/lib/supabase/admin');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock builders
// ---------------------------------------------------------------------------

const MOCK_USER_ID = '45085573-07bc-475b-b8f2-baeae18ffb4e';
const MOCK_USER = { id: MOCK_USER_ID, email: 'teacher@test.com' };

function mockAdminClient(options: {
  selectResult: { data: { user_id: string; is_active: boolean } | null; error: unknown };
  getUserByIdResult?: { data: { user: unknown }; error: unknown };
  updateRejects?: boolean;
}) {
  const single = jest.fn().mockResolvedValue(options.selectResult);
  const eq2 = jest.fn(() => ({ single }));
  const eq1 = jest.fn(() => ({ eq: eq2 }));
  const select = jest.fn(() => ({ eq: eq1 }));

  const updateEq = jest.fn(() =>
    options.updateRejects
      ? Promise.reject(new Error('failed to update last_used_at'))
      : Promise.resolve({ error: null })
  );
  const update = jest.fn(() => ({ eq: updateEq }));

  const from = jest.fn(() => ({ select, update }));

  const getUserById = jest
    .fn()
    .mockResolvedValue(options.getUserByIdResult ?? { data: { user: MOCK_USER }, error: null });

  const client = { from, auth: { admin: { getUserById } } };
  (createAdminClient as jest.Mock).mockReturnValue(client);
  return { from, select, eq1, eq2, single, update, updateEq, getUserById };
}

function mockSessionClient(getUserResult: { data: { user: unknown }; error: unknown }) {
  const getUser = jest.fn().mockResolvedValue(getUserResult);
  (createClient as jest.Mock).mockResolvedValue({ auth: { getUser } });
  return { getUser };
}

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/song', { headers });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('authenticateRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('no Authorization header (cookie session fallback)', () => {
    it('returns the user on a valid cookie session', async () => {
      mockSessionClient({ data: { user: MOCK_USER }, error: null });

      const result = await authenticateRequest(makeRequest());

      expect(result.status).toBe(200);
      expect(result.user).toEqual(MOCK_USER);
    });

    it('returns 401 when there is no valid session', async () => {
      mockSessionClient({ data: { user: null }, error: { message: 'no session' } });

      const result = await authenticateRequest(makeRequest());

      expect(result.status).toBe(401);
      expect(result.user).toBeNull();
      expect(result.error).toBe('Unauthorized - no valid session or API key');
    });
  });

  describe('malformed Authorization header', () => {
    it.each([['Basic abc123'], ['Bearer'], ['Bearer token extra parts']])(
      'rejects "%s" with 401',
      async (headerValue) => {
        const result = await authenticateRequest(makeRequest({ Authorization: headerValue }));

        expect(result.status).toBe(401);
        expect(result.user).toBeNull();
        expect(result.error).toBe('Invalid Authorization header format. Use: Bearer <token>');
      }
    );
  });

  describe('API key bearer token (gcrm_ prefix)', () => {
    const API_KEY = 'gcrm_testkey1234567890';

    it('authenticates a valid, active key and returns the owning user', async () => {
      mockAdminClient({
        selectResult: { data: { user_id: MOCK_USER_ID, is_active: true }, error: null },
        getUserByIdResult: { data: { user: MOCK_USER }, error: null },
      });

      const result = await authenticateRequest(makeRequest({ Authorization: `Bearer ${API_KEY}` }));

      expect(result.status).toBe(200);
      expect(result.user).toEqual(MOCK_USER);
      expect(createAdminClient).toHaveBeenCalled();
      // Never queries the DB with the plaintext key — only its hash.
      expect(createClient).not.toHaveBeenCalled();
    });

    it('looks up the key by its SHA-256 hash, not the plaintext value', async () => {
      const { eq1 } = mockAdminClient({
        selectResult: { data: { user_id: MOCK_USER_ID, is_active: true }, error: null },
      });

      await authenticateRequest(makeRequest({ Authorization: `Bearer ${API_KEY}` }));

      expect(eq1).toHaveBeenCalledWith('key_hash', hashApiKey(API_KEY));
      expect(eq1).not.toHaveBeenCalledWith('key_hash', API_KEY);
    });

    it('returns 401 for a key with no matching active row', async () => {
      mockAdminClient({
        selectResult: { data: null, error: { message: 'not found' } },
      });

      const result = await authenticateRequest(makeRequest({ Authorization: `Bearer ${API_KEY}` }));

      expect(result.status).toBe(401);
      expect(result.error).toBe('Invalid API key');
    });

    it('returns 404 when the key is valid but the owning user no longer exists', async () => {
      mockAdminClient({
        selectResult: { data: { user_id: MOCK_USER_ID, is_active: true }, error: null },
        getUserByIdResult: { data: { user: null }, error: { message: 'not found' } },
      });

      const result = await authenticateRequest(makeRequest({ Authorization: `Bearer ${API_KEY}` }));

      expect(result.status).toBe(404);
      expect(result.error).toBe('User not found');
    });

    it('still authenticates successfully when the non-blocking last_used_at update fails', async () => {
      mockAdminClient({
        selectResult: { data: { user_id: MOCK_USER_ID, is_active: true }, error: null },
        updateRejects: true,
      });

      const result = await authenticateRequest(makeRequest({ Authorization: `Bearer ${API_KEY}` }));

      expect(result.status).toBe(200);
      expect(result.user).toEqual(MOCK_USER);
    });
  });

  describe('session bearer token (non-gcrm_ prefix)', () => {
    const SESSION_TOKEN = 'some-supabase-jwt';

    it('authenticates a valid session token', async () => {
      mockSessionClient({ data: { user: MOCK_USER }, error: null });

      const result = await authenticateRequest(
        makeRequest({ Authorization: `Bearer ${SESSION_TOKEN}` })
      );

      expect(result.status).toBe(200);
      expect(result.user).toEqual(MOCK_USER);
      expect(createAdminClient).not.toHaveBeenCalled();
    });

    it('returns 401 for an invalid/expired session token', async () => {
      mockSessionClient({ data: { user: null }, error: { message: 'expired' } });

      const result = await authenticateRequest(
        makeRequest({ Authorization: `Bearer ${SESSION_TOKEN}` })
      );

      expect(result.status).toBe(401);
      expect(result.error).toBe('Invalid session token');
    });
  });
});

describe('requireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns { user } when authentication succeeds', async () => {
    mockSessionClient({ data: { user: MOCK_USER }, error: null });

    const result = await requireAuth(makeRequest());

    expect(result.errorResponse).toBeUndefined();
    expect(result.user).toEqual(MOCK_USER);
  });

  it('returns an errorResponse with the right status and body when auth fails', async () => {
    mockSessionClient({ data: { user: null }, error: { message: 'no session' } });

    const result = await requireAuth(makeRequest());

    expect(result.user).toBeUndefined();
    expect(result.errorResponse).toBeDefined();
    expect(result.errorResponse!.status).toBe(401);
    const body = await result.errorResponse!.json();
    expect(body.error).toBe('Unauthorized - no valid session or API key');
  });
});
