import { ADMIN_COHORT_INSIGHTS } from '../lib/mock-data';
import { Eyebrow } from '../primitives/atoms';

const LEGEND = [
  { c: 'var(--success)', label: 'Healthy' },
  { c: 'var(--warn)', label: 'At risk' },
  { c: 'var(--ink-4)', label: 'Dormant' },
] as const;

export const CohortInsightsCard = () => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 14,
      padding: '20px 22px',
      boxShadow: 'var(--shadow-sm)',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}
    >
      <div>
        <Eyebrow>Cohort health</Eyebrow>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 }}>
          744 students across the platform
        </div>
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
        Snapshot · 4:00p
      </span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {ADMIN_COHORT_INSIGHTS.map((c, i) => {
        const total = c.count;
        return (
          <div key={i}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>{c.cohort}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                {c.count}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                height: 8,
                borderRadius: 4,
                overflow: 'hidden',
                background: 'var(--rule-2)',
              }}
            >
              <div
                style={{ width: `${(c.healthy / total) * 100}%`, background: 'var(--success)' }}
              />
              <div style={{ width: `${(c.atRisk / total) * 100}%`, background: 'var(--warn)' }} />
              <div style={{ width: `${(c.dormant / total) * 100}%`, background: 'var(--ink-4)' }} />
            </div>
            <div
              style={{
                display: 'flex',
                gap: 14,
                marginTop: 6,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
              }}
            >
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: LEGEND[0].c,
                    marginRight: 4,
                  }}
                />
                Healthy {c.healthy}
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: LEGEND[1].c,
                    marginRight: 4,
                  }}
                />
                At risk {c.atRisk}
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: LEGEND[2].c,
                    marginRight: 4,
                  }}
                />
                Dormant {c.dormant}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
