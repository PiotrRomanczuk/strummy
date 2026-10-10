import type { WeekComparison } from '@/lib/services/teacher-dashboard-studio-queries';

import { card, eyebrow } from './teacher-dashboard.styles';

const Bar = ({ value, max }: { value: number; max: number }) => (
  <div
    style={{
      height: 4,
      background: 'var(--rule-2)',
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 6,
    }}
  >
    <div
      style={{
        width: `${Math.min(100, (value / Math.max(max, 1)) * 100)}%`,
        height: '100%',
        background: 'var(--gold-2)',
        borderRadius: 2,
      }}
    />
  </div>
);

/** "This week vs last" — teaching hours, studio practice, songs assigned. */
export const WeekCompareCard = ({ data }: { data: WeekComparison }) => {
  const rows = [
    { label: 'Teaching hours', v: data.teachingHours, unit: 'h' },
    { label: 'Practice logged (studio-wide)', v: data.practiceHours, unit: 'h' },
    { label: 'Songs assigned', v: data.songsAssigned, unit: '' },
  ];
  return (
    <div style={card}>
      <div style={{ ...eyebrow, marginBottom: 10 }}>This week vs last</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((r) => {
          const delta = Math.round((r.v.curr - r.v.prev) * 10) / 10;
          return (
            <div key={r.label}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--ink-3)' }}>{r.label}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                  <span style={{ fontWeight: 500 }}>
                    {r.v.curr}
                    {r.unit}
                  </span>
                  <span
                    style={{
                      color: delta >= 0 ? 'var(--success)' : 'var(--danger)',
                      marginLeft: 6,
                    }}
                  >
                    {delta >= 0 ? '+' : ''}
                    {delta}
                  </span>
                </span>
              </div>
              <Bar value={r.v.curr} max={Math.max(r.v.curr, r.v.prev) * 1.6} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
