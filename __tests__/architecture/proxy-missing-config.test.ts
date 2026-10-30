/**
 * proxy.ts with no Supabase config. Nothing can verify a session then, so a
 * production dashboard must refuse the request rather than wave it through.
 */
import type { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

jest.mock('next/server', () => ({
  NextResponse: class {
    status: number;
    constructor(_body: unknown, init?: { status?: number }) {
      this.status = init?.status ?? 200;
    }
    static next() {
      return { status: 200 };
    }
  },
}));

jest.mock('@/lib/supabase/config', () => ({
  getSupabaseConfig: () => {
    throw new Error('missing config');
  },
}));

// jest.setup.js shims Request, so the real NextRequest has no cookies here.
const request = (pathname: string) =>
  ({
    method: 'GET',
    nextUrl: { pathname },
    cookies: { getAll: () => [] },
  }) as unknown as NextRequest;
const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;

afterEach(() => {
  env.NODE_ENV = originalNodeEnv;
});

describe('proxy without Supabase config', () => {
  it('refuses the dashboard in production', async () => {
    env.NODE_ENV = 'production';
    const response = await proxy(request('/dashboard/users'));
    expect(response.status).toBe(503);
  });

  it('keeps public pages up in production', async () => {
    env.NODE_ENV = 'production';
    const response = await proxy(request('/'));
    expect(response.status).toBe(200);
  });

  it('lets local development through', async () => {
    env.NODE_ENV = 'development';
    const response = await proxy(request('/dashboard/users'));
    expect(response.status).toBe(200);
  });
});
