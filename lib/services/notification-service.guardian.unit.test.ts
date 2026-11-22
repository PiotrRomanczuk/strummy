/**
 * sendNotification and the parent's copy: the copy is sent at all, it obeys the
 * student e-mail switch, and a failed student mail is never reported as sent.
 *
 * @see lib/services/notification-service.ts
 */

import { sendNotification } from './notification-service';
import transporter from '@/lib/email/smtp-client';
import type { SendNotificationParams } from '@/types/notifications';

const STUDENT = 'student-1';
const PARENT = 'parent-1';

let profiles: Record<string, Record<string, unknown>>;

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const chain: Record<string, unknown> = {
        select: () => chain,
        insert: () => chain,
        update: () => chain,
        eq: (column: string, value: unknown) => {
          filters[column] = value;
          return chain;
        },
        single: async () => {
          if (table === 'profiles') return { data: profiles[filters.id as string], error: null };
          if (table === 'notification_log') return { data: { id: 'log-1' }, error: null };
          return { data: null, error: { message: 'none' } };
        },
        maybeSingle: async () => ({
          data: table === 'profiles' ? (profiles[filters.id as string] ?? null) : null,
        }),
      };
      return chain;
    },
  }),
}));

jest.mock('@/lib/email/smtp-client', () => ({
  __esModule: true,
  default: { sendMail: jest.fn() },
  isSmtpConfigured: jest.fn().mockReturnValue(true),
  MAIL_FROM: 'from@example.com',
  MAIL_REPLY_TO: 'reply@example.com',
}));

jest.mock('@/lib/email/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  checkSystemRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('@/lib/notifications/notification-logger', () => ({
  logNotificationSent: jest.fn(),
  logNotificationFailed: jest.fn(),
  logNotificationQueued: jest.fn(),
  logNotificationSkipped: jest.fn(),
  logError: jest.fn(),
}));

const mockCreateInApp = jest.fn();
jest.mock('@/lib/services/in-app-notification-service', () => ({
  createInAppNotification: (...args: unknown[]) => mockCreateInApp(...args),
}));

jest.mock('@/lib/services/notification-helpers', () => ({
  getDeliveryChannel: jest.fn().mockResolvedValue('email'),
  getNotificationSubject: jest.fn().mockReturnValue('Subject'),
  getNotificationHtml: jest.fn().mockResolvedValue('<p>html</p>'),
}));

const sendMail = transporter.sendMail as jest.Mock;

const cancelled = (): SendNotificationParams => ({
  type: 'lesson_cancelled',
  recipientUserId: STUDENT,
  templateData: { studentName: 'Emma', lessonDate: 'Monday' },
  entityType: 'lesson',
  entityId: 'lesson-1',
});

const recipient = (id: string, email: string, isStudent: boolean) => ({
  id,
  email,
  full_name: id,
  is_student: isStudent,
  is_shadow: false,
  invite_email: null,
  locale: 'en',
});

const inAppFor = (id: string) =>
  mockCreateInApp.mock.calls.map(([arg]) => arg).filter((arg) => arg.recipientUserId === id);

const mailedTo = () => sendMail.mock.calls.map(([arg]) => arg.to);

const OLD_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...OLD_ENV };
  delete process.env.STUDENT_EMAILS_ENABLED;
  delete process.env.STUDENT_EMAIL_TYPES;
  mockCreateInApp.mockResolvedValue({ id: 'in-app-1' });
  sendMail.mockResolvedValue({});
  profiles = {
    [STUDENT]: {
      ...recipient(STUDENT, 'kid@example.com', true),
      full_name: 'Emma Kowalska',
      parent_id: PARENT,
    },
    [PARENT]: {
      ...recipient(PARENT, 'mum@example.com', false),
      full_name: 'Anna Kowalska',
      is_parent: true,
    },
  };
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe('sendNotification parent copy', () => {
  it('is sent to the linked parent as well as to the student', async () => {
    await sendNotification(cancelled());
    expect(inAppFor(STUDENT)).toHaveLength(1);
    expect(inAppFor(PARENT)).toHaveLength(1);
  });

  it('stays in-app only while student e-mails are disabled', async () => {
    const result = await sendNotification(cancelled());

    expect(result.success).toBe(true);
    expect(sendMail).not.toHaveBeenCalled();
    expect(inAppFor(PARENT)).toEqual([
      expect.objectContaining({
        recipientUserId: PARENT,
        body: "Emma's lesson on Monday has been cancelled",
        actionUrl: '/dashboard',
        preferActionUrl: true,
      }),
    ]);
  });

  it('is e-mailed once student e-mails are enabled', async () => {
    process.env.STUDENT_EMAILS_ENABLED = 'true';
    await sendNotification(cancelled());
    expect(mailedTo()).toEqual(expect.arrayContaining(['mum@example.com', 'kid@example.com']));
  });

  it('is e-mailed alone to a child without an address of their own', async () => {
    process.env.STUDENT_EMAILS_ENABLED = 'true';
    profiles[STUDENT].email = null;

    const result = await sendNotification(cancelled());

    expect(mailedTo()).toEqual(['mum@example.com']);
    expect(result.success).toBe(true);
  });

  it('does not report a student mail that failed to send as sent', async () => {
    process.env.STUDENT_EMAILS_ENABLED = 'true';
    sendMail.mockImplementation(async ({ to }: { to: string }) => {
      if (to === 'kid@example.com') throw new Error('SMTP connection refused');
      return {};
    });

    const result = await sendNotification(cancelled());

    expect(mailedTo()).toContain('mum@example.com');
    expect(result.success).toBe(false);
  });
});
