import { FRETS, STRINGS, stringX, type ChordGridBox as Box } from './chord-grid.helpers';

/** The dashed box and its "no shape" note. */
export const ChordGridNoShape = ({
  box,
  color,
  label,
}: {
  box: Box;
  color: string;
  label: string;
}) => (
  <>
    <rect
      x={box.left}
      y={box.top}
      width={box.width}
      height={box.height}
      rx="3"
      fill="none"
      stroke={color}
      strokeWidth="0.8"
      strokeDasharray="3 3"
      opacity=".35"
    />
    <text
      x={box.left + box.width / 2}
      y={box.top + box.height / 2 + box.size * 0.06}
      textAnchor="middle"
      fontFamily="var(--mono)"
      fontSize={box.size * 0.14}
      fill={color}
      opacity=".5"
    >
      {label}
    </text>
  </>
);

/** Nut (or the base-fret label), strings and fret lines. */
export const ChordGridFrame = ({
  box,
  baseFret,
  color,
}: {
  box: Box;
  baseFret: number;
  color: string;
}) => (
  <>
    <rect
      x={box.left}
      y={box.top}
      width={box.width}
      height={baseFret === 1 ? 2.5 : 1}
      fill={color}
    />
    {baseFret > 1 && (
      <text
        x={box.left - 4}
        y={box.top + (box.height / FRETS) * 0.6 + 3}
        textAnchor="end"
        fontSize={box.size * 0.18}
        fontFamily="var(--mono)"
        fill={color}
      >
        {baseFret}fr
      </text>
    )}
    {Array.from({ length: STRINGS }, (_, i) => (
      <line
        key={`s${i}`}
        x1={stringX(box, i)}
        y1={box.top}
        x2={stringX(box, i)}
        y2={box.top + box.height}
        stroke={color}
        strokeWidth="0.8"
        opacity=".55"
      />
    ))}
    {Array.from({ length: FRETS + 1 }, (_, i) => (
      <line
        key={`f${i}`}
        x1={box.left}
        y1={box.top + (box.height * i) / FRETS}
        x2={box.left + box.width}
        y2={box.top + (box.height * i) / FRETS}
        stroke={color}
        strokeWidth="0.8"
        opacity=".55"
      />
    ))}
  </>
);
