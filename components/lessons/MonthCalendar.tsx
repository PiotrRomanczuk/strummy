import Link from 'next/link';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { getLocale, getTranslations } from 'next-intl/server';

import type { LessonRow } from '@/lib/services/lessons-queries';
import { cn } from '@/lib/utils';

import { MonthCalendarAgenda } from './MonthCalendar.Agenda';
import { EventChip, STATUS_DOT } from './MonthCalendar.EventChip';

type Props = {
  lessons: LessonRow[];
  /** Any date inside the month to render. */
  month: Date;
  now: Date;
  /** Teacher/admin see the student's name on each event; students see the title. */
  showStudent: boolean;
};

const MAX_PER_DAY = 3;

const dayKey = (d: Date): string => format(d, 'yyyy-MM-dd');
const monthParam = (d: Date): string => format(d, 'yyyy-MM');

/** "October 2026" / "Październik 2026": Intl knows the stand-alone month form. */
const monthTitle = (d: Date, locale: string): string => {
  const text = new Intl.DateTimeFormat(locale.startsWith('en') ? 'en-US' : locale, {
    month: 'long',
    year: 'numeric',
  }).format(d);
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
};

const groupByDay = (lessons: LessonRow[]): Map<string, LessonRow[]> => {
  const map = new Map<string, LessonRow[]>();
  for (const l of lessons) {
    const key = dayKey(new Date(l.scheduledAt));
    const bucket = map.get(key);
    if (bucket) bucket.push(l);
    else map.set(key, [l]);
  }
  return map;
};

export async function MonthCalendar({ lessons, month, now, showStudent }: Props) {
  const [t, locale] = await Promise.all([getTranslations('Calendar'), getLocale()]);
  const weekdays = t.raw('weekdays') as string[];
  const lessonFallback = t('lessonFallback');
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const byDay = groupByDay(lessons);

  return (
    <section className="rounded-xl border border-border bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">{monthTitle(month, locale)}</h2>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={`/dashboard/calendar?month=${monthParam(subMonths(month, 1))}`}
            aria-label={t('prevMonthAriaLabel')}
            className="rounded-md border border-border px-2 py-1 hover:bg-muted"
          >
            ‹
          </Link>
          <Link
            href="/dashboard/calendar"
            className="rounded-md border border-border px-2.5 py-1 hover:bg-muted"
          >
            {t('todayLink')}
          </Link>
          <Link
            href={`/dashboard/calendar?month=${monthParam(addMonths(month, 1))}`}
            aria-label={t('nextMonthAriaLabel')}
            className="rounded-md border border-border px-2 py-1 hover:bg-muted"
          >
            ›
          </Link>
        </div>
      </div>

      {/* Grid: all seven columns fit a phone (dots), chips from md up. */}
      <div>
        <div>
          <div className="grid grid-cols-7 border-b border-border">
            {weekdays.map((w) => (
              <div
                key={w}
                className="px-0.5 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:px-2"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = isSameMonth(day, month);
              const isToday = isSameDay(day, now);
              const dayLessons = byDay.get(dayKey(day)) ?? [];
              const overflow = dayLessons.length - MAX_PER_DAY;
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[52px] min-w-0 border-b border-r border-border p-1 md:min-h-[92px] md:p-1.5 [&:nth-child(7n)]:border-r-0',
                    !inMonth && 'bg-muted/30'
                  )}
                >
                  <div
                    className={cn(
                      'mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs tabular-nums',
                      isToday && 'bg-primary font-semibold text-primary-foreground',
                      !isToday && !inMonth && 'text-muted-foreground/60',
                      !isToday && inMonth && 'text-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  {dayLessons.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 px-0.5 md:hidden" aria-hidden="true">
                      {dayLessons.slice(0, 4).map((l) => (
                        <span
                          key={l.id}
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            STATUS_DOT[l.status.toLowerCase()] ?? 'bg-muted-foreground'
                          )}
                        />
                      ))}
                    </div>
                  )}
                  <div className="hidden space-y-0.5 md:block">
                    {dayLessons.slice(0, MAX_PER_DAY).map((l) => (
                      <EventChip
                        key={l.id}
                        lesson={l}
                        showStudent={showStudent}
                        lessonFallback={lessonFallback}
                      />
                    ))}
                    {overflow > 0 && (
                      <div className="px-1 text-[10px] text-muted-foreground">
                        {t('moreCount', { count: overflow })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <MonthCalendarAgenda
        days={[...byDay.entries()]
          .filter(([key]) => key.startsWith(monthParam(month)))
          .sort(([a], [b]) => a.localeCompare(b))}
        locale={locale}
        showStudent={showStudent}
        lessonFallback={lessonFallback}
        emptyLabel={t('agendaEmpty')}
      />
    </section>
  );
}
