import type { ReactNode } from 'react';

type TileTone = 'neutral' | 'gold' | 'success' | 'danger';

export type StatTileData = {
  label: string;
  value: string;
  unit: string;
  icon: ReactNode;
  tone: TileTone;
};

const ICON_COLOR: Record<TileTone, string> = {
  neutral: 'var(--ink-4)',
  gold: 'var(--gold-2)',
  success: 'var(--success)',
  danger: 'var(--danger)',
};

/** Claude Design `StatTile` row: icon + mono label, 32px serif value + unit. */
export const StudentStatTiles = ({ tiles }: { tiles: StatTileData[] }) => (
  <div className="ui-stat-tiles">
    {tiles.map((s) => {
      const isDanger = s.tone === 'danger';
      return (
        <div
          key={s.label}
          style={{
            flex: 1,
            minWidth: 0,
            background: isDanger
              ? 'color-mix(in srgb, var(--danger) 10%, var(--card))'
              : 'var(--card)',
            border: `1px solid ${isDanger ? 'color-mix(in srgb, var(--danger) 25%, var(--card))' : 'var(--rule)'}`,
            borderRadius: 12,
            padding: '16px 18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: ICON_COLOR[s.tone],
              marginBottom: 10,
            }}
          >
            {s.icon}
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: isDanger ? 'var(--danger)' : 'var(--ink-4)',
              }}
            >
              {s.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 32,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: isDanger ? 'var(--danger)' : 'var(--ink)',
              }}
            >
              {s.value}
            </span>
            <span style={{ fontSize: 13, color: isDanger ? 'var(--danger)' : 'var(--ink-4)' }}>
              {s.unit}
            </span>
          </div>
        </div>
      );
    })}
  </div>
);
