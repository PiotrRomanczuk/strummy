/**
 * @jest-environment node
 */
import { sendWeeklyInsights } from './send-weekly-insights';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWeeklyInsightsData } from '@/lib/services/weekly-insights';

const mockSendMail = jest.fn();

jest.mock('@/lib/email/smtp-client', () => ({
  __esModule: true,
  default: { sendMail: (options: unknown) => mockSendMail(options) },
  MAIL_FROM: 'Strummy <test@strummy.online>',
  MAIL_REPLY_TO: 'admin@example.com',
}));

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }));

// The cookie-session client must not be used: cron has no session.
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => {
    throw new Error('sendWeeklyInsights must not use the cookie-session client');
  }),
}));

jest.mock('@/lib/services/weekly-insights', () => ({
  getLastWeekDateRange: () => ({
    start: new Date('2026-11-16T00:00:00Z'),
    end: new Date('2026-11-22T23:59:59Z'),
  }),
  getWeeklyInsightsData: jest.fn(async (_client: unknown, teacherId: string) => ({ teacherId })),
}));

jest.mock('@/lib/email/templates/weekly-insights', () => ({
  generateWeeklyInsightsHtml: () => '<p>insights</p>',
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

type Filter = [string, ...unknown[]];

function mockAdminClient(teachers: Array<{ id: string; full_name: string; email: string | null }>) {
  const filters: Filter[] = [];
  const query: Record<string, unknown> = {
    select: () => query,
    or: (...args: unknown[]) => (filters.push(['or', ...args]), query),
    eq: (...args: unknown[]) => (filters.push(['eq', ...args]), query),
    then: (resolve: (v: unknown) => void) => resolve({ data: teachers, error: null }),
  };
  const client = { from: jest.fn(() => query) };
  (createAdminClient as jest.Mock).mockReturnValue(client);
  return { client, filters };
}

describe('sendWeeklyInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'm1' });
  });

  it('reads teachers with the admin client, without the demo cohort', async () => {
    const { client, filters } = mockAdminClient([
      { id: 't1', full_name: 'Teacher', email: 't1@x.test' },
    ]);

    await sendWeeklyInsights();

    expect(client.from).toHaveBeenCalledWith('profiles');
    expect(filters).toContainEqual(['or', 'is_teacher.eq.true,is_admin.eq.true']);
    expect(filters).toContainEqual(['eq', 'is_active', true]);
    expect(filters).toContainEqual(['eq', 'is_development', false]);
  });

  it("passes the same client to each teacher's data and sends one email per teacher", async () => {
    const { client } = mockAdminClient([
      { id: 't1', full_name: 'One', email: 't1@x.test' },
      { id: 't2', full_name: 'Two', email: 't2@x.test' },
    ]);

    const result = await sendWeeklyInsights();

    expect(getWeeklyInsightsData).toHaveBeenCalledWith(
      client,
      't1',
      expect.any(Date),
      expect.any(Date)
    );
    expect(getWeeklyInsightsData).toHaveBeenCalledWith(
      client,
      't2',
      expect.any(Date),
      expect.any(Date)
    );
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true, emailsSent: 2, errors: undefined });
  });

  it('skips a teacher without an email address', async () => {
    mockAdminClient([
      { id: 't1', full_name: 'No mail', email: null },
      { id: 't2', full_name: 'Two', email: 't2@x.test' },
    ]);

    const result = await sendWeeklyInsights();

    expect(getWeeklyInsightsData).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 't2@x.test' }));
    expect(result.emailsSent).toBe(1);
  });
});
