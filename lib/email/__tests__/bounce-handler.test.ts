/**
 * Bounce Handler Tests
 *
 * Tests for email bounce handling functionality
 */

import {
  handleBounce,
  checkConsecutiveBounces,
  disableNotificationsForUser,
  reenableNotificationsForUser,
  getBounceStats,
} from '../bounce-handler';

// Mock the admin client
const mockSupabase = {
  from: jest.fn(),
};

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockSupabase),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Bounce Handler - handleBounce and checkConsecutiveBounces', () => {
  describe('handleBounce', () => {
    it('should update notification log and check consecutive bounces', async () => {
      const mockLogEntry = {
        id: 'log-123',
        recipient_profile_id: 'user-123',
        recipient_email: 'user@example.com',
        notification_type: 'lesson_reminder_24h',
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockLogEntry, error: null }),
          };
        } else if (callCount === 2) {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        } else if (callCount === 3) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: [{ status: 'bounced' }, { status: 'bounced' }],
              error: null,
            }),
          };
        }
        return { select: jest.fn() };
      });

      await handleBounce('log-123', 'Invalid email address');
      expect(callCount).toBe(3);
    });

    it('should throw error if notification log not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      });

      await expect(handleBounce('invalid-id', 'Bounce reason')).rejects.toThrow(
        'Notification log entry not found'
      );
    });

    it('should NOT auto-disable notifications after only 3 consecutive bounces', async () => {
      const mockLogEntry = {
        id: 'log-123',
        recipient_profile_id: 'user-123',
        recipient_email: 'user@example.com',
        notification_type: 'lesson_reminder_24h',
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockLogEntry, error: null }),
          };
        } else if (callCount === 2) {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        } else if (callCount === 3) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: [{ status: 'bounced' }, { status: 'bounced' }, { status: 'bounced' }],
              error: null,
            }),
          };
        }
        return { select: jest.fn() };
      });

      await handleBounce('log-123', 'Mailbox full');
      // Should only be 3 calls (fetch log, update log, check bounces)
      // No 4th call to disable since threshold is now 5
      expect(callCount).toBe(3);
    });

    it('should auto-disable notifications after 5 consecutive bounces', async () => {
      const mockLogEntry = {
        id: 'log-123',
        recipient_profile_id: 'user-123',
        recipient_email: 'user@example.com',
        notification_type: 'lesson_reminder_24h',
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockLogEntry, error: null }),
          };
        } else if (callCount === 2) {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        } else if (callCount === 3) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: [
                { status: 'bounced' },
                { status: 'bounced' },
                { status: 'bounced' },
                { status: 'bounced' },
                { status: 'bounced' },
              ],
              error: null,
            }),
          };
        } else if (callCount === 4) {
          // disableNotificationsForUser targets notification_preferences
          expect(table).toBe('notification_preferences');
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return { select: jest.fn() };
      });

      await handleBounce('log-123', 'Mailbox full');
      expect(callCount).toBe(4);
    });
  });

  describe('checkConsecutiveBounces', () => {
    it('should return 0 when last notification was sent successfully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ status: 'sent' }, { status: 'bounced' }],
          error: null,
        }),
      });

      const result = await checkConsecutiveBounces('user-123');
      expect(result).toBe(0);
    });

    it('should count consecutive bounces from most recent', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            { status: 'bounced', created_at: '2025-01-15T12:00:00Z' },
            { status: 'bounced', created_at: '2025-01-14T12:00:00Z' },
            { status: 'bounced', created_at: '2025-01-13T12:00:00Z' },
            { status: 'sent', created_at: '2025-01-12T12:00:00Z' },
          ],
          error: null,
        }),
      });

      const result = await checkConsecutiveBounces('user-123');
      expect(result).toBe(3);
    });

    it('should continue through non-sent statuses but only count bounces', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            { status: 'bounced' },
            { status: 'failed' },
            { status: 'bounced' },
            { status: 'sent' },
          ],
          error: null,
        }),
      });

      const result = await checkConsecutiveBounces('user-123');
      expect(result).toBe(2);
    });

    it('should return 0 on database error or no logs', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      });

      const result = await checkConsecutiveBounces('user-123');
      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });
  });
});

describe('Bounce Handler - User Management and Stats', () => {
  describe('disableNotificationsForUser', () => {
    it('should update notification_preferences to disabled', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        expect(table).toBe('notification_preferences');
        return { update: mockUpdate, eq: mockEq };
      });

      await disableNotificationsForUser('user-123', 'Too many bounces');

      expect(mockUpdate).toHaveBeenCalledWith({ enabled: false });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Notifications disabled for user')
      );
    });

    it('should throw error if update fails', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: new Error('Database error') }),
      });

      await expect(disableNotificationsForUser('user-123', 'Test')).rejects.toThrow(
        'Failed to disable notifications'
      );
    });
  });

  describe('reenableNotificationsForUser', () => {
    it('should re-enable notification_preferences when admin is valid', async () => {
      let callCount = 0;
      const tables: string[] = [];

      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        tables.push(table);
        if (callCount === 1) {
          // Admin check still queries profiles
          expect(table).toBe('profiles');
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'admin-123', is_admin: true },
              error: null,
            }),
          };
        } else if (callCount === 2) {
          // Re-enable targets notification_preferences
          expect(table).toBe('notification_preferences');
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return { select: jest.fn() };
      });

      await reenableNotificationsForUser('user-123', 'admin-123');
      expect(callCount).toBe(2);
      expect(tables).toEqual(['profiles', 'notification_preferences']);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Notifications re-enabled for user')
      );
    });

    it('should throw error if not admin or admin check fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-123', is_admin: false },
          error: null,
        }),
      });

      await expect(reenableNotificationsForUser('user-123', 'user-123')).rejects.toThrow(
        'Only admins can re-enable notifications'
      );
    });
  });

  describe('getBounceStats', () => {
    it('should return complete bounce statistics using notification_preferences', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                { id: 'log-1', created_at: '2025-01-15T12:00:00Z' },
                { id: 'log-2', created_at: '2025-01-14T12:00:00Z' },
              ],
              error: null,
            }),
          };
        } else if (callCount === 2) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: [{ status: 'bounced' }, { status: 'bounced' }],
              error: null,
            }),
          };
        } else if (callCount === 3) {
          expect(table).toBe('notification_preferences');
          // Mock the .select().eq().eq() chain for count query
          const eqFn = jest.fn().mockReturnValue({ count: 0, error: null });
          const selectFn = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: eqFn }) });
          return { select: selectFn };
        }
        return { select: jest.fn() };
      });

      const stats = await getBounceStats('user-123');
      expect(stats).toEqual({
        totalBounces: 2,
        consecutiveBounces: 2,
        lastBounceDate: '2025-01-15T12:00:00Z',
        isDisabled: true,
      });
    });

    it('should handle user with active preferences (not disabled)', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        } else if (callCount === 2) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        } else if (callCount === 3) {
          const eqFn = jest.fn().mockReturnValue({ count: 3, error: null });
          const selectFn = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: eqFn }) });
          return { select: selectFn };
        }
        return { select: jest.fn() };
      });

      const stats = await getBounceStats('user-123');
      expect(stats).toEqual({
        totalBounces: 0,
        consecutiveBounces: 0,
        lastBounceDate: null,
        isDisabled: false,
      });
    });

    it('should throw error if fetch fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      });

      await expect(getBounceStats('user-123')).rejects.toThrow('Failed to fetch bounce logs');
    });
  });
});
