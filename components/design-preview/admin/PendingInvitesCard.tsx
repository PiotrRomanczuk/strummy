import { ADMIN_PENDING } from '../lib/mock-data';
import { Eyebrow } from '../primitives/atoms';

export const PendingInvitesCard = () => (
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
        marginBottom: 10,
      }}
    >
      <Eyebrow>Pending invites</Eyebrow>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
        {ADMIN_PENDING.length} open
      </span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {ADMIN_PENDING.map((p, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: 10,
            alignItems: 'center',
            padding: '10px 0',
            borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: 'var(--ink-2)',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {p.email}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
              {p.role} · {p.when} · by {p.invitedBy}
            </div>
          </div>
          <button
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--rule)',
              background: 'transparent',
              fontSize: 10,
              cursor: 'pointer',
              color: 'var(--ink-3)',
              fontFamily: 'var(--sans)',
            }}
          >
            Resend
          </button>
          <button
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontSize: 10,
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
            }}
          >
            Approve
          </button>
        </div>
      ))}
    </div>
  </div>
);
