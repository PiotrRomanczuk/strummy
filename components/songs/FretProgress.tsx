import { STAGES, STAGE_COLOR, type StageKey } from './SongPrimitives';

type Props = {
  status: string;
  width?: number;
  height?: number;
  frets?: number;
};

const isStage = (s: string): s is StageKey => STAGES.some((st) => st.key === s);

/**
 * Claude Design `FretProgress`: a song's stage drawn as a finger on a tiny
 * fretboard — "to learn" sits behind the nut, each later stage one fret on.
 */
export const FretProgress = ({ status, width = 170, height = 22, frets = 5 }: Props) => {
  const padL = 14;
  const innerW = width - padL - 8;
  const fretIdx = isStage(status) ? STAGES.findIndex((s) => s.key === status) : 0;
  const mid = height / 2;
  const color = 'var(--ink-3)';
  const accent = 'var(--gold-2)';
  const xFor = (fret: number) => padL + ((fret - 0.5) / frets) * innerW;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <line x1={padL} y1={4} x2={padL} y2={height - 4} stroke={color} strokeWidth="1.6" />
      {Array.from({ length: frets }, (_, i) => {
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
      {[3, 5].map((f) =>
        f - 1 < frets ? (
          <circle key={f} cx={xFor(f)} cy={mid} r="1.4" fill={color} opacity="0.4" />
        ) : null
      )}
      {fretIdx > 0 && (
        <g>
          <line
            x1={xFor(fretIdx)}
            y1={4}
            x2={xFor(fretIdx)}
            y2={height - 4}
            stroke={accent}
            strokeWidth="2"
            opacity="0.85"
          />
          <circle cx={xFor(fretIdx)} cy={mid} r="4.5" fill={accent} />
        </g>
      )}
    </svg>
  );
};

/** Compact stage pill: five dots (filled up to the stage) and the label. */
export const StagePill = ({ status, label }: { status: string; label: string }) => {
  const stage = isStage(status) ? status : 'to_learn';
  const idx = STAGES.findIndex((s) => s.key === stage);
  const color = STAGE_COLOR[stage];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 999,
        background: `color-mix(in oklab, ${color} 9%, transparent)`,
        color,
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      <span style={{ display: 'inline-flex', gap: 2 }} aria-hidden="true">
        {STAGES.map((s, i) => (
          <span
            key={s.key}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: i <= idx ? color : 'var(--rule)',
            }}
          />
        ))}
      </span>
      {label}
    </span>
  );
};
