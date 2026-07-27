/**
 * @jest-environment node
 *
 * Tests for GET/POST /api/external/songs.
 *
 * Regression coverage for the RLS bug: GET used to route through
 * `lib/api/unified-db` -> `lib/api/database-router`, which hits PostgREST
 * directly with the anon key and no user session, so `songs_select_policy`
 * silently returned zero rows regardless of how many songs existed. The fix
 * queries through `createAdminClient()` like the rest of the songs API.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { AuthedProfile } from '@/lib/auth/loadAuthedProfile';

jest.mock('@/lib/supabase/admin');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// withApiAuth mock — controls what authed profile the handler receives
// ---------------------------------------------------------------------------

let _authedProfile: AuthedProfile | null = null;

jest.mock('@/lib/auth/withApiAuth', () => ({
  withApiAuth: jest.fn(
    async (_req: Request, handler: (authed: AuthedProfile, req: Request) => Promise<Response>) => {
      if (!_authedProfile) {
        const { NextResponse } = await import('next/server');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return handler(_authedProfile, _req);
    }
  ),
}));

function mockAuthAs(profile: AuthedProfile | null) {
  _authedProfile = profile;
}

// Import route after mocks are in place
import { GET, POST } from '../route';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEACHER_ID = '45085573-07bc-475b-b8f2-baeae18ffb4e';

const TEACHER_PROFILE: AuthedProfile = {
  user: { id: TEACHER_ID, email: 'teacher@test.com' } as AuthedProfile['user'],
  roles: { isAdmin: false, isTeacher: true, isStudent: false },
  flags: { isParent: false, isDevelopment: false },
};

const SONG_A = { id: 'song-a', title: 'Wonderwall', author: 'Oasis' };
const SONG_B = { id: 'song-b', title: 'Creep', author: 'Radiohead' };

// ---------------------------------------------------------------------------
// Chainable Supabase query builder mock
// ---------------------------------------------------------------------------

function makeSelectChain(result: { data: unknown; error: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'is', 'eq', 'or', 'order', 'range'];
  methods.forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.then = (
    resolve: (value: { data: unknown; error: unknown; count?: number | null }) => unknown
  ) => Promise.resolve(result).then(resolve);
  return chain;
}

function makeInsertChain(result: { data: unknown; error: unknown }) {
  return {
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(result),
      }),
    }),
  };
}

function mockAdminClientForSelect(result: {
  data: unknown;
  error: unknown;
  count?: number | null;
}) {
  const chain = makeSelectChain(result);
  const mock = { from: jest.fn().mockReturnValue(chain) };
  (createAdminClient as jest.Mock).mockReturnValue(mock);
  return chain;
}

function mockAdminClientForInsert(result: { data: unknown; error: unknown }) {
  const chain = makeInsertChain(result);
  const mock = { from: jest.fn().mockReturnValue(chain) };
  (createAdminClient as jest.Mock).mockReturnValue(mock);
  return chain;
}

function makeGetRequest(query = ''): Request {
  return new Request(`http://localhost:3000/api/external/songs${query}`, { method: 'GET' });
}

function makePostRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/external/songs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/external/songs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthAs(null);
  });

  it('returns 401 for unauthenticated request', async () => {
    mockAuthAs(null);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns songs from the admin client (not the anon-key REST path)', async () => {
    mockAuthAs(TEACHER_PROFILE);
    mockAdminClientForSelect({ data: [SONG_A, SONG_B], error: null, count: 2 });

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.songs).toEqual([SONG_A, SONG_B]);
    expect(body.meta.count).toBe(2);
    expect(createAdminClient).toHaveBeenCalled();
  });

  it('always excludes soft-deleted songs', async () => {
    mockAuthAs(TEACHER_PROFILE);
    const chain = mockAdminClientForSelect({ data: [], error: null, count: 0 });

    await GET(makeGetRequest());

    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('applies level and key filters', async () => {
    mockAuthAs(TEACHER_PROFILE);
    const chain = mockAdminClientForSelect({ data: [], error: null, count: 0 });

    await GET(makeGetRequest('?level=beginner&key=C'));

    expect(chain.eq).toHaveBeenCalledWith('level', 'beginner');
    expect(chain.eq).toHaveBeenCalledWith('key', 'C');
  });

  it('applies a title/author search filter', async () => {
    mockAuthAs(TEACHER_PROFILE);
    const chain = mockAdminClientForSelect({ data: [], error: null, count: 0 });

    await GET(makeGetRequest('?search=wonder'));

    expect(chain.or).toHaveBeenCalledWith('title.ilike.%wonder%,author.ilike.%wonder%');
  });

  it('omits the search filter when not provided', async () => {
    mockAuthAs(TEACHER_PROFILE);
    const chain = mockAdminClientForSelect({ data: [], error: null, count: 0 });

    await GET(makeGetRequest());

    expect(chain.or).not.toHaveBeenCalled();
  });

  it('defaults to limit=50 offset=0', async () => {
    mockAuthAs(TEACHER_PROFILE);
    const chain = mockAdminClientForSelect({ data: [], error: null, count: 0 });

    await GET(makeGetRequest());

    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });

  it('applies custom limit and offset as a range', async () => {
    mockAuthAs(TEACHER_PROFILE);
    const chain = mockAdminClientForSelect({ data: [], error: null, count: 0 });

    await GET(makeGetRequest('?limit=10&offset=20'));

    expect(chain.range).toHaveBeenCalledWith(20, 29);
  });

  it('returns 500 with details when the query errors', async () => {
    mockAuthAs(TEACHER_PROFILE);
    mockAdminClientForSelect({ data: null, error: { message: 'connection failed' }, count: null });

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Database query failed');
    expect(body.details).toBe('connection failed');
  });
});

describe('POST /api/external/songs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthAs(null);
  });

  it('returns 401 for unauthenticated request', async () => {
    mockAuthAs(null);

    const res = await POST(
      makePostRequest({ title: 'X', author: 'Y', level: 'beginner', key: 'C' })
    );

    expect(res.status).toBe(401);
  });

  it.each([
    ['title', { author: 'Oasis', level: 'beginner', key: 'C' }],
    ['author', { title: 'Wonderwall', level: 'beginner', key: 'C' }],
    ['level', { title: 'Wonderwall', author: 'Oasis', key: 'C' }],
    ['key', { title: 'Wonderwall', author: 'Oasis', level: 'beginner' }],
  ])('returns 400 when %s is missing', async (_field, body) => {
    mockAuthAs(TEACHER_PROFILE);

    const res = await POST(makePostRequest(body));

    expect(res.status).toBe(400);
    const resBody = await res.json();
    expect(resBody.error).toContain('Missing required fields');
  });

  it('creates a song and returns 201', async () => {
    mockAuthAs(TEACHER_PROFILE);
    mockAdminClientForInsert({
      data: { id: 'new-id', title: 'Wonderwall', author: 'Oasis', level: 'beginner', key: 'C' },
      error: null,
    });

    const res = await POST(
      makePostRequest({ title: 'Wonderwall', author: 'Oasis', level: 'beginner', key: 'C' })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.song.id).toBe('new-id');
    expect(body.meta.created).toBe(true);
  });

  it('returns 500 with details when the insert errors', async () => {
    mockAuthAs(TEACHER_PROFILE);
    mockAdminClientForInsert({ data: null, error: { message: 'duplicate key' } });

    const res = await POST(
      makePostRequest({ title: 'Wonderwall', author: 'Oasis', level: 'beginner', key: 'C' })
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to create song');
    expect(body.details).toBe('duplicate key');
  });
});
