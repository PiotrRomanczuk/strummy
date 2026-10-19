/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

import { PUT } from './route';
import type { AuthedProfile } from '@/lib/auth/loadAuthedProfile';

const mockUpdate = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: () => ({
      update: (payload: unknown) => {
        mockUpdate(payload);
        const chain = {
          eq: () => chain,
          select: () => chain,
          single: () => Promise.resolve({ data: { id: 'ls-1', status: 'slow_tempo' }, error: null }),
        };
        return chain;
      },
    }),
  })),
}));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));

let roles: AuthedProfile['roles'] = { isAdmin: false, isTeacher: true, isStudent: false } as AuthedProfile['roles'];
jest.mock('@/lib/auth/withApiAuth', () => ({
  withApiAuth: jest.fn((req: Request, handler: (a: AuthedProfile, r: Request) => Promise<Response>) =>
    handler({ roles } as AuthedProfile, req)
  ),
}));

const put = (body: unknown) =>
  PUT(new NextRequest('http://localhost/api/lessons/songs/ls-1', { method: 'PUT', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: 'ls-1' }),
  });

beforeEach(() => {
  jest.clearAllMocks();
  roles = { isAdmin: false, isTeacher: true, isStudent: false } as AuthedProfile['roles'];
});

describe('PUT /api/lessons/songs/[id]', () => {
  it('writes the `status` column (not the non-existent `song_status`) and accepts slow_tempo', async () => {
    const res = await put({ song_status: 'slow_tempo' });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'slow_tempo' }));
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('song_status');
  });

  it('also accepts the column name as the body key', async () => {
    await put({ status: 'mastered' });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'mastered' }));
  });

  it('400 on a missing or unknown status', async () => {
    expect((await put({})).status).toBe(400);
    expect((await put({ song_status: 'done' })).status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('403 for a student', async () => {
    roles = { isAdmin: false, isTeacher: false, isStudent: true } as AuthedProfile['roles'];
    expect((await put({ song_status: 'started' })).status).toBe(403);
  });
});
