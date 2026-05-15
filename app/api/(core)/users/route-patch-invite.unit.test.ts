/**
 * @jest-environment node
 *
 * Locks `authz:invite-email-uniqueness` (see tasks/unbreakable-core.md):
 * PATCH /api/users sets invite_email on a shadow profile and must reject
 * duplicates. Dual-layer protection:
 *
 *   1. App-level pre-check via `.or(email.eq.X, invite_email.eq.X)` →
 *      409 "This email is already associated with another user".
 *   2. DB-level UNIQUE partial index (migration 20260510130000) closes the
 *      TOCTOU race: a concurrent duplicate write returns 23505, which we
 *      surface as 409 too.
 */

import { PATCH } from './route';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/getUserWithRolesSSR');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const TEACHER_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const SHADOW_ID = 'aaaaaaaa-2222-4222-8222-222222222222';

function mockTeacher() {
  (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
    user: { id: TEACHER_ID },
    isAdmin: false,
    isTeacher: true,
    isStudent: false,
  });
}

function mockUnauth() {
  (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
    user: null,
    isAdmin: false,
    isTeacher: false,
    isStudent: false,
  });
}

interface ChainResult {
  data: unknown;
  error: null | { message: string; code?: string };
}

function buildClient(opts: {
  shadowLookup: ChainResult;
  duplicateLookup?: ChainResult;
  updateResult?: ChainResult;
}) {
  let fromCall = 0;
  const fromMock = jest.fn(() => {
    const idx = fromCall++;
    if (idx === 0) {
      // shadow lookup: from(profiles).select().eq().single()
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve(opts.shadowLookup)),
          })),
        })),
      };
    }
    if (idx === 1) {
      // duplicate lookup: from(profiles).select().or().neq().limit().maybeSingle()
      return {
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            neq: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn(() =>
                  Promise.resolve(opts.duplicateLookup ?? { data: null, error: null })
                ),
              })),
            })),
          })),
        })),
      };
    }
    // update: from(profiles).update().eq().select().single()
    return {
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve(opts.updateResult ?? { data: { id: SHADOW_ID }, error: null })
            ),
          })),
        })),
      })),
    };
  });
  return { from: fromMock };
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/users', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PATCH /api/users — invite_email uniqueness', () => {
  it('returns 401 when caller is not authenticated', async () => {
    mockUnauth();
    const res = await PATCH(makeRequest({ userId: SHADOW_ID, inviteEmail: 'alice@example.com' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for malformed payload', async () => {
    mockTeacher();
    const res = await PATCH(makeRequest({ userId: 'not-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the shadow profile does not exist', async () => {
    mockTeacher();
    (createClient as jest.Mock).mockResolvedValue(
      buildClient({
        shadowLookup: { data: null, error: { message: 'no rows' } },
      })
    );
    const res = await PATCH(makeRequest({ userId: SHADOW_ID, inviteEmail: 'alice@example.com' }));
    expect(res.status).toBe(404);
  });

  it('returns 400 when the target profile is not a shadow', async () => {
    mockTeacher();
    (createClient as jest.Mock).mockResolvedValue(
      buildClient({
        shadowLookup: { data: { id: SHADOW_ID, is_shadow: false }, error: null },
      })
    );
    const res = await PATCH(makeRequest({ userId: SHADOW_ID, inviteEmail: 'alice@example.com' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/only be set on shadow profiles/);
  });

  it('returns 409 (app-level) when another profile already uses this email', async () => {
    mockTeacher();
    (createClient as jest.Mock).mockResolvedValue(
      buildClient({
        shadowLookup: { data: { id: SHADOW_ID, is_shadow: true }, error: null },
        duplicateLookup: { data: { id: 'someone-else' }, error: null },
      })
    );
    const res = await PATCH(makeRequest({ userId: SHADOW_ID, inviteEmail: 'alice@example.com' }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already associated/);
  });

  it('happy path: returns 200 and the updated profile', async () => {
    mockTeacher();
    (createClient as jest.Mock).mockResolvedValue(
      buildClient({
        shadowLookup: { data: { id: SHADOW_ID, is_shadow: true }, error: null },
        duplicateLookup: { data: null, error: null },
        updateResult: {
          data: { id: SHADOW_ID, invite_email: 'alice@example.com' },
          error: null,
        },
      })
    );
    const res = await PATCH(makeRequest({ userId: SHADOW_ID, inviteEmail: 'alice@example.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ invite_email: 'alice@example.com' });
  });
});
