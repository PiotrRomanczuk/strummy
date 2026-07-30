/**
 * Context Fetcher — profile-id space regression tests
 *
 * `context.userId` is the Supabase AUTH session id; `context.profileId` is
 * `profiles.id`, the value every domain FK (lessons.teacher_id,
 * assignments.teacher_id, …) actually stores. Post-S2 (migration
 * 20260727110000) the two differ for every account, so scoping a
 * profile-id-scoped query by `userId` silently returns zero rows.
 *
 * @see lib/ai/registry/context-fetcher.ts
 * @see app/actions/ai/shared.ts (builds the AgentContext these tests exercise)
 */

import { createMockQueryBuilder } from '@/lib/testing/integration-helpers';
import type { AgentContext } from '../types';

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ from: mockFrom })),
}));

// Imported after the mock so `createClient` inside context-fetcher.ts resolves
// to the mocked client.
import { fetchContextData } from '../context-fetcher';

const AUTH_ID = 'auth-0000-1111-2222-333333333333';
const PROFILE_ID = 'profile-4444-5555-6666-777777777777';

function baseContext(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    userId: AUTH_ID,
    profileId: PROFILE_ID,
    userRole: 'teacher',
    sessionId: 'session_1',
    requestId: 'req_1',
    timestamp: new Date(),
    contextData: {},
    ...overrides,
  };
}

describe('fetchContextData — currentUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves the caller profile by user_id (the auth linkage), not id', async () => {
    const builder = createMockQueryBuilder({ id: PROFILE_ID });
    mockFrom.mockReturnValue(builder);

    await fetchContextData('currentUser', baseContext());

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(builder.eq).toHaveBeenCalledWith('user_id', AUTH_ID);
    expect(builder.eq).not.toHaveBeenCalledWith('id', AUTH_ID);
  });
});

describe.each([
  { key: 'recentLessons', table: 'lessons' },
  { key: 'lessonHistory', table: 'lessons' },
  { key: 'assignmentHistory', table: 'assignments' },
])('fetchContextData — $key', ({ key, table }) => {
  beforeEach(() => jest.clearAllMocks());

  it(`scopes ${table} by the caller's profile id, not the auth id`, async () => {
    const builder = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(builder);

    await fetchContextData(key, baseContext());

    expect(mockFrom).toHaveBeenCalledWith(table);
    expect(builder.eq).toHaveBeenCalledWith('teacher_id', PROFILE_ID);
    expect(builder.eq).not.toHaveBeenCalledWith('teacher_id', AUTH_ID);
  });

  it('does not fall back to filtering by the auth id when profileId is absent', async () => {
    const builder = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(builder);

    await fetchContextData(key, baseContext({ profileId: '' }));

    expect(builder.eq).not.toHaveBeenCalledWith('teacher_id', AUTH_ID);
  });
});
