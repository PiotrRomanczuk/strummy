import { ADMIN_PLATFORM } from '../lib/mock-data';
import { Eyebrow, PulseDot } from '../primitives/atoms';
import { CountUp } from '../primitives/CountUp';
import { StringVibration } from '../primitives/StringVibration';
import { TabNotation } from '../primitives/TabNotation';

type Metric = {
  label: string;
  value: number;
  delta: string;
  prefix?: string;
};

export const PlatformPulseCard = () => {
  const p = ADMIN_PLATFORM;
  const metrics: Metric[] = [
    { label: 'Active 30d', value: p.activeUsers30d, delta: p.activeUsersDelta },
    { label: 'Lessons / wk', value: p.lessonsThisWeek, delta: p.lessonsThisWeekDelta },
    { label: 'MRR', value: p.mrr, delta: p.mrrDelta, prefix: '$' },
  ];

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 18,
        boxShadow: '0 1px 2px rgba(26,22,19,.04), 0 10px 40px -20px rgba(26,22,19,.08)',
        padding: '28px 30px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        minHeight: 380,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: 0.45 }}>
        <StringVibration width={800} height={380} color="var(--success)" opacity={0.1} />
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PulseDot color="var(--success)" />
            <Eyebrow style={{ color: 'var(--success)' }}>Platform pulse</Eyebrow>
          </div>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 56,
              letterSpacing: '-0.035em',
              lineHeight: 1,
              fontWeight: 400,
              marginTop: 10,
            }}
          >
            <em style={{ color: 'var(--success)' }}>Healthy</em>
            <span
              style={{
                color: 'var(--ink-4)',
                fontSize: 18,
                marginLeft: 10,
                fontStyle: 'italic',
              }}
            >
              · 1 watch
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8, maxWidth: 380 }}>
            All core services responding.{' '}
            <span style={{ color: 'var(--warn)' }}>Spotify p95 elevated</span> over the last 30m —
            auto-degraded matchers.
          </div>
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
            key={i}
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
              {m.prefix ?? ''}
              <CountUp to={m.value} format="comma" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Eyebrow>{m.label}</Eyebrow>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: m.delta.startsWith('+') ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {m.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', marginTop: 6 }}>
        <TabNotation
          items={[
            { label: 'Retention 28d', value: `${p.retention28d}%` },
            { label: 'New 7d', value: `+${p.newSignups7d}` },
            { label: 'Avg sess.', value: '34m' },
            { label: 'NPS', value: '62' },
          ]}
          height={66}
        />
      </div>
    </div>
  );
};
