/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from './route';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getCohortAnalytics } from '@/lib/services/cohort-analytics';

jest.mock('@/lib/getUserWithRolesSSR');
jest.mock('@/lib/services/cohort-analytics', () => ({ getCohortAnalytics: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const mockGetUser = getUserWithRolesSSR as jest.MockedFunction<typeof getUserWithRolesSSR>;
const mockAnalytics = getCohortAnalytics as jest.MockedFunction<typeof getCohortAnalytics>;

type Roles = { isAdmin?: boolean; isTeacher?: boolean; isStudent?: boolean };

function signedInAs(roles: Roles) {
  mockGetUser.mockResolvedValue({
    user: { id: 'auth-1' } as never,
    profileId: 'profile-1',
    isAdmin: roles.isAdmin ?? false,
    isTeacher: roles.isTeacher ?? false,
    isStudent: roles.isStudent ?? false,
    isParent: false,
    isDevelopment: false,
  });
}

function makeRequest(query = 'dimension=status&metric=lessons_completed') {
  return new NextRequest(`http://localhost/api/cohorts/analytics?${query}`);
}

const RESULT = { dimension: 'status', metric: 'lessons_completed', cohorts: [] } as never;

describe('GET /api/cohorts/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalytics.mockResolvedValue(RESULT);
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockGetUser.mockResolvedValue({
      user: null,
      profileId: '',
      isAdmin: false,
      isTeacher: false,
      isStudent: false,
      isParent: false,
      isDevelopment: false,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockAnalytics).not.toHaveBeenCalled();
  });

  it('rejects a signed-in user without a profile with 404', async () => {
    mockGetUser.mockResolvedValue({
      user: { id: 'auth-1' } as never,
      profileId: '',
      isAdmin: false,
      isTeacher: false,
      isStudent: false,
      isParent: false,
      isDevelopment: false,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(404);
  });

  it('rejects students with 403', async () => {
    signedInAs({ isStudent: true });

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    expect(mockAnalytics).not.toHaveBeenCalled();
  });

  it('serves admins (previously 404 — authorized off a nonexistent profiles.role)', async () => {
    signedInAs({ isAdmin: true });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(RESULT);
    expect(mockAnalytics).toHaveBeenCalledWith('status', 'lessons_completed', undefined, undefined);
  });

  it('serves teachers', async () => {
    signedInAs({ isTeacher: true });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it('still validates parameters after authorizing', async () => {
    signedInAs({ isAdmin: true });

    expect((await GET(makeRequest('metric=lessons_completed'))).status).toBe(400);
    expect((await GET(makeRequest('dimension=nope&metric=lessons_completed'))).status).toBe(400);
    expect(
      (await GET(makeRequest('dimension=status&metric=lessons_completed&startDate=bad'))).status
    ).toBe(400);
  });
});
