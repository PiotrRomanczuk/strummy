import { getLocale, getTranslations } from 'next-intl/server';

import type { WeekDensityDay } from '@/lib/services/teacher-dashboard-backfill-queries';
import { getIsoWeek } from '@/components/dashboard/topbar/topbar.helpers';

import { card, eyebrow } from './teacher-dashboard.styles';
import { narrowWeekday } from './teacher-format.helpers';

const noon = (iso: string) => new Date(`${iso}T12:00:00`);

/** "JUL 20–26" in English; "20–26 LIP" where the day leads the month. */
const shortRange = (days: WeekDensityDay[], locale: string): string => {
  if (!days.length) return '';
  const first = noon(days[0].date);
  const lastDay = noon(days[days.length - 1].date).getDate();
  if (locale.startsWith('en')) {
    const start = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start}–${lastDay}`.toUpperCase();
  }
  const month = first.toLocaleDateString(locale, { month: 'short' }).replace('.', '');
  return `${first.getDate()}–${lastDay} ${month}`.toUpperCase();
};

/** "Week N · density" — seven dated tiles, today in gold, a dot per lesson. */
export const WeekDensityCard = async ({
  days,
  now,
  teachingHours,
  utilizationPct,
}: {
  days: WeekDensityDay[];
  now: Date;
  teachingHours: number;
  utilizationPct: number;
}) => {
  const total = days.reduce((s, d) => s + d.count, 0);
  const [t, locale] = await Promise.all([getTranslations('TeacherHome'), getLocale()]);
  return (
    <div style={card}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <span style={eyebrow}>{t('weekDensity', { week: getIsoWeek(now) })}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
          {shortRange(days, locale)}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {days.map((d) => (
          <div
            key={d.date}
            style={{
              borderRadius: 8,
              padding: '10px 4px 8px',
              textAlign: 'center',
              background: d.isToday ? 'var(--gold-tint)' : 'var(--rule-2)',
              border: `1px solid ${d.isToday ? 'var(--gold-dim)' : 'transparent'}`,
            }}
          >
            <div
              style={{
                color: d.isToday ? 'var(--gold-2)' : 'var(--ink-4)',
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '.12em',
              }}
            >
              {narrowWeekday(d.date, locale)}
            </div>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 18,
                fontWeight: d.isToday ? 500 : 400,
                color: d.isToday ? 'var(--gold-2)' : 'var(--ink)',
                marginTop: 2,
              }}
            >
              {Number(d.date.slice(8))}
            </div>
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 6, height: 4 }}
            >
              {Array.from({ length: Math.min(d.count, 6) }).map((_, j) => (
                <span
                  key={j}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: d.isToday ? 'var(--gold-2)' : 'var(--ink-4)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          color: 'var(--ink-4)',
          textAlign: 'center',
          fontFamily: 'var(--mono)',
          textTransform: 'uppercase',
        }}
      >
        {t('weekSummary', { lessons: total, hours: teachingHours, pct: utilizationPct })}
      </div>
    </div>
  );
};
