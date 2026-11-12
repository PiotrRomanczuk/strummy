import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import type { LessonRow } from '@/lib/services/lessons-queries';

import { AttendanceReviewActions } from './AttendanceReview.Actions';
import { AttendanceReviewSummary } from './AttendanceReview.Summary';
import { isAwaitingConfirmation, summariseAttendance } from './attendance.helpers';

type Props = {
  /** Lessons of the month on screen. */
  lessons: LessonRow[];
  /** First day of that month — only its lessons count, not the grid's spill-over days. */
  month: Date;
  now: Date;
};

const isInMonth = (lesson: LessonRow, month: Date): boolean => {
  const at = new Date(lesson.scheduledAt);
  return at.getFullYear() === month.getFullYear() && at.getMonth() === month.getMonth();
};

/**
 * Teacher's month review under the calendar: past lessons that still need an
 * answer, then how many lessons each student actually had. The counts are what
 * the lesson-package balance will be built on, so nothing here is inferred —
 * a lesson is "held" only because the teacher said so.
 */
export async function AttendanceReview({ lessons, month, now }: Props) {
  const [t, locale] = await Promise.all([getTranslations('Calendar'), getLocale()]);
  const monthLessons = lessons.filter((l) => isInMonth(l, month));
  const awaiting = monthLessons.filter((l) => isAwaitingConfirmation(l, now));
  const summary = summariseAttendance(monthLessons, now);
  const dateLocale = locale.startsWith('en') ? 'en-US' : locale;
  const when = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  const who = (l: { studentName: string | null; studentEmail: string | null }) =>
    l.studentName ?? l.studentEmail ?? t('lessonFallback');
  const labels = {
    held: t('attendanceHeld'),
    notHeld: t('attendanceNotHeld'),
    failed: t('attendanceFailed'),
  };

  return (
    <section className="rounded-xl border border-border bg-card" data-testid="attendance-review">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">{t('attendanceTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('attendanceSubtitle')}</p>
      </div>

      {awaiting.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">{t('attendanceNothingAwaiting')}</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-border p-0">
          {awaiting.map((l) => (
            <li
              key={l.id}
              data-testid="attendance-awaiting-row"
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link href={`/dashboard/lessons/${l.id}`} className="min-w-0 hover:underline">
                <span className="block truncate text-sm font-medium">{who(l)}</span>
                <span className="block text-xs tabular-nums text-muted-foreground">
                  {when(l.scheduledAt)}
                </span>
              </Link>
              <AttendanceReviewActions lessonId={l.id} labels={labels} />
            </li>
          ))}
        </ul>
      )}

      <AttendanceReviewSummary rows={summary} who={who} />
    </section>
  );
}
