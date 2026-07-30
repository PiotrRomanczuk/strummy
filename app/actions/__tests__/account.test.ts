import {
  requestEmailChange,
  requestAccountDeletion,
  cancelAccountDeletion,
  updateLastSignIn,
} from '../account';

// Mock getUserWithRolesSSR
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: jest.fn(() => Promise.resolve({ isDevelopment: false })),
}));

// Mock Supabase clients
const mockGetUser = jest.fn();
const mockUpdateUser = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
  })),
}));

const mockAdminFrom = jest.fn();

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockAdminFrom,
    rpc: mockRpc,
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();

  // Default: authenticated user
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });

  // Default chain: .from().update().eq()
  mockEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockAdminFrom.mockReturnValue({ update: mockUpdate });
  mockRpc.mockResolvedValue({ error: null });
});

describe('requestEmailChange', () => {
  it('should return error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const result = await requestEmailChange('new@example.com');
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('should request email change successfully', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const result = await requestEmailChange('new@example.com');
    expect(result).toEqual({
      success: true,
      message: expect.stringContaining('confirmation email'),
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
  });

  it('should handle already registered email', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Email already registered' } });
    const result = await requestEmailChange('taken@example.com');
    expect(result.error).toContain('already in use');
  });

  it('should pass through other errors', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Some other error' } });
    const result = await requestEmailChange('new@example.com');
    expect(result.error).toBe('Some other error');
  });
});

describe('requestAccountDeletion', () => {
  it('should return error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const result = await requestAccountDeletion();
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('should schedule account deletion with 30-day grace period', async () => {
    const result = await requestAccountDeletion();
    expect(result.success).toBe(true);
    expect(result.scheduledFor).toBeDefined();

    // Verify ~30 days in the future
    const scheduledDate = new Date(result.scheduledFor!);
    const now = new Date();
    const diffDays = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);

    expect(mockAdminFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        deletion_requested_at: expect.any(String),
      })
    );
    // `user-123` is an auth id; profiles.id is an independent PK since the
    // July 2026 rebuild, so this must match on user_id or it updates 0 rows.
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('should return error on database failure', async () => {
    mockEq.mockResolvedValue({ error: { message: 'DB error' } });
    const result = await requestAccountDeletion();
    expect(result.error).toBe('Failed to schedule account deletion.');
  });
});

describe('cancelAccountDeletion', () => {
  it('should return error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const result = await cancelAccountDeletion();
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('should cancel account deletion successfully', async () => {
    const result = await cancelAccountDeletion();
    expect(result).toEqual({ success: true, message: 'Account deletion has been cancelled.' });
    expect(mockUpdate).toHaveBeenCalledWith({
      deletion_requested_at: null,
    });
    // `user-123` is an auth id; profiles.id is an independent PK since the
    // July 2026 rebuild, so this must match on user_id or it updates 0 rows.
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('should return error on database failure', async () => {
    mockEq.mockResolvedValue({ error: { message: 'DB error' } });
    const result = await cancelAccountDeletion();
    expect(result.error).toBe('Failed to cancel account deletion.');
  });
});

describe('updateLastSignIn', () => {
  // Regression guard: increment_sign_in_count() and the columns it wrote
  // (profiles.sign_in_count / last_sign_in_at) were dropped by the July 2026
  // identity rebuild. Calling the RPC threw PGRST202 on every sign-in.
  it('does not call the dropped increment_sign_in_count RPC', async () => {
    await expect(updateLastSignIn('user-123')).resolves.toBeUndefined();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
