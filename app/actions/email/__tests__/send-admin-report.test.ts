/**
 * Admin Email Report Server Actions Tests
 *
 * Tests the admin email report functionality:
 * - sendAdminSongReport - Send morning briefing digest via email
 *
 * @see app/actions/email/send-admin-report.ts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { sendAdminSongReport } from '../send-admin-report';

// Mock daily briefing analytics
const mockGetDailyBriefingStats = jest.fn();

jest.mock('@/lib/services/song-analytics', () => ({
  getDailyBriefingStats: () => mockGetDailyBriefingStats(),
}));

// Mock email template
const mockGenerateAdminSongReportHtml = jest.fn();

jest.mock('@/lib/email/templates/admin-song-report', () => ({
  generateAdminSongReportHtml: (stats: any) => mockGenerateAdminSongReportHtml(stats),
}));

// Mock SMTP transporter
const mockSendMail = jest.fn();

jest.mock('@/lib/email/smtp-client', () => ({
  __esModule: true,
  default: {
    sendMail: (options: any) => mockSendMail(options),
  },
  MAIL_FROM: 'Strummy <test@strummy.online>',
  MAIL_REPLY_TO: 'admin@example.com',
}));

const mockBriefingStats = {
  songs: {
    totalSongs: 47,
    coverage: { chords: 68, youtube: 59, ultimateGuitar: 52, galleryImages: 40 },
    counts: { withChords: 32, withYoutube: 28, withUltimateGuitar: 24, withGalleryImages: 19 },
    missing: { chords: [], youtube: [], ultimateGuitar: [], galleryImages: [] },
  },
  students: { total: 12, newThisWeek: 2 },
  lessons: { today: 1, thisWeek: 3, upcoming: 5 },
};

describe('sendAdminSongReport', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
  });

  it('should successfully send morning briefing email', async () => {
    mockGetDailyBriefingStats.mockResolvedValue(mockBriefingStats);
    mockGenerateAdminSongReportHtml.mockReturnValue('<html>Briefing</html>');
    mockSendMail.mockResolvedValue({ messageId: 'msg-123' });

    const result = await sendAdminSongReport();

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-123');
    expect(mockGetDailyBriefingStats).toHaveBeenCalled();
    expect(mockGenerateAdminSongReportHtml).toHaveBeenCalledWith(mockBriefingStats);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@example.com',
        subject: expect.stringContaining('Morning Briefing'),
        html: '<html>Briefing</html>',
      })
    );
  });

  it('should handle stats fetch failure', async () => {
    mockGetDailyBriefingStats.mockRejectedValue(new Error('Database connection failed'));

    const result = await sendAdminSongReport();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database connection failed');
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should handle email send failure', async () => {
    mockGetDailyBriefingStats.mockResolvedValue(mockBriefingStats);
    mockGenerateAdminSongReportHtml.mockReturnValue('<html>Briefing</html>');
    mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

    const result = await sendAdminSongReport();

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP connection failed');
  });

  it('should handle unknown error types', async () => {
    mockGetDailyBriefingStats.mockRejectedValue('String error');

    const result = await sendAdminSongReport();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');
  });

  it('should include weekday and date in subject line', async () => {
    mockGetDailyBriefingStats.mockResolvedValue(mockBriefingStats);
    mockGenerateAdminSongReportHtml.mockReturnValue('<html>Briefing</html>');
    mockSendMail.mockResolvedValue({ messageId: 'msg-456' });

    await sendAdminSongReport();

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/Morning Briefing — \w+, \d+ \w+/),
      })
    );
  });
});
