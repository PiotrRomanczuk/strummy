import { I, Icon } from '../lib/icons';

export const AdminGreeting = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 20,
    }}
  >
    <div>
      <div
        style={{
          color: 'var(--ink-4)',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.16em',
          marginBottom: 6,
        }}
      >
        Platform · Thursday · Apr 23, 2026
      </div>
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--serif)',
          fontWeight: 400,
          fontSize: 36,
          letterSpacing: '-0.02em',
        }}
      >
        Everything sounds <em style={{ color: 'var(--gold-2)' }}>roughly in tune</em>.
      </h1>
      <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 8, maxWidth: 580 }}>
        Spotify is showing elevated latency ·{' '}
        <span style={{ color: 'var(--danger)' }}>5 students</span> trending toward churn this week.
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        style={{
          padding: '9px 14px',
          borderRadius: 8,
          border: '1px solid var(--rule)',
          background: 'var(--card)',
          color: 'var(--ink-2)',
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
        }}
      >
        Send report
      </button>
      <button
        style={{
          padding: '9px 14px',
          borderRadius: 8,
          background: 'var(--ink)',
          color: 'var(--paper)',
          border: 'none',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--sans)',
        }}
      >
        <Icon d={I.plus} size={12} stroke="var(--paper)" /> Invite user
      </button>
    </div>
  </div>
);
