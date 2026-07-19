/**
 * Unit Tests: In-App Notification Service — getUserNotifications pagination
 *
 * @see lib/services/in-app-notification-service.ts
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserNotifications } from '../in-app-notification-service';

jest.mock('@/lib/supabase/admin');

type QueryResult = { data: unknown; error: unknown };

type MockQuery = {
  from: jest.Mock;
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  then: jest.Mock;
};

describe('in-app-notification-service — getUserNotifications', () => {
  let mockSupabase: MockQuery;

  // Mimics Supabase's PostgrestFilterBuilder: every filter/modifier method
  // returns the same chainable builder, and the builder itself is "thenable"
  // so `await query` resolves regardless of which method was called last
  // (`.range()`, `.limit()`, or a trailing `.eq()` for unreadOnly).
  const createMockQuery = (result: QueryResult) => {
    const mock = {} as MockQuery;
    mock.from = jest.fn().mockReturnValue(mock);
    mock.select = jest.fn().mockReturnValue(mock);
    mock.eq = jest.fn().mockReturnValue(mock);
    mock.order = jest.fn().mockReturnValue(mock);
    mock.limit = jest.fn().mockReturnValue(mock);
    mock.range = jest.fn().mockReturnValue(mock);
    mock.then = jest.fn((resolve: (value: QueryResult) => void) => resolve(result));

    return mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses .limit() and not .range() when no offset is provided', async () => {
    mockSupabase = createMockQuery({ data: [], error: null });
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);

    await getUserNotifications('user-123', { limit: 20 });

    expect(mockSupabase.limit).toHaveBeenCalledWith(20);
    expect(mockSupabase.range).not.toHaveBeenCalled();
  });

  it('uses .range(offset, offset + limit - 1) when offset is provided', async () => {
    mockSupabase = createMockQuery({ data: [], error: null });
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);

    await getUserNotifications('user-123', { limit: 20, offset: 40 });

    expect(mockSupabase.range).toHaveBeenCalledWith(40, 59);
    expect(mockSupabase.limit).not.toHaveBeenCalled();
  });

  it('pages through results with an increasing offset (second page excludes first page rows)', async () => {
    const page1 = [{ id: '1' }, { id: '2' }];
    const page2 = [{ id: '3' }, { id: '4' }];

    mockSupabase = createMockQuery({ data: page1, error: null });
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
    const firstPage = await getUserNotifications('user-123', { limit: 2, offset: 0 });
    expect(firstPage).toEqual(page1);
    expect(mockSupabase.range).toHaveBeenCalledWith(0, 1);

    mockSupabase = createMockQuery({ data: page2, error: null });
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
    const secondPage = await getUserNotifications('user-123', { limit: 2, offset: 2 });
    expect(secondPage).toEqual(page2);
    expect(mockSupabase.range).toHaveBeenCalledWith(2, 3);
    expect(secondPage.some((n) => page1.some((p) => p.id === n.id))).toBe(false);
  });

  it('defaults to limit 50 with no offset when options are omitted', async () => {
    mockSupabase = createMockQuery({ data: [], error: null });
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);

    await getUserNotifications('user-123');

    expect(mockSupabase.limit).toHaveBeenCalledWith(50);
  });

  it('still applies the unreadOnly filter alongside offset pagination', async () => {
    mockSupabase = createMockQuery({ data: [], error: null });
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);

    await getUserNotifications('user-123', { limit: 10, offset: 10, unreadOnly: true });

    expect(mockSupabase.range).toHaveBeenCalledWith(10, 19);
    expect(mockSupabase.eq).toHaveBeenCalledWith('is_read', false);
  });

  it('returns an empty array on database error', async () => {
    mockSupabase = createMockQuery({ data: null, error: { message: 'boom' } });
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);

    const result = await getUserNotifications('user-123', { limit: 10, offset: 10 });

    expect(result).toEqual([]);
  });
});
