import type { SongStatusKey } from '../lib/types';

const FRET_FOR_STATUS: Record<SongStatusKey, number> = {
  to_learn: 0,
  started: 1,
  remembered: 2,
  with_author: 3,
  mastered: 4,
};

type FretProgressProps = {
  status?: SongStatusKey;
  frets?: number;
  width?: number;
  height?: number;
  color?: string;
  accent?: string;
  showLabels?: boolean;
};

export const FretProgress = ({
  status = 'started',
  frets = 5,
  width = 180,
  height = 28,
  color = 'var(--ink-3)',
  accent = 'var(--gold-2)',
  showLabels = true,
}: FretProgressProps) => {
  const padL = 14;
  const padR = 8;
  const innerW = width - padL - padR;
  const fretIdx = FRET_FOR_STATUS[status] ?? 0;
  const mid = height / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <line x1={padL} y1={4} x2={padL} y2={height - 4} stroke={color} strokeWidth="1.6" />
      {Array.from({ length: frets }).map((_, i) => {
        const x = padL + ((i + 1) / frets) * innerW;
        return (
          <line
            key={i}
            x1={x}
            y1={4}
            x2={x}
            y2={height - 4}
            stroke={color}
            strokeWidth="0.6"
            opacity="0.45"
          />
        );
      })}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = 4 + ((height - 8) / 5) * i;
        return (
          <line
            key={i}
            x1={padL}
            y1={y}
            x2={padL + innerW}
            y2={y}
            stroke={color}
            strokeWidth="0.45"
            opacity="0.5"
          />
        );
      })}
      {[3, 5].map((f) => {
        if (f - 1 >= frets) return null;
        return (
          <circle
            key={f}
            cx={padL + ((f - 0.5) / frets) * innerW}
            cy={mid}
            r="1.4"
            fill={color}
            opacity="0.4"
          />
        );
      })}
      {fretIdx > 0 && (
        <g>
          <line
            x1={padL + ((fretIdx - 0.5) / frets) * innerW}
            y1={4}
            x2={padL + ((fretIdx - 0.5) / frets) * innerW}
            y2={height - 4}
            stroke={accent}
            strokeWidth="2"
            opacity="0.85"
          />
          <circle cx={padL + ((fretIdx - 0.5) / frets) * innerW} cy={mid} r="4.5" fill={accent} />
        </g>
      )}
      {showLabels && (
        <text
          x={padL - 4}
          y={mid + 3}
          textAnchor="end"
          fontSize="9"
          fontFamily="var(--mono)"
          fill={color}
          opacity="0.6"
        >
          0
        </text>
      )}
    </svg>
  );
};
