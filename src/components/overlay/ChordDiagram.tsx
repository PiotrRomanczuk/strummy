import type { ChordVoicing } from "@/lib/types";

interface Props {
  voicing: ChordVoicing;
  size?: number;
  palette?: {
    line?: string;
    dot?: string;
    dotText?: string;
    mute?: string;
    font?: string;
  };
}

export function ChordDiagram({ voicing, size = 150, palette = {} }: Props) {
  const w = size;
  const h = size * 1.15;
  const pad = size * 0.14;
  const innerW = w - pad * 2;
  const innerH = h - pad * 1.6;
  const stringGap = innerW / 5;
  const fretGap = innerH / 4;
  const stroke = palette.line ?? "#1a1a1a";
  const dotColor = palette.dot ?? "#1a1a1a";
  const dotText = palette.dotText ?? "#fff";
  const muteColor = palette.mute ?? "#1a1a1a";
  const font = palette.font ?? "'JetBrains Mono', ui-monospace, monospace";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block" }}>
      {voicing.frets.map((f, i) => {
        const x = pad + i * stringGap;
        const y = pad - 8;
        if (f === -1) {
          return (
            <text key={`m${i}`} x={x} y={y} textAnchor="middle"
              fontFamily={font} fontSize={size * 0.085} fill={muteColor} fontWeight="600">×</text>
          );
        }
        if (f === 0) {
          return (
            <circle key={`o${i}`} cx={x} cy={y - 2} r={size * 0.028}
              fill="none" stroke={stroke} strokeWidth={size * 0.014} />
          );
        }
        return null;
      })}
      <line x1={pad - 1} y1={pad} x2={pad + innerW + 1} y2={pad}
        stroke={stroke} strokeWidth={size * 0.04} strokeLinecap="square" />
      {[1, 2, 3, 4].map((i) => (
        <line key={`f${i}`} x1={pad} y1={pad + fretGap * i} x2={pad + innerW} y2={pad + fretGap * i}
          stroke={stroke} strokeWidth={size * 0.012} opacity="0.85" />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={`s${i}`} x1={pad + i * stringGap} y1={pad} x2={pad + i * stringGap} y2={pad + innerH}
          stroke={stroke} strokeWidth={size * 0.012} opacity="0.85" />
      ))}
      {voicing.frets.map((f, i) => {
        if (f <= 0) return null;
        const x = pad + i * stringGap;
        const y = pad + (f - 0.5) * fretGap;
        const finger = voicing.fingers[i];
        return (
          <g key={`d${i}`}>
            <circle cx={x} cy={y} r={size * 0.075} fill={dotColor} />
            {finger > 0 && (
              <text x={x} y={y + size * 0.03} textAnchor="middle"
                fontFamily={font} fontSize={size * 0.08} fill={dotText} fontWeight="700">
                {finger}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
