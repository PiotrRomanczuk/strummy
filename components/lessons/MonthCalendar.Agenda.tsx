import Link from 'next/link';

import type { LessonRow } from '@/lib/services/lessons-queries';

/**
 * Phone-only list under the month grid: this month's lessons, grouped by day.
 *
 * Seven columns of event chips do not fit 390 px — the grid used to scroll
 * sideways and showed four days at a time. On phones the grid shows dots and
 * this list carries the detail; from `md` up it is hidden and the chips show.
 */
export const MonthCalendarAgenda = ({
  days,
  locale,
  showStudent,
  lessonFallback,
  emptyLabel,
}: {
  /** [yyyy-MM-dd, lessons] for days inside the month, in date order. */
  days: [string, LessonRow[]][];
  locale: string;
  showStudent: boolean;
  lessonFallback: string;
  emptyLabel: string;
}) => {
  const dateLocale = locale.startsWith('en') ? 'en-US' : locale;
  const dayLabel = (key: string) =>
    new Date(`${key}T12:00:00`).toLocaleDateString(dateLocale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });

  if (days.length === 0) {
    return (
      <p className="m-0 border-t border-[var(--rule)] px-4 py-6 text-center font-[family-name:var(--serif)] text-sm italic text-[var(--ink-4)] md:hidden">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="m-0 list-none border-t border-[var(--rule)] p-0 md:hidden">
      {days.map(([key, lessons]) => (
        <li key={key} className="border-b border-[var(--rule)] px-4 py-3 last:border-b-0">
          <p className="m-0 mb-1.5 font-[family-name:var(--mono)] text-[10px] uppercase tracking-[.14em] text-[var(--gold-2)]">
            {dayLabel(key)}
          </p>
          <ul className="m-0 list-none space-y-1 p-0">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/dashboard/lessons/${l.id}`}
                  className="flex items-baseline gap-3 text-[var(--ink)] no-underline"
                >
                  <span className="w-11 shrink-0 font-[family-name:var(--mono)] text-xs text-[var(--ink-3)] tabular-nums">
                    {clock(l.scheduledAt)}
                  </span>
                  <span className="min-w-0 truncate text-sm">
                    {showStudent
                      ? (l.studentName ?? l.studentEmail ?? lessonFallback)
                      : (l.title ?? lessonFallback)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
};
