import type { CagedPosition } from '@/lib/music-theory';

import {
  DISPLAY_STRING_LABELS,
  DOUBLE_INLAY_FRET,
  FRET_NUMBER_MARKS,
  INLAY_FRETS,
  LAST_FRET,
  STRING_THICKNESS,
  type FretboardStyleTokens,
} from './fretboard.constants';
import type { BoardGeometry } from './fretboard.helpers';

interface NeckProps {
  geometry: BoardGeometry;
  tokens: FretboardStyleTokens;
  cagedZones: CagedPosition[];
}

/**
 * Everything under the note markers: fret numbers, string labels, the board
 * itself, CAGED zones, inlays, fret wires, the nut and the six strings.
 */
export const FretboardNeck = ({ geometry, tokens, cagedZones }: NeckProps) => (
  <>
    <FretNumbers geometry={geometry} />
    <StringLabels geometry={geometry} />

    <rect
      x={geometry.padLeft - 2}
      y={geometry.padTop - 2}
      width={geometry.boardWidth + 4}
      height={geometry.boardHeight + 4}
      rx="3"
      fill={tokens.boardFill}
      stroke={tokens.boardStroke}
      strokeWidth="1"
    />

    {cagedZones.map((zone) => (
      <CagedZone key={`caged-${zone.shape}`} zone={zone} geometry={geometry} tokens={tokens} />
    ))}

    <Inlays geometry={geometry} tokens={tokens} />
    <FretWires geometry={geometry} tokens={tokens} />

    {/* The nut: a thick bar between the open-string column and fret 1. */}
    <rect
      x={geometry.fretWireX(1) - 5}
      y={geometry.padTop - 2}
      width="5"
      height={geometry.boardHeight + 4}
      fill={tokens.nutFill}
      stroke={tokens.nutStroke}
      strokeWidth="0.8"
    />

    {STRING_THICKNESS.map((thickness, row) => (
      <line
        key={`string-${row}`}
        x1={geometry.padLeft - 6}
        y1={geometry.stringY(row)}
        x2={geometry.padLeft + geometry.boardWidth}
        y2={geometry.stringY(row)}
        stroke={tokens.stringColor}
        strokeWidth={thickness}
        opacity="0.9"
      />
    ))}
  </>
);

const FretNumbers = ({ geometry }: { geometry: BoardGeometry }) => (
  <>
    {FRET_NUMBER_MARKS.map((fret) => (
      <text
        key={`fret-number-${fret}`}
        x={geometry.fretX(fret)}
        y={geometry.padTop - 12}
        textAnchor="middle"
        fontFamily="var(--mono)"
        fontSize="10"
        letterSpacing="0.1em"
        fill="var(--ink-4)"
      >
        {fret}
      </text>
    ))}
  </>
);

const StringLabels = ({ geometry }: { geometry: BoardGeometry }) => (
  <>
    {DISPLAY_STRING_LABELS.map((label, row) => (
      <text
        key={`string-label-${row}`}
        x={geometry.padLeft - 16}
        y={geometry.stringY(row)}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--mono)"
        fontSize="10"
        fill="var(--ink-4)"
      >
        {label}
      </text>
    ))}
  </>
);

const CagedZone = ({
  zone,
  geometry,
  tokens,
}: {
  zone: CagedPosition;
  geometry: BoardGeometry;
  tokens: FretboardStyleTokens;
}) => {
  const width = geometry.fretWidth * (zone.endFret - zone.startFret + 1);
  return (
    <g data-testid={`fb-caged-zone-${zone.shape}`}>
      <rect
        x={geometry.fretWireX(zone.startFret)}
        y={geometry.padTop - 4}
        width={width}
        height={geometry.boardHeight + 8}
        fill={tokens.cagedBg}
        stroke={tokens.cagedStroke}
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <text
        x={geometry.fretWireX(zone.startFret) + width / 2}
        y={geometry.padTop + geometry.boardHeight + 16}
        textAnchor="middle"
        fontFamily="var(--mono)"
        fontSize="9"
        letterSpacing="0.16em"
        fill="var(--gold-2)"
      >
        {zone.shape}-SHAPE
      </text>
    </g>
  );
};

const Inlays = ({
  geometry,
  tokens,
}: {
  geometry: BoardGeometry;
  tokens: FretboardStyleTokens;
}) => (
  <>
    {INLAY_FRETS.map((fret) => (
      <circle
        key={`inlay-${fret}`}
        cx={geometry.fretX(fret)}
        cy={geometry.padTop + geometry.boardHeight / 2}
        r="4"
        fill={tokens.inlayFill}
        opacity="0.5"
      />
    ))}
    {/* Double dot at the octave. */}
    {[0.3, 0.7].map((ratio) => (
      <circle
        key={`inlay-12-${ratio}`}
        cx={geometry.fretX(DOUBLE_INLAY_FRET)}
        cy={geometry.padTop + geometry.boardHeight * ratio}
        r="4"
        fill={tokens.inlayFill}
        opacity="0.5"
      />
    ))}
  </>
);

const FretWires = ({
  geometry,
  tokens,
}: {
  geometry: BoardGeometry;
  tokens: FretboardStyleTokens;
}) => (
  <>
    {/* Wire 1 is the nut, drawn separately; the board edge closes the last fret. */}
    {Array.from({ length: LAST_FRET - 1 }, (_, i) => i + 2).map((fret) => (
      <g key={`fret-wire-${fret}`}>
        <line
          x1={geometry.fretWireX(fret)}
          y1={geometry.padTop - 1}
          x2={geometry.fretWireX(fret)}
          y2={geometry.padTop + geometry.boardHeight + 1}
          stroke={tokens.fretWireShadow}
          strokeWidth="1"
          opacity="0.5"
        />
        <line
          x1={geometry.fretWireX(fret) - 1}
          y1={geometry.padTop - 1}
          x2={geometry.fretWireX(fret) - 1}
          y2={geometry.padTop + geometry.boardHeight + 1}
          stroke={tokens.fretWire}
          strokeWidth="2"
        />
      </g>
    ))}
  </>
);
