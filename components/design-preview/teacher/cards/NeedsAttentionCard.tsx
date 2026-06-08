import { NEEDS_ATTN } from '../../lib/mock-data';
import { Avatar, Eyebrow } from '../../primitives/atoms';

export const NeedsAttentionCard = () => (
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
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}
    >
      <Eyebrow style={{ color: 'var(--danger)' }}>Needs attention</Eyebrow>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
        3 flags · 2 students
      </span>
    </div>
    <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 12 }}>
      Before today’s lessons
    </div>
    {NEEDS_ATTN.map((n, i) => (
      <div
        key={i}
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 10,
          alignItems: 'center',
          padding: '10px 0',
          borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <Avatar s={n.student} size={26} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{n.student.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{n.reason}</div>
        </div>
        <button
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--rule)',
            background: 'var(--card)',
            fontSize: 10,
            color: 'var(--ink-2)',
            cursor: 'pointer',
            fontFamily: 'var(--sans)',
          }}
        >
          Reach out
        </button>
      </div>
    ))}
  </div>
);
