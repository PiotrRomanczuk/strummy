import { TabRule } from './TabRule';

type TabNotationItem = { label: string; value: string };

type TabNotationProps = {
  items: TabNotationItem[];
  width?: string | number;
  height?: number;
  color?: string;
};

export const TabNotation = ({
  items,
  width = '100%',
  height = 64,
  color = 'var(--ink-3)',
}: TabNotationProps) => (
  <div style={{ position: 'relative', width, height, fontFamily: 'var(--mono)' }}>
    <TabRule height={height} color="var(--ink-5)" strong="var(--ink-4)" />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length},1fr)`,
      }}
    >
      {items.map((m, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderLeft: i === 0 ? 'none' : '1px dashed var(--rule)',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              padding: '1px 8px',
              fontFamily: 'var(--serif)',
              fontSize: 24,
              lineHeight: 1,
              color: 'var(--ink)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {m.value}
          </div>
          <div
            style={{
              color,
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              background: 'var(--card)',
              padding: '2px 8px 0 8px',
              marginTop: 2,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {m.label}
          </div>
        </div>
      ))}
    </div>
  </div>
);
