import {
  getDeliveryChannel,
  getDefaultDeliveryChannel,
  getNotificationSubject,
} from '../notification-helpers';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe('getDefaultDeliveryChannel (NOT-1)', () => {
  it('returns email for every notification type — no per-type split', () => {
    expect(getDefaultDeliveryChannel('lesson_reminder_24h')).toBe('email');
    expect(getDefaultDeliveryChannel('assignment_created')).toBe('email');
    expect(getDefaultDeliveryChannel('student_welcome')).toBe('email');
    expect(getDefaultDeliveryChannel('milestone_reached')).toBe('email');
  });
});

describe('getDeliveryChannel', () => {
  function mockQuery(result: { data: unknown; error: unknown }) {
    const maybeSingle = jest.fn().mockResolvedValue(result);
    const eq2 = jest.fn().mockReturnValue({ maybeSingle });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    const select = jest.fn().mockReturnValue({ eq: eq1 });
    const from = jest.fn().mockReturnValue({ select });
    (createAdminClient as jest.Mock).mockReturnValue({ from });
    return { from, select, eq1, eq2, maybeSingle };
  }

  afterEach(() => jest.clearAllMocks());

  it('returns the stored preference when a row exists — the primary path, not the fallback', async () => {
    mockQuery({ data: { delivery_channel: 'in_app' }, error: null });
    const result = await getDeliveryChannel('user-1', 'lesson_reminder_24h');
    expect(result).toBe('in_app');
  });

  it('falls back to the default when no row exists (new user, no preference row yet)', async () => {
    mockQuery({ data: null, error: null });
    const result = await getDeliveryChannel('user-1', 'assignment_created');
    expect(result).toBe('email');
  });

  it('logs and falls back on a genuine query error, instead of silently pretending success', async () => {
    const { logger } = jest.requireMock('@/lib/logger');
    mockQuery({ data: null, error: { message: 'connection reset' } });
    const result = await getDeliveryChannel('user-1', 'assignment_created');
    expect(result).toBe('email');
    expect(logger.error).toHaveBeenCalledWith(
      '[notification-helpers] Failed to load delivery_channel preference',
      expect.objectContaining({ error: 'connection reset' })
    );
  });
});

describe('getNotificationSubject (locale)', () => {
  it('defaults to English subjects', () => {
    expect(getNotificationSubject('lesson_reminder_24h', {})).toBe('Upcoming Lesson Reminder');
  });

  it('translates the pilot notification types for locale "pl"', () => {
    expect(getNotificationSubject('lesson_reminder_24h', {}, 'pl')).toBe(
      'Przypomnienie o nadchodzącej lekcji'
    );
    expect(
      getNotificationSubject('assignment_due_reminder', { assignmentTitle: 'Skale durowe' }, 'pl')
    ).toBe('Zadanie wkrótce mija termin: Skale durowe');
  });

  it('falls back to English for notification types not yet ported to Polish', () => {
    expect(getNotificationSubject('lesson_cancelled', {}, 'pl')).toBe('Lesson Cancelled');
  });
});
