// Pointer-events/stacking are handled by `.ui-datalist-linkrow` on the row —
// this only needs its own layout.
export const MasteryBar = ({
  percent,
  /** Bar without the trailing "%" — the mobile row prints that separately, above. */
  barOnly = false,
}: {
  percent: number;
  barOnly?: boolean;
}) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span
      style={{
        width: barOnly ? 44 : 40,
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
    {!barOnly && (
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
        {percent}%
      </span>
    )}
  </span>
);
