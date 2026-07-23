/**
 * Selectable editorial controls shared by the onboarding steps: toggle chip,
 * segmented tile (lesson length / practice target), and a level card.
 * Hover/focus styling is in the `ed-onb-*` classes (app/editorial-tokens.css).
 */

export const Chip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className="ed-onb-chip"
    style={{
      padding: '9px 14px',
      borderRadius: 99,
      border: `1px solid ${active ? 'var(--gold-2)' : 'var(--rule)'}`,
      background: active ? 'var(--gold-tint)' : 'var(--card)',
      color: active ? 'var(--ink)' : 'var(--ink-3)',
      fontSize: 13,
      cursor: 'pointer',
      fontWeight: active ? 500 : 400,
      fontFamily: 'var(--sans)',
    }}
  >
    {active ? '✓ ' : ''}
    {label}
  </button>
);

export const SegmentTile = ({
  value,
  unit,
  active,
  onClick,
}: {
  value: number;
  unit: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className="ed-onb-tile"
    style={{
      flex: 1,
      padding: '12px 0',
      borderRadius: 8,
      textAlign: 'center',
      border: `${active ? '1.5px' : '1px'} solid ${active ? 'var(--gold-2)' : 'var(--rule)'}`,
      background: active ? 'var(--gold-tint)' : 'var(--card)',
      cursor: 'pointer',
    }}
  >
    <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, lineHeight: 1 }}>
      {value}
    </div>
    <div
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        marginTop: 4,
      }}
    >
      {unit}
    </div>
  </button>
);

export const LevelCard = ({
  title,
  sub,
  active,
  onClick,
}: {
  title: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className="ed-onb-tile"
    style={{
      textAlign: 'left',
      padding: '14px',
      borderRadius: 10,
      cursor: 'pointer',
      border: `${active ? '1.5px' : '1px'} solid ${active ? 'var(--gold-2)' : 'var(--rule)'}`,
      background: active ? 'var(--gold-tint)' : 'var(--card)',
      position: 'relative',
    }}
  >
    <div
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 16,
        fontWeight: 500,
        marginBottom: 4,
        letterSpacing: '-0.01em',
      }}
    >
      {title}
    </div>
    <div style={{ fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.5 }}>{sub}</div>
    {active && (
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--gold-2)',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 9,
          fontWeight: 600,
        }}
      >
        ✓
      </div>
    )}
  </button>
);
