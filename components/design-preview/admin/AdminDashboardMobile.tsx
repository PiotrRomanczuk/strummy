import { ADMIN_AT_RISK, ADMIN_SERVICES } from '../lib/mock-data';
import { Eyebrow, PulseDot } from '../primitives/atoms';
import { StringVibration } from '../primitives/StringVibration';

type MobileMetric = { v: number | string; l: string; d: string };

const HERO_METRICS: MobileMetric[] = [
  { v: 1284, l: 'Active 30d', d: '+8.2%' },
  { v: 412, l: 'Lessons /wk', d: '+12%' },
  { v: '$18.4k', l: 'MRR', d: '+$640' },
];

const dotFor = (s: string) =>
  s === 'ok' ? 'var(--success)' : s === 'degraded' ? 'var(--warn)' : 'var(--danger)';

export const AdminDashboardMobile = () => (
  <div
    className="app-viewport"
    style={{
      width: 390,
      height: 844,
      background: 'var(--ivory)',
      color: 'var(--ink)',
      overflow: 'hidden',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <div
      style={{
        height: 44,
        padding: '12px 24px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'var(--mono)',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span>3:46</span>
      <span>● ● ●</span>
    </div>
    <div style={{ padding: '8px 20px 12px' }}>
      <Eyebrow>Platform · Apr 23</Eyebrow>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 22,
          marginTop: 2,
          letterSpacing: '-0.02em',
        }}
      >
        <em style={{ color: 'var(--success)' }}>Healthy</em> · 1 watch
      </div>
    </div>

    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 16px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--card)',
          borderRadius: 16,
          border: '1px solid var(--rule)',
          padding: '16px 18px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.45 }}>
          <StringVibration width={400} height={180} color="var(--success)" opacity={0.1} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PulseDot color="var(--success)" size={6} />
            <Eyebrow style={{ color: 'var(--success)' }}>Platform pulse</Eyebrow>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 10,
              marginTop: 12,
            }}
          >
            {HERO_METRICS.map((m, i) => (
              <div
                key={i}
                style={{
                  borderLeft: i === 0 ? 'none' : '1px solid var(--rule)',
                  paddingLeft: i === 0 ? 0 : 10,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 22,
                    letterSpacing: '-0.02em',
                    fontWeight: 500,
                  }}
                >
                  {typeof m.v === 'number' ? m.v.toLocaleString() : m.v}
                </div>
                <Eyebrow style={{ marginTop: 2 }}>{m.l}</Eyebrow>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    color: 'var(--success)',
                    marginTop: 1,
                  }}
                >
                  {m.d}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'var(--card)',
          borderRadius: 14,
          border: '1px solid var(--rule)',
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Eyebrow style={{ color: 'var(--danger)', marginBottom: 8 }}>At risk · 5 students</Eyebrow>
        {ADMIN_AT_RISK.slice(0, 4).map((s, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr auto',
              gap: 10,
              alignItems: 'center',
              padding: '8px 0',
              borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: s.color,
                color: '#fff',
                fontSize: 9,
                fontWeight: 600,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {s.avatar}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{s.reason}</div>
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: s.churn > 70 ? 'var(--danger)' : 'var(--warn)',
              }}
            >
              {s.churn}%
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'var(--card)',
          borderRadius: 14,
          border: '1px solid var(--rule)',
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 8,
          }}
        >
          <Eyebrow>Services</Eyebrow>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--success)' }}>
            5/6 OK
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {ADMIN_SERVICES.map((s, i) => (
            <div
              key={i}
              style={{
                border: '1px solid var(--rule)',
                borderRadius: 8,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: dotFor(s.status),
                }}
              />
              <div style={{ fontSize: 11, fontWeight: 500 }}>{s.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>
                {s.latency}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          marginTop: 6,
          letterSpacing: '.1em',
        }}
      >
        COHORTS · AUDIT · INVITES
      </div>
    </div>
  </div>
);
