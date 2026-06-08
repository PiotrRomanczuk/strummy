import { Eyebrow } from '../../primitives/atoms';
import { ProgressBar } from '../../primitives/ProgressBar';

type Metric = {
  label: string;
  curr: number;
  prev: number;
  unit: string;
  max: number;
};

const METRICS: Metric[] = [
  { label: 'Teaching hours', curr: 9.0, prev: 7.5, unit: 'h', max: 15 },
  { label: 'Practice logged (studio-wide)', curr: 18.2, prev: 16.8, unit: 'h', max: 25 },
  { label: 'Songs assigned', curr: 14, prev: 11, unit: '', max: 20 },
];

export const UtilizationCard = () => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 14,
      padding: '18px 20px',
      boxShadow: 'var(--shadow-sm)',
    }}
  >
    <Eyebrow style={{ marginBottom: 10 }}>This week vs last</Eyebrow>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {METRICS.map((m, i) => {
        const delta = m.curr - m.prev;
        const dpos = delta >= 0;
        return (
          <div key={i}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--ink-3)' }}>{m.label}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                <span style={{ fontWeight: 500 }}>
                  {m.curr}
                  {m.unit}
                </span>
                <span
                  style={{
                    color: dpos ? 'var(--success)' : 'var(--danger)',
                    marginLeft: 6,
                  }}
                >
                  {dpos ? '+' : ''}
                  {delta.toFixed(m.unit ? 1 : 0)}
                </span>
              </span>
            </div>
            <div style={{ marginTop: 6 }}>
              <ProgressBar value={m.curr} max={m.max} delay={120 * i} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
