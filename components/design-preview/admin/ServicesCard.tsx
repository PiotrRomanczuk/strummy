import { I, Icon } from '../lib/icons';
import { ADMIN_SERVICES } from '../lib/mock-data';
import { Eyebrow } from '../primitives/atoms';

const dotColor = (s: string) =>
  ({ ok: 'var(--success)', degraded: 'var(--warn)', down: 'var(--danger)' })[s] || 'var(--ink-4)';

export const ServicesCard = () => (
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
        marginBottom: 12,
      }}
    >
      <Eyebrow>Services</Eyebrow>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--success)' }}>
        5/6 OK
      </span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {ADMIN_SERVICES.map((s, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '14px 1fr auto auto',
            gap: 12,
            alignItems: 'center',
            padding: '10px 0',
            borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: dotColor(s.status),
              }}
            />
            {s.status === 'degraded' && (
              <span
                style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: '50%',
                  border: `1.5px solid ${dotColor(s.status)}`,
                  opacity: 0.4,
                  animation: 'strummy-pulse 1.6s ease-out infinite',
                }}
              />
            )}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
            {s.note && <div style={{ fontSize: 11, color: 'var(--warn)' }}>{s.note}</div>}
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-3)',
              textAlign: 'right',
            }}
          >
            <div>{s.latency}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>{s.uptime}</div>
          </div>
          <Icon d={I.chevron} size={12} style={{ color: 'var(--ink-4)' }} />
        </div>
      ))}
    </div>
  </div>
);
