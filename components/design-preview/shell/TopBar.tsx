import { I, Icon } from '../lib/icons';

type TopBarProps = {
  weekLabel?: string;
  primaryLabel?: string;
};

export const TopBar = ({ weekLabel = 'Week 17', primaryLabel = 'New lesson' }: TopBarProps) => (
  <div
    style={{
      height: 56,
      flex: '0 0 56px',
      borderBottom: '1px solid var(--rule)',
      background: 'var(--paper)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 20px',
    }}
  >
    <div style={{ flex: 1 }} />

    <div
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        background: 'var(--gold-tint)',
        color: 'var(--gold-2)',
        fontSize: 12,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Icon d={I.spark} size={12} /> {weekLabel}
    </div>

    <button
      style={{
        border: '1px solid var(--rule)',
        background: 'var(--card)',
        padding: '7px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--ink-3)',
        fontFamily: 'var(--sans)',
      }}
    >
      <Icon d={I.bell} size={14} />
    </button>

    <button
      style={{
        border: 'none',
        background: 'var(--ink)',
        color: 'var(--paper)',
        padding: '8px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'var(--sans)',
      }}
    >
      <Icon d={I.plus} size={13} stroke="var(--paper)" /> {primaryLabel}
    </button>
  </div>
);
