import type { WeekStripDay } from './student-home.helpers';
import { eyebrow } from './StudentHomePrimitives';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FULL_BAR_MINUTES = 45;

/** "This week": one bar per weekday, filled by minutes practised; today in gold. */
export const StudentWeekStrip = ({ week, label }: { week: WeekStripDay[]; label: string }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ ...eyebrow, marginBottom: 8 }}>{label}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, maxWidth: 380 }}>
      {week.map((d, i) => {
        const tone = d.isToday ? 'var(--gold-2)' : 'var(--ink-4)';
        return (
          <div
            key={d.date}
            title={`${d.date} · ${d.minutes} min`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '6px 0',
              borderRadius: 8,
              background: d.isToday ? 'var(--card)' : 'transparent',
              border: `1px solid ${d.isToday ? 'var(--gold-dim)' : 'transparent'}`,
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '.12em',
                fontFamily: 'var(--mono)',
                color: tone,
              }}
            >
              {LETTERS[i]}
            </div>
            <div
              style={{
                width: 6,
                height: 36,
                borderRadius: 3,
                background: 'var(--rule-2)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${Math.min(100, (d.minutes / FULL_BAR_MINUTES) * 100)}%`,
                  background: d.isToday ? 'var(--gold-2)' : 'var(--ink-4)',
                  borderRadius: 3,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: tone,
                fontWeight: d.isToday ? 600 : 400,
              }}
            >
              {d.minutes || '·'}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
