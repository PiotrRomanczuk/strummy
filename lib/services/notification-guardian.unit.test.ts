/**
 * The parent's copy of a student's lesson notification: who gets it and what it says.
 *
 * @see lib/services/notification-guardian.ts
 */

import {
  combineWithParentCopy,
  guardianInAppContent,
  PARENT_COPY_TYPES,
  sendParentCopy,
} from './notification-guardian';
import type { SendNotificationParams } from '@/types/notifications';

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

/** Rows each table answers with, keyed by the id the query filtered on. */
let profiles: Record<string, Record<string, unknown>>;

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const filters: Record<string, unknown> = {};
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          filters[column] = value;
          return chain;
        },
        maybeSingle: async () => ({ data: profiles[filters.id as string] ?? null }),
      };
      return chain;
    },
  }),
}));

const STUDENT = 'student-1';
const PARENT = 'parent-1';

const reminder = (overrides: Partial<SendNotificationParams> = {}): SendNotificationParams => ({
  type: 'lesson_reminder_24h',
  recipientUserId: STUDENT,
  templateData: { studentName: 'Emma', lessonDate: 'Monday' },
  entityType: 'lesson',
  entityId: 'lesson-1',
  ...overrides,
});

const send = jest.fn();

beforeEach(() => {
  send.mockReset().mockResolvedValue({ success: true, logId: 'log-parent' });
  profiles = {
    [STUDENT]: { full_name: 'Emma Kowalska', parent_id: PARENT },
    [PARENT]: { id: PARENT, full_name: 'Anna Kowalska', is_parent: true },
  };
});

describe('sendParentCopy', () => {
  it('sends the copy to the linked parent, greeting them and naming the child', async () => {
    await expect(sendParentCopy(reminder(), send)).resolves.toEqual({
      success: true,
      logId: 'log-parent',
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'lesson_reminder_24h',
        recipientUserId: PARENT,
        isGuardianCopy: true,
        entityId: 'lesson-1',
        templateData: expect.objectContaining({
          studentName: 'Anna Kowalska',
          guardianFor: 'Emma',
          lessonDate: 'Monday',
        }),
      })
    );
  });

  it("falls back to the child's profile name when the template has none", async () => {
    await sendParentCopy(reminder({ templateData: { lessonDate: 'Monday' } }), send);
    expect(send.mock.calls[0][0].templateData.guardianFor).toBe('Emma Kowalska');
  });

  it('covers exactly the four lesson notifications', () => {
    expect([...PARENT_COPY_TYPES].sort()).toEqual([
      'lesson_cancelled',
      'lesson_recap',
      'lesson_reminder_24h',
      'lesson_rescheduled',
    ]);
  });

  it.each(['assignment_created', 'student_welcome', 'teacher_daily_summary'] as const)(
    'does not copy %s',
    async (type) => {
      await expect(sendParentCopy(reminder({ type }), send)).resolves.toBeNull();
      expect(send).not.toHaveBeenCalled();
    }
  );

  it('never copies a copy', async () => {
    await expect(sendParentCopy(reminder({ isGuardianCopy: true }), send)).resolves.toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('does nothing for a student with no parent', async () => {
    profiles[STUDENT] = { full_name: 'Emma', parent_id: null };
    await expect(sendParentCopy(reminder(), send)).resolves.toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('ignores a parent_id that points at a profile not flagged as a parent', async () => {
    profiles[PARENT] = { id: PARENT, full_name: 'Someone', is_parent: false };
    await expect(sendParentCopy(reminder(), send)).resolves.toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('reports a failure instead of throwing, so the student send still counts', async () => {
    send.mockRejectedValue(new Error('smtp down'));
    await expect(sendParentCopy(reminder(), send)).resolves.toEqual({
      success: false,
      error: 'Parent copy failed',
    });
  });
});

describe('combineWithParentCopy', () => {
  it("keeps the student's result when the student was reached", () => {
    const student = { success: true, logId: 's' };
    expect(combineWithParentCopy(student, { success: true, logId: 'p' })).toBe(student);
  });

  it('counts a child without an address as notified when the parent was', () => {
    expect(
      combineWithParentCopy(
        {
          success: false,
          error: 'Recipient has no email address',
          errorCode: 'no_email_address',
        },
        { success: true, logId: 'p' }
      )
    ).toEqual({ success: true, logId: 'p' });
  });

  it.each(['SMTP connection refused', 'User rate limited. Retry after 60s'])(
    'keeps a real student failure (%s) even when the parent was notified',
    (error) => {
      const student = { success: false, error };
      expect(combineWithParentCopy(student, { success: true, logId: 'p' })).toBe(student);
    }
  );

  it('stays a failure when neither was reached', () => {
    const student = {
      success: false,
      error: 'Recipient has no email address',
      errorCode: 'no_email_address' as const,
    };
    expect(combineWithParentCopy(student, null)).toBe(student);
    expect(combineWithParentCopy(student, { success: false, error: 'x' })).toBe(student);
  });
});

describe('guardianInAppContent', () => {
  it('names the child and links to the family dashboard, which a parent can open', () => {
    expect(
      guardianInAppContent('lesson_reminder_24h', { guardianFor: 'Emma', lessonTime: '17:00' })
    ).toMatchObject({ body: 'Emma has a lesson at 17:00', actionUrl: '/dashboard' });
    expect(
      guardianInAppContent('lesson_cancelled', { guardianFor: 'Emma', lessonDate: 'Monday' }).body
    ).toBe("Emma's lesson on Monday has been cancelled");
  });
});
