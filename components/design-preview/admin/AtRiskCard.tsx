import { ADMIN_AT_RISK } from '../lib/mock-data';
import { Eyebrow } from '../primitives/atoms';
import { ProgressBar } from '../primitives/ProgressBar';

const churnColor = (n: number) =>
  n > 70 ? 'var(--danger)' : n > 50 ? 'var(--warn)' : 'var(--ink-4)';

export const AtRiskCard = () => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 18,
      boxShadow: '0 1px 2px rgba(26,22,19,.04), 0 10px 40px -20px rgba(26,22,19,.08)',
      padding: '24px 26px',
      minHeight: 380,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--danger)',
              boxShadow: '0 0 0 3px rgba(184,74,58,.18)',
            }}
          />
          <Eyebrow style={{ color: 'var(--danger)' }}>Trending churn · 7d</Eyebrow>
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 28,
            letterSpacing: '-0.02em',
            marginTop: 6,
          }}
        >
          5 students at risk
        </div>
      </div>
      <a style={{ color: 'var(--ink-4)', fontSize: 12, cursor: 'pointer' }}>Open cohort →</a>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: 8 }}>
      {ADMIN_AT_RISK.map((s, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '30px 1fr auto auto',
            gap: 10,
            alignItems: 'center',
            padding: '10px 0',
            borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: s.color,
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {s.avatar}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              <span style={{ color: 'var(--ink-4)' }}>{s.teacher} · </span>
              {s.reason}
            </div>
          </div>
          <div style={{ width: 80 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: churnColor(s.churn),
              }}
            >
              {s.churn}%
            </div>
            <ProgressBar
              value={s.churn}
              max={100}
              delay={70 * i}
              height={3}
              color={churnColor(s.churn)}
            />
          </div>
          <button
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--rule)',
              background: 'var(--card)',
              color: 'var(--ink-2)',
              fontSize: 10,
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
            }}
          >
            Draft email
          </button>
        </div>
      ))}
    </div>
  </div>
);
