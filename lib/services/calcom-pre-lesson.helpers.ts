import type { createAdminClient } from '@/lib/supabase/admin';
import transporter, { MAIL_FROM, MAIL_REPLY_TO, isSmtpConfigured } from '@/lib/email/smtp-client';
import { generateBookingPreLessonHtml } from '@/lib/email/templates/booking-pre-lesson';
import { createLogger } from '@/lib/logger';

const log = createLogger('calcom');

/**
 * Warm-up lessons live on the teacher's public site, one per level. Unset = feature off,
 * so deploying this code sends nothing until the owner sets
 * CALCOM_PRE_LESSON_URL=https://gitarawarszawa.pl/przed-lekcja.
 */
export const preLessonBaseUrl = (): string | null => process.env.CALCOM_PRE_LESSON_URL?.replace(/\/$/, '') || null;

/** skill_level (mapped from the Cal.com form) → page slug and the name shown in the email. */
const LEVELS: Record<string, { slug: string; name: string }> = {
  beginner: { slug: 'od-zera', name: 'Zaczynam od zera' },
  novice: { slug: 'podstawy', name: 'Podstawowy' },
  intermediate: { slug: 'dalej', name: 'Średniozaawansowany' },
  advanced: { slug: 'dalej', name: 'Zaawansowany' },
};

export function preLessonFor(skillLevel: string | null): { slug: string; name: string } {
  return (skillLevel && LEVELS[skillLevel]) || LEVELS.beginner;
}

export function formatLessonDate(iso: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

type AdminClient = ReturnType<typeof createAdminClient>;
type Booking = { email: string; name: string; startTime: string; skillLevel: string | null };

/** Only a person's first lesson gets the warm-up email — rebookings and regulars do not. */
async function isFirstLesson(admin: AdminClient, studentId: string): Promise<boolean> {
  const { count, error } = await admin
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .is('deleted_at', null);
  return !error && count === 1;
}

/** Best-effort: the lesson is already stored, so a mail failure is logged, never thrown. */
export async function sendPreLessonEmail(admin: AdminClient, studentId: string, booking: Booking) {
  const baseUrl = preLessonBaseUrl();
  if (!baseUrl || !isSmtpConfigured()) return false;
  try {
    if (!(await isFirstLesson(admin, studentId))) return false;
    const level = preLessonFor(booking.skillLevel);
    await transporter.sendMail({
      from: MAIL_FROM,
      to: booking.email,
      replyTo: MAIL_REPLY_TO,
      subject: 'Twoja lekcja wstępna przed pierwszymi zajęciami',
      html: generateBookingPreLessonHtml({
        name: booking.name,
        lessonDate: formatLessonDate(booking.startTime),
        levelName: level.name,
        preLessonUrl: `${baseUrl}/${level.slug}`,
        chooseLevelUrl: baseUrl,
      }),
    });
    return true;
  } catch (error) {
    log.error('Pre-lesson email failed:', error);
    return false;
  }
}
