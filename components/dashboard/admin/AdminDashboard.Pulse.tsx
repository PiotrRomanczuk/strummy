import type { PlatformPulse } from '@/lib/services/admin-dashboard-queries';
import type { AdminPulse } from '@/lib/services/admin-platform-queries';

import { PulseDot, StringWaves } from '../DashboardPrimitives';
import { eyebrow } from '../teacher/teacher-dashboard.styles';
import { adminHero } from './admin-dashboard.styles';

const delta = (curr: number, prev: number): string | null => {
  if (prev === 0) return curr > 0 ? `+${curr}` : null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
};

type Props = { pulse: AdminPulse; totals: PlatformPulse; watchCount: number };

/** "Platform pulse": headline state, three big metrics, a tab-notation strip. */
export const AdminPulseCard = ({ pulse, totals, watchCount }: Props) => {
  const metrics = [
    {
      label: 'Active 30d',
      value: pulse.active30.toLocaleString(),
      delta: delta(pulse.active30, pulse.active30Prev),
    },
    {
      label: 'Lessons / wk',
      value: pulse.lessonsWeek.toLocaleString(),
      delta: delta(pulse.lessonsWeek, pulse.lessonsWeekPrev),
    },
    { label: 'Songs', value: totals.totalSongs.toLocaleString(), delta: null },
  ];
  const strip = [
    { label: 'Retention 28d', value: pulse.retention28 == null ? '—' : `${pulse.retention28}%` },
    { label: 'New 7d', value: `+${pulse.newSignups7d}` },
    { label: 'Students', value: totals.totalStudents.toLocaleString() },
    { label: 'Teachers', value: totals.totalTeachers.toLocaleString() },
  ];
  return (
    <section style={{ ...adminHero, position: 'relative', overflow: 'hidden', gap: 18 }}>
      <StringWaves />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PulseDot color="var(--success)" />
          <span style={{ ...eyebrow, color: 'var(--success)' }}>Platform pulse</span>
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 56,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            marginTop: 10,
          }}
        >
          <em style={{ color: 'var(--success)' }}>Healthy</em>
          {watchCount > 0 && (
            <span
              style={{ color: 'var(--ink-4)', fontSize: 18, marginLeft: 10, fontStyle: 'italic' }}
            >
              · {watchCount} watch
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8, maxWidth: 380 }}>
          {pulse.active30} students practised or had a lesson in the last 30 days.
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          marginTop: 'auto',
        }}
      >
        {metrics.map((m, i) => (
          <div
            key={m.label}
            style={{
              borderLeft: i === 0 ? 'none' : '1px solid var(--rule)',
              paddingLeft: i === 0 ? 0 : 14,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 36,
                letterSpacing: '-0.025em',
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {m.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={eyebrow}>{m.label}</span>
              {m.delta && (
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    color: m.delta.startsWith('-') ? 'var(--danger)' : 'var(--success)',
                  }}
                >
                  {m.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid var(--ink-5)',
          borderBottom: '1px solid var(--ink-5)',
          padding: '8px 0',
        }}
      >
        {strip.map((s, i) => (
          <div
            key={s.label}
            style={{ textAlign: 'center', borderLeft: i === 0 ? 'none' : '1px dashed var(--rule)' }}
          >
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '.12em',
                color: 'var(--ink-3)',
                marginTop: 2,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
