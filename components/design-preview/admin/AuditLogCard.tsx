import { ADMIN_AUDIT } from '../lib/mock-data';
import type { AuditRow } from '../lib/types';
import { Eyebrow, TimeAgo } from '../primitives/atoms';

const FILTERS = ['All', 'Admin', 'Teacher', 'System'] as const;
const ROLE_COLOR: Record<AuditRow['role'], string> = {
  admin: 'var(--gold-2)',
  teacher: 'var(--info)',
  system: 'var(--ink-4)',
};

export const AuditLogCard = () => (
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
      <div>
        <Eyebrow>Audit log</Eyebrow>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 }}>
          Recent activity
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {FILTERS.map((t, i) => (
          <button
            key={t}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 10,
              cursor: 'pointer',
              border: i === 0 ? 'none' : '1px solid var(--rule)',
              background: i === 0 ? 'var(--ink)' : 'transparent',
              color: i === 0 ? 'var(--paper)' : 'var(--ink-3)',
              fontFamily: 'var(--sans)',
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {ADMIN_AUDIT.map((a, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '8px 1fr auto',
            gap: 14,
            alignItems: 'flex-start',
            padding: '10px 0',
            borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: ROLE_COLOR[a.role],
              marginTop: 6,
            }}
          />
          <div style={{ fontSize: 12, lineHeight: 1.45 }}>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{a.who}</span>{' '}
            <span style={{ color: 'var(--ink-2)' }}>{a.verb}</span>{' '}
            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{a.obj}</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
            <TimeAgo minutes={a.mins} />
          </div>
        </div>
      ))}
    </div>
  </div>
);
