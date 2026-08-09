// Pointer-events/stacking are handled by `.ui-datalist-linkrow` on the row —
// this only needs its own layout.
export const MasteryBar = ({ percent }: { percent: number }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span
      style={{
        width: 40,
        height: 4,
        borderRadius: 99,
        background: 'var(--rule-2)',
        overflow: 'hidden',
        display: 'inline-block',
      }}
    >
      <span
        style={{
          display: 'block',
          width: `${percent}%`,
          height: '100%',
          background:
            percent >= 70 ? 'var(--success)' : percent >= 45 ? 'var(--gold-2)' : 'var(--danger)',
        }}
      />
    </span>
    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
      {percent}%
    </span>
  </span>
);
