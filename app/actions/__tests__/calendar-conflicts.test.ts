import {
  fetchPendingConflicts,
  resolveConflict,
  autoResolveOldConflictsAction,
} from '../calendar-conflicts';

const mockGetPendingConflicts = jest.fn();
const mockResolveConflictManually = jest.fn();
const mockAutoResolveOldConflicts = jest.fn();

jest.mock('@/lib/services/sync-conflict-resolver', () => ({
  getPendingConflicts: (...args: unknown[]) => mockGetPendingConflicts(...args),
  resolveConflictManually: (...args: unknown[]) => mockResolveConflictManually(...args),
  autoResolveOldConflicts: (...args: unknown[]) => mockAutoResolveOldConflicts(...args),
}));

const mockGetUser = jest.fn();
const supabaseClient = { auth: { getUser: mockGetUser } };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(supabaseClient)),
}));

const mockGetUserWithRoles = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => mockGetUserWithRoles(),
}));

const USER_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
// A claimed invite: the profile id differs from the auth id (#1079).
const PROFILE_ID = 'bbbbbbbb-2222-4222-8222-222222222222';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  });
  mockGetUserWithRoles.mockResolvedValue({ user: { id: USER_ID }, profileId: PROFILE_ID });
});

describe('fetchPendingConflicts', () => {
  it('returns Unauthorized when no user is in session', async () => {
    mockGetUserWithRoles.mockResolvedValue({ user: null, profileId: null });
    expect(await fetchPendingConflicts()).toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(mockGetPendingConflicts).not.toHaveBeenCalled();
  });

  it('returns Unauthorized when the user has no profile', async () => {
    mockGetUserWithRoles.mockResolvedValue({ user: { id: USER_ID }, profileId: null });
    expect(await fetchPendingConflicts()).toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(mockGetPendingConflicts).not.toHaveBeenCalled();
  });

  it("returns the conflicts of the teacher's lessons, keyed by profile id (not auth id)", async () => {
    const conflicts = [{ id: 'c1', lesson_id: 'l1' }];
    mockGetPendingConflicts.mockResolvedValueOnce(conflicts);
    const result = await fetchPendingConflicts();
    expect(result).toEqual({ success: true, conflicts });
    expect(mockGetPendingConflicts).toHaveBeenCalledWith(supabaseClient, PROFILE_ID);
  });

  it('translates service errors into action errors', async () => {
    mockGetPendingConflicts.mockRejectedValueOnce(new Error('boom'));
    expect(await fetchPendingConflicts()).toEqual({
      success: false,
      error: 'boom',
    });
  });
});

describe('resolveConflict', () => {
  it('returns Unauthorized when no user is in session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await resolveConflict('c1', 'use_local')).toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(mockResolveConflictManually).not.toHaveBeenCalled();
  });

  it('forwards the resolution to the service', async () => {
    mockResolveConflictManually.mockResolvedValueOnce({ success: true });
    const result = await resolveConflict('c1', 'use_remote');
    expect(result).toEqual({ success: true });
    expect(mockResolveConflictManually).toHaveBeenCalledWith(supabaseClient, 'c1', 'use_remote');
  });

  it('translates thrown errors into action errors', async () => {
    mockResolveConflictManually.mockRejectedValueOnce(new Error('write fail'));
    expect(await resolveConflict('c1', 'use_local')).toEqual({
      success: false,
      error: 'write fail',
    });
  });
});

describe('autoResolveOldConflictsAction', () => {
  it('returns Unauthorized when no user is in session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await autoResolveOldConflictsAction()).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('returns the {resolved, failed} counts from the service', async () => {
    mockAutoResolveOldConflicts.mockResolvedValueOnce({
      resolved: 4,
      failed: 1,
    });
    expect(await autoResolveOldConflictsAction()).toEqual({
      success: true,
      resolved: 4,
      failed: 1,
    });
  });

  it('reports failure when the service throws', async () => {
    mockAutoResolveOldConflicts.mockRejectedValueOnce(new Error('disconnect'));
    expect(await autoResolveOldConflictsAction()).toEqual({
      success: false,
      error: 'disconnect',
    });
  });
});
