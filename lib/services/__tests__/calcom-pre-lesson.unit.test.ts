import { formatLessonDate, preLessonFor, sendPreLessonEmail } from '../calcom-pre-lesson.helpers';
import { generateBookingPreLessonHtml } from '@/lib/email/templates/booking-pre-lesson';

const sendMail = jest.fn();
jest.mock('@/lib/email/smtp-client', () => ({
  __esModule: true,
  default: { sendMail: (...a: unknown[]) => sendMail(...a) },
  MAIL_FROM: 'Piotr <piotr@strummy.online>',
  MAIL_REPLY_TO: 'p@example.com',
  isSmtpConfigured: () => true,
}));

/** lessons count chain: from().select().eq().is() → { count } */
const adminWithLessonCount = (count: number) =>
  ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({ eq: jest.fn(() => ({ is: jest.fn().mockResolvedValue({ count, error: null }) })) })),
    })),
  }) as never;

const booking = { email: 'ola@example.com', name: 'Ola Nowak', startTime: '2026-11-03T17:30:00Z', skillLevel: 'novice' };
const OLD_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...OLD_ENV, CALCOM_PRE_LESSON_URL: 'https://gitarawarszawa.pl/przed-lekcja/' };
});
afterAll(() => {
  process.env = OLD_ENV;
});

describe('preLessonFor', () => {
  it.each([
    ['beginner', 'od-zera'],
    ['novice', 'podstawy'],
    ['intermediate', 'dalej'],
    ['advanced', 'dalej'],
    [null, 'od-zera'],
    ['unknown', 'od-zera'],
  ])('%s → %s', (level, slug) => {
    expect(preLessonFor(level).slug).toBe(slug);
  });
});

it('formats the lesson time in Warsaw time, in Polish', () => {
  // 17:30 UTC = 18:30 in Warsaw (CET). The connector before the time differs between ICU versions.
  const text = formatLessonDate('2026-11-03T17:30:00Z');
  expect(text).toMatch(/^wtorek, 3 listopada/);
  expect(text).toMatch(/18:30$/);
});

describe('sendPreLessonEmail', () => {
  it('sends the level-matched lesson link on a first lesson', async () => {
    await expect(sendPreLessonEmail(adminWithLessonCount(1), 's1', booking)).resolves.toBe(true);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('ola@example.com');
    expect(mail.html).toContain('https://gitarawarszawa.pl/przed-lekcja/podstawy');
    expect(mail.html).toContain('Cześć Ola,');
    // No account yet — the footer must not claim one or link to the dashboard.
    expect(mail.html).not.toContain('masz konto w Strummy');
    expect(mail.html).not.toContain('/dashboard');
  });

  it('does nothing when the feature env var is not set', async () => {
    delete process.env.CALCOM_PRE_LESSON_URL;
    await expect(sendPreLessonEmail(adminWithLessonCount(1), 's1', booking)).resolves.toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('skips students who already had lessons', async () => {
    await expect(sendPreLessonEmail(adminWithLessonCount(3), 's1', booking)).resolves.toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('never throws when SMTP fails', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(sendPreLessonEmail(adminWithLessonCount(1), 's1', booking)).resolves.toBe(false);
  });
});

it('escapes the booker-supplied name', () => {
  const html = generateBookingPreLessonHtml({
    name: '<script>x</script>',
    lessonDate: 'wtorek',
    levelName: 'Podstawowy',
    preLessonUrl: 'https://x/podstawy',
    chooseLevelUrl: 'https://x',
  });
  expect(html).not.toContain('<script>x');
  expect(html).toContain('&lt;script&gt;');
});
