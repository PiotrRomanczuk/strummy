import { markAllNotificationsAsRead, markNotificationAsRead } from '../in-app-notifications';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const mockGetUserWithRolesSSR = jest.fn();

jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => mockGetUserWithRolesSSR(),
}));

const mockServiceMarkAsRead = jest.fn();
const mockServiceMarkAllAsRead = jest.fn();

jest.mock('@/lib/services/in-app-notification-service', () => ({
  getUserNotifications: jest.fn(),
  markAsRead: (...args: unknown[]) => mockServiceMarkAsRead(...args),
  markAllAsRead: (...args: unknown[]) => mockServiceMarkAllAsRead(...args),
  getUnreadCount: jest.fn(),
}));

// Rows are keyed by profiles.id; the auth id is a different uuid since S2.
const CALLER_ID = 'profile-1';
const AUTH_ID = 'auth-1';

const signedIn = () => ({ user: { id: AUTH_ID }, profileId: CALLER_ID });
const signedOut = () => ({ user: null, profileId: '' });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUserWithRolesSSR.mockResolvedValue(signedIn());
  mockServiceMarkAsRead.mockResolvedValue(true);
  mockServiceMarkAllAsRead.mockResolvedValue(true);
});

describe('markNotificationAsRead', () => {
  it('scopes the mark-read call to the session PROFILE id, not the auth id', async () => {
    const result = await markNotificationAsRead('notif-1');
    expect(result).toBe(true);
    expect(mockServiceMarkAsRead).toHaveBeenCalledWith('notif-1', CALLER_ID);
    expect(mockServiceMarkAsRead).not.toHaveBeenCalledWith('notif-1', AUTH_ID);
  });

  it('rejects when there is no authenticated session', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(signedOut());
    const result = await markNotificationAsRead('notif-1');
    expect(result).toBe(false);
    expect(mockServiceMarkAsRead).not.toHaveBeenCalled();
  });
});

describe('markAllNotificationsAsRead', () => {
  it('allows a caller marking their own notifications read', async () => {
    const result = await markAllNotificationsAsRead(CALLER_ID);
    expect(result).toBe(true);
    expect(mockServiceMarkAllAsRead).toHaveBeenCalledWith(CALLER_ID);
  });

  it('rejects a caller passing a different userId than their session', async () => {
    const result = await markAllNotificationsAsRead('someone-elses-id');
    expect(result).toBe(false);
    expect(mockServiceMarkAllAsRead).not.toHaveBeenCalled();
  });

  it('rejects the auth id — the pre-fix caller contract — so nothing silently no-ops', async () => {
    const result = await markAllNotificationsAsRead(AUTH_ID);
    expect(result).toBe(false);
    expect(mockServiceMarkAllAsRead).not.toHaveBeenCalled();
  });

  it('rejects when there is no authenticated session', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(signedOut());
    const result = await markAllNotificationsAsRead(CALLER_ID);
    expect(result).toBe(false);
    expect(mockServiceMarkAllAsRead).not.toHaveBeenCalled();
  });
});
