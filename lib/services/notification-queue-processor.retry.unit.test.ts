/**
 * retryFailedNotifications and the student e-mail switch: a parent's copy
 * (template_data.guardianFor) is student mail, so it is not retried while
 * student e-mails are switched off.
 *
 * @see lib/services/notification-queue-processor.ts
 */

import { retryFailedNotifications } from './notification-queue-processor';
import transporter from '@/lib/email/smtp-client';
import { getRetryableNotifications, updateNotificationRetry } from '@/lib/email/retry-handler';

let recipient: Record<string, unknown>;

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      single: async () => ({ data: recipient, error: null }),
    };
    return { from: () => chain };
  },
}));

jest.mock('@/lib/email/smtp-client', () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue({}) },
  isSmtpConfigured: jest.fn().mockReturnValue(true),
  MAIL_FROM: 'from@example.com',
  MAIL_REPLY_TO: 'reply@example.com',
}));

jest.mock('@/lib/email/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  checkSystemRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('@/lib/email/retry-handler', () => ({
  getRetryableNotifications: jest.fn(),
  updateNotificationRetry: jest.fn(),
  processDeadLetterQueue: jest.fn().mockResolvedValue(0),
  shouldMoveToDeadLetter: jest.fn().mockReturnValue(false),
  moveToDeadLetter: jest.fn(),
}));

jest.mock('@/lib/email/render-notification', () => ({
  renderNotificationHtml: jest.fn().mockReturnValue('<p>html</p>'),
}));

jest.mock('@/lib/notifications/notification-logger', () => ({
  logBatchProcessed: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

jest.mock('./notification-service', () => ({ sendNotification: jest.fn() }));

const failedMail = (templateData: Record<string, unknown>) => ({
  id: 'log-1',
  notification_type: 'lesson_cancelled',
  recipient_profile_id: 'recipient-1',
  subject: 'Subject',
  retry_count: 0,
  template_data: templateData,
});

const OLD_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...OLD_ENV };
  delete process.env.STUDENT_EMAILS_ENABLED;
  delete process.env.STUDENT_EMAIL_TYPES;
  recipient = {
    id: 'recipient-1',
    email: 'mum@example.com',
    full_name: 'Anna',
    is_student: false,
    is_shadow: false,
    invite_email: null,
    locale: 'en',
  };
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe('retryFailedNotifications', () => {
  it("does not retry a parent's copy while student e-mails are disabled", async () => {
    (getRetryableNotifications as jest.Mock).mockResolvedValue([
      failedMail({ guardianFor: 'Emma' }),
    ]);

    const result = await retryFailedNotifications();

    expect(transporter.sendMail).not.toHaveBeenCalled();
    expect(updateNotificationRetry).toHaveBeenCalledWith(
      'log-1',
      'failed',
      1,
      'Student emails disabled'
    );
    expect(result.failed).toBe(1);
  });

  it("retries a parent's copy once student e-mails are enabled", async () => {
    process.env.STUDENT_EMAILS_ENABLED = 'true';
    (getRetryableNotifications as jest.Mock).mockResolvedValue([
      failedMail({ guardianFor: 'Emma' }),
    ]);

    const result = await retryFailedNotifications();

    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    expect(result.retried).toBe(1);
  });

  it('still retries an ordinary non-student mail while student e-mails are disabled', async () => {
    (getRetryableNotifications as jest.Mock).mockResolvedValue([failedMail({})]);

    const result = await retryFailedNotifications();

    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    expect(result.retried).toBe(1);
  });
});
