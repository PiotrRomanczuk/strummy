import { NextRequest, NextResponse } from 'next/server';
import { POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { TEST_ACCOUNT_MUTATION_ERROR } from '@/lib/auth/test-account-guard';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/spotify', () => ({
  getTrack: jest.fn(),
}));
jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    method: string;
    body: unknown;
    constructor(url: string, init?: { method?: string; body?: unknown }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.body = init?.body;
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
  },
  NextResponse: {
    json: jest.fn((data, init) => ({ data, init })),
  },
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

const validMatchId = '123e4567-e89b-12d3-a456-426614174000';

describe('POST /api/spotify/matches/action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/spotify/matches/action', {
      method: 'POST',
      body: JSON.stringify({ matchId: validMatchId, action: 'approve' }),
    });

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('should return 403 if user is not admin or teacher', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { is_admin: false, is_teacher: false },
            error: null,
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/spotify/matches/action', {
      method: 'POST',
      body: JSON.stringify({ matchId: validMatchId, action: 'approve' }),
    });

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' }, { status: 403 });
  });

  it('still blocks a post-rebuild demo account (profiles.id !== auth user.id)', async () => {
    // Regression test for a fail-open bug: the test-account guard queried
    // `profiles` by `.eq('id', user.id)`, but `profiles.id` is an independent
    // PK from the auth user id since the 2026-07-27 identity-model rebuild.
    // For any account created after that rebuild, that lookup returns no row,
    // so the guard silently stopped firing instead of blocking the mutation.
    const authUserId = 'auth-uuid-demo-1';
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: authUserId } },
      error: null,
    });

    let callCount = 0;
    mockSupabase.from = jest.fn((_table) => {
      callCount++;
      if (callCount === 1) {
        // user_overview (primary admin/teacher gate) — already correct
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { is_admin: true, is_teacher: true },
                error: null,
              }),
            }),
          }),
        };
      }
      // profiles (test-account guard) — only resolves the demo row when
      // queried by `user_id`; querying by `id` (the bug) finds nothing.
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn((column: string, value: string) => ({
            single: jest
              .fn()
              .mockResolvedValue(
                column === 'user_id' && value === authUserId
                  ? { data: { is_development: true }, error: null }
                  : { data: null, error: null }
              ),
          })),
        }),
      };
    });

    const request = new NextRequest('http://localhost:3000/api/spotify/matches/action', {
      method: 'POST',
      body: JSON.stringify({ matchId: validMatchId, action: 'approve' }),
    });

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: TEST_ACCOUNT_MUTATION_ERROR },
      { status: 403 }
    );
  });
});
