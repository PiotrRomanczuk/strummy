/**
 * Email System Tests
 *
 * Tests for the email sending functionality and templates
 */

import { sendLessonCompletedEmail, LessonEmailData } from './send-lesson-email';
import { sendLessonReminderEmail, LessonReminderEmailData } from './send-reminder-email';
import {
  generateLessonRecapHtml,
  LessonEmailData as RecapTemplateData,
} from './templates/lesson-recap';
import { generateLessonReminderHtml, LessonReminderData } from './templates/lesson-reminder';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
}));

// Import the mocked transporter after mocking
import transporter, { MAIL_FROM, MAIL_REPLY_TO } from './smtp-client';

const mockSendMail = transporter.sendMail as jest.MockedFunction<typeof transporter.sendMail>;

describe('Email System', () => {
  // Store original env values
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
    // Set required environment variables for tests
    process.env.GMAIL_USER = 'test@example.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('generateLessonRecapHtml', () => {
    const baseData: RecapTemplateData = {
      studentName: 'John Doe',
      lessonDate: 'January 15, 2025',
    };

    it('should generate valid HTML', () => {
      const html = generateLessonRecapHtml(baseData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<body');
      expect(html).toContain('</body>');
    });

    it('should include student name', () => {
      const html = generateLessonRecapHtml(baseData);

      expect(html).toContain('Dear John Doe');
    });

    it('should include lesson date', () => {
      const html = generateLessonRecapHtml(baseData);

      expect(html).toContain('January 15, 2025');
    });

    it('should include Guitar CRM branding', () => {
      const html = generateLessonRecapHtml(baseData);

      expect(html).toContain('Guitar Student Management');
      expect(html).toContain('Lesson summary');
    });

    it('should include lesson title when provided', () => {
      const data: RecapTemplateData = {
        ...baseData,
        lessonTitle: 'Introduction to Blues Scales',
      };
      const html = generateLessonRecapHtml(data);

      expect(html).toContain('Introduction to Blues Scales');
      expect(html).toContain('Topic');
    });

    it('should not include lesson title section when not provided', () => {
      const html = generateLessonRecapHtml(baseData);

      expect(html).not.toContain('Topic');
    });

    it('should include notes when provided', () => {
      const data: RecapTemplateData = {
        ...baseData,
        notes: 'Great progress today! Focus on alternate picking.',
      };
      const html = generateLessonRecapHtml(data);

      expect(html).toContain("Teacher's notes");
      expect(html).toContain('Great progress today! Focus on alternate picking.');
    });

    it('should include songs when provided', () => {
      const data: RecapTemplateData = {
        ...baseData,
        songs: [
          { title: 'Wonderwall', artist: 'Oasis', status: 'In Progress' },
          { title: 'Hotel California', artist: 'Eagles', status: 'Mastered' },
        ],
      };
      const html = generateLessonRecapHtml(data);

      expect(html).toContain('Songs practiced');
      expect(html).toContain('Wonderwall');
      expect(html).toContain('Oasis');
      expect(html).toContain('In Progress');
      expect(html).toContain('Hotel California');
      expect(html).toContain('Eagles');
      expect(html).toContain('Mastered');
    });

    it('should include song links when song has id', () => {
      const data: RecapTemplateData = {
        ...baseData,
        songs: [{ id: 'song-123', title: 'Wonderwall', artist: 'Oasis', status: 'In Progress' }],
      };
      const html = generateLessonRecapHtml(data);

      expect(html).toContain('songs/song-123');
    });

    it('should include song notes when provided', () => {
      const data: RecapTemplateData = {
        ...baseData,
        songs: [
          {
            title: 'Wonderwall',
            artist: 'Oasis',
            status: 'In Progress',
            notes: 'Work on the strumming pattern',
          },
        ],
      };
      const html = generateLessonRecapHtml(data);

      expect(html).toContain('Work on the strumming pattern');
    });

    it('should use NEXT_PUBLIC_APP_URL for base URL when available', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.guitarcrm.com';
      const data: RecapTemplateData = {
        ...baseData,
        songs: [{ id: 'song-123', title: 'Test', artist: 'Test', status: 'Test' }],
      };
      const html = generateLessonRecapHtml(data);

      expect(html).toContain('https://app.guitarcrm.com/dashboard/songs/song-123');
    });

    it('should handle base URL with trailing slash', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.guitarcrm.com/';
      const data: RecapTemplateData = {
        ...baseData,
        songs: [{ id: 'song-123', title: 'Test', artist: 'Test', status: 'Test' }],
      };
      const html = generateLessonRecapHtml(data);

      // Should not have double slashes
      expect(html).not.toContain('https://app.guitarcrm.com//');
    });
  });

  describe('generateLessonReminderHtml', () => {
    const baseData: LessonReminderData = {
      studentName: 'Jane Smith',
      lessonDate: 'January 20, 2025',
      lessonTime: '3:00 PM',
    };

    it('should generate valid HTML', () => {
      const html = generateLessonReminderHtml(baseData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include student name', () => {
      const html = generateLessonReminderHtml(baseData);

      expect(html).toContain('Dear Jane Smith');
    });

    it('should include lesson date and time', () => {
      const html = generateLessonReminderHtml(baseData);

      expect(html).toContain('January 20, 2025');
      expect(html).toContain('3:00 PM');
    });

    it('should include reminder message', () => {
      const html = generateLessonReminderHtml(baseData);

      expect(html).toContain('Upcoming Lesson Reminder');
      expect(html).toContain('friendly reminder about your upcoming guitar lesson');
    });

    it('should include location when provided', () => {
      const data: LessonReminderData = {
        ...baseData,
        location: 'Studio A, 123 Music Street',
      };
      const html = generateLessonReminderHtml(data);

      expect(html).toContain('Location');
      expect(html).toContain('Studio A, 123 Music Street');
    });

    it('should not include location section when not provided', () => {
      const html = generateLessonReminderHtml(baseData);

      // Check that the Location label is not present without the data
      const locationCount = (html.match(/Location/g) || []).length;
      expect(locationCount).toBe(0);
    });

    it('should include agenda when provided', () => {
      const data: LessonReminderData = {
        ...baseData,
        agenda: 'Continue working on fingerpicking exercises',
      };
      const html = generateLessonReminderHtml(data);

      expect(html).toContain('Planned agenda');
      expect(html).toContain('Continue working on fingerpicking exercises');
    });

    it('should include dashboard link', () => {
      const html = generateLessonReminderHtml(baseData);

      expect(html).toContain('View Dashboard');
      expect(html).toContain('/dashboard');
    });

    it('should include farewell message', () => {
      const html = generateLessonReminderHtml(baseData);

      expect(html).toContain('See you soon!');
    });
  });

  describe('sendLessonCompletedEmail', () => {
    const validEmailData: LessonEmailData = {
      studentEmail: 'student@example.com',
      studentName: 'Test Student',
      lessonDate: 'January 15, 2025',
      lessonTitle: 'Guitar Basics',
      notes: 'Good session',
      songs: [],
    };

    it('should return error when GMAIL_USER is not set', async () => {
      delete process.env.GMAIL_USER;

      const result = await sendLessonCompletedEmail(validEmailData);

      expect(result.error).toBeDefined();
      expect((result.error as { message: string })?.message).toBe('SMTP credentials missing');
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should return error when GMAIL_APP_PASSWORD is not set', async () => {
      delete process.env.GMAIL_APP_PASSWORD;

      const result = await sendLessonCompletedEmail(validEmailData);

      expect(result.error).toBeDefined();
      expect((result.error as { message: string })?.message).toBe('SMTP credentials missing');
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should send email with correct parameters', async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: '<test-message-id@example.com>',
        accepted: ['student@example.com'],
        rejected: [],
        pending: [],
        response: '250 OK',
        envelope: { from: 'test@example.com', to: ['student@example.com'] },
      });

      await sendLessonCompletedEmail(validEmailData);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          // Sender comes from MAIL_FROM now, not a per-call-site literal. It
          // used to read "Guitar CRM" — the pre-rename product name students
          // were still seeing in 2026 — off ${GMAIL_USER}.
          from: MAIL_FROM,
          replyTo: MAIL_REPLY_TO,
          to: 'student@example.com',
          subject: expect.stringContaining('Lesson Summary - January 15, 2025'),
          html: expect.stringContaining('Test Student'),
        })
      );
    });

    it('should return message ID on success', async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: '<success-message-id@example.com>',
        accepted: ['student@example.com'],
        rejected: [],
        pending: [],
        response: '250 OK',
        envelope: { from: 'test@example.com', to: ['student@example.com'] },
      });

      const result = await sendLessonCompletedEmail(validEmailData);

      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('<success-message-id@example.com>');
      expect(result.error).toBeNull();
    });

    it('should handle SMTP errors gracefully', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await sendLessonCompletedEmail(validEmailData);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Connection refused');
      expect(result.data).toBeNull();
    });

    it('should handle unknown errors', async () => {
      mockSendMail.mockRejectedValueOnce('Unknown error');

      const result = await sendLessonCompletedEmail(validEmailData);

      expect(result.error?.message).toBe('Unknown error sending email');
    });
  });

  describe('sendLessonReminderEmail', () => {
    const validEmailData: LessonReminderEmailData = {
      studentEmail: 'student@example.com',
      studentName: 'Test Student',
      lessonDate: 'January 20, 2025',
      lessonTime: '4:00 PM',
    };

    it('should return error when credentials are missing', async () => {
      delete process.env.GMAIL_USER;

      const result = await sendLessonReminderEmail(validEmailData);

      expect(result.error).toBeDefined();
      expect((result.error as { message: string })?.message).toBe('SMTP credentials missing');
    });

    it('should send email with correct subject', async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: '<reminder-message-id@example.com>',
        accepted: ['student@example.com'],
        rejected: [],
        pending: [],
        response: '250 OK',
        envelope: { from: 'test@example.com', to: ['student@example.com'] },
      });

      await sendLessonReminderEmail(validEmailData);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Reminder: Guitar Lesson on January 20, 2025 at 4:00 PM',
        })
      );
    });

    it('should return message ID on success', async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: '<reminder-success@example.com>',
        accepted: ['student@example.com'],
        rejected: [],
        pending: [],
        response: '250 OK',
        envelope: { from: 'test@example.com', to: ['student@example.com'] },
      });

      const result = await sendLessonReminderEmail(validEmailData);

      expect(result.data?.id).toBe('<reminder-success@example.com>');
    });

    it('should handle errors', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));

      const result = await sendLessonReminderEmail(validEmailData);

      expect(result.error).toBeDefined();
    });

    it('should include location in email when provided', async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: '<loc-message@example.com>',
        accepted: ['student@example.com'],
        rejected: [],
        pending: [],
        response: '250 OK',
        envelope: { from: 'test@example.com', to: ['student@example.com'] },
      });

      const dataWithLocation: LessonReminderEmailData = {
        ...validEmailData,
        location: 'Music Studio B',
      };

      await sendLessonReminderEmail(dataWithLocation);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Music Studio B'),
        })
      );
    });
  });

  describe('Email Template Edge Cases', () => {
    it('should handle special characters in student name', () => {
      const data: RecapTemplateData = {
        studentName: "O'Connor & Smith <test>",
        lessonDate: 'January 15, 2025',
      };
      const html = generateLessonRecapHtml(data);

      // Should contain the name (note: HTML encoding is not done in template)
      expect(html).toContain("O'Connor & Smith");
    });

    it('should handle empty songs array', () => {
      const data: RecapTemplateData = {
        studentName: 'Test',
        lessonDate: 'January 15, 2025',
        songs: [],
      };
      const html = generateLessonRecapHtml(data);

      // Should not include Songs Practiced section
      expect(html).not.toContain('Songs Practiced');
    });

    it('should handle very long notes', () => {
      const longNotes = 'Practice this pattern: '.repeat(100);
      const data: RecapTemplateData = {
        studentName: 'Test',
        lessonDate: 'January 15, 2025',
        notes: longNotes,
      };
      const html = generateLessonRecapHtml(data);

      expect(html).toContain(longNotes);
    });

    it('should handle multiple songs', () => {
      const songs = Array.from({ length: 10 }, (_, i) => ({
        title: `Song ${i + 1}`,
        artist: `Artist ${i + 1}`,
        status: 'In Progress',
      }));
      const data: RecapTemplateData = {
        studentName: 'Test',
        lessonDate: 'January 15, 2025',
        songs,
      };
      const html = generateLessonRecapHtml(data);

      expect(html).toContain('Song 1');
      expect(html).toContain('Song 10');
    });

    it('should use fallback URL when no env vars set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXT_PUBLIC_API_BASE_URL_REMOTE;

      const data: RecapTemplateData = {
        studentName: 'Test',
        lessonDate: 'January 15, 2025',
        songs: [{ id: 'song-123', title: 'Test', artist: 'Test', status: 'Test' }],
      };
      const html = generateLessonRecapHtml(data);

      expect(html).toContain('http://localhost:3000/dashboard/songs/song-123');
    });
  });

  describe('SMTP Client Configuration', () => {
    it('should export a transporter with sendMail method', () => {
      expect(transporter).toBeDefined();
      expect(typeof transporter.sendMail).toBe('function');
    });

    it('should use the mocked transporter', () => {
      expect(mockSendMail).toBeDefined();
      expect(jest.isMockFunction(mockSendMail)).toBe(true);
    });
  });
});
