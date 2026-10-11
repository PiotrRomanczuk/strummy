import type { WeekDensityDay } from '@/lib/services/teacher-dashboard-backfill-queries';
import { getIsoWeek } from '@/components/dashboard/topbar/topbar.helpers';

import { card, eyebrow } from './teacher-dashboard.styles';

const shortRange = (days: WeekDensityDay[]): string => {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      .toUpperCase();
  const last = days[days.length - 1];
  return days.length ? `${fmt(days[0].date)}–${new Date(`${last.date}T12:00:00`).getDate()}` : '';
};

/** "Week N · density" — seven dated tiles, today in gold, a dot per lesson. */
export const WeekDensityCard = ({
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
        <span style={eyebrow}>Week {getIsoWeek(now)} · density</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
          {shortRange(days)}
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
              {d.weekday[0]}
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
        }}
      >
        {total} LESSONS · {teachingHours}h TEACHING · {utilizationPct}% UTILIZATION
      </div>
    </div>
  );
};
