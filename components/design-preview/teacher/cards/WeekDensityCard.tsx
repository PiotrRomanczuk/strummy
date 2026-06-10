import { WEEK_DAYS } from '../../lib/mock-data';
import { Eyebrow } from '../../primitives/atoms';

export const WeekDensityCard = () => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 14,
      padding: '18px 20px',
      boxShadow: 'var(--shadow-sm)',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}
    >
      <Eyebrow>Week 17 · density</Eyebrow>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
        APR 20–26
      </span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
      {WEEK_DAYS.map((d, i) => (
        <div
          key={i}
          style={{
            borderRadius: 8,
            padding: '10px 4px 8px',
            textAlign: 'center',
            background: d.isToday ? 'var(--gold-tint)' : 'var(--rule-2)',
            border: d.isToday ? '1px solid var(--gold-dim)' : '1px solid transparent',
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
            {d.d}
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
            {d.n}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              marginTop: 6,
              height: 4,
            }}
          >
            {Array.from({ length: d.lessons }).map((_, j) => (
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
      12 LESSONS · 9h TEACHING · 78% UTILIZATION
    </div>
  </div>
);
