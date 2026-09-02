import { useTranslations } from 'next-intl';

import type { CagedPosition } from '@/lib/music-theory';

import { DISPLAY_STRINGS } from './fretboard.constants';
import type { AnnotatedCell } from './fretboard.helpers';

const WIDTH = 200;
const HEIGHT = 72;
const PAD = { left: 10, right: 8, top: 14, bottom: 10 };

/** The blank grid a shape is drawn on: fret wires and six strings. */
const MiniGrid = ({
  fretCount,
  fretWidth,
  boardWidth,
  boardHeight,
  atNut,
  stringY,
}: {
  fretCount: number;
  fretWidth: number;
  boardWidth: number;
  boardHeight: number;
  atNut: boolean;
  stringY: (row: number) => number;
}) => (
  <>
    <rect
      x={PAD.left}
      y={PAD.top}
      width={boardWidth}
      height={boardHeight}
      fill="var(--paper)"
      stroke="var(--rule)"
      strokeWidth="0.8"
    />
    {Array.from({ length: fretCount + 1 }).map((_, i) => (
      <line
        key={`mini-fret-${i}`}
        x1={PAD.left + i * fretWidth}
        y1={PAD.top}
        x2={PAD.left + i * fretWidth}
        y2={PAD.top + boardHeight}
        stroke="var(--ink-5)"
        strokeWidth={i === 0 && atNut ? 1.6 : 0.7}
      />
    ))}
    {DISPLAY_STRINGS.map((_, row) => (
      <line
        key={`mini-string-${row}`}
        x1={PAD.left}
        y1={stringY(row)}
        x2={PAD.left + boardWidth}
        y2={stringY(row)}
        stroke="var(--ink-4)"
        strokeWidth="0.5"
        opacity="0.6"
      />
    ))}
  </>
);

interface MiniCAGEDProps {
  position: CagedPosition;
  board: AnnotatedCell[][];
}

/**
 * Thumbnail of one CAGED position for the info rail: the shape's fret window
 * with its scale tones, root notes filled gold.
 */
export const MiniCAGED = ({ position, board }: MiniCAGEDProps) => {
  const t = useTranslations('Fretboard');
  const { shape, startFret, endFret } = position;
  const fretCount = Math.max(4, endFret - startFret + 1);
  const boardWidth = WIDTH - PAD.left - PAD.right;
  const boardHeight = HEIGHT - PAD.top - PAD.bottom;
  const fretWidth = boardWidth / fretCount;
  const stringY = (row: number) => PAD.top + (boardHeight * row) / (DISPLAY_STRINGS.length - 1);
  const fretX = (index: number) => PAD.left + (index + 0.5) * fretWidth;

  return (
    <svg
      data-testid={`fb-mini-caged-${shape}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      role="img"
      aria-label={t('caged.thumbAria', { shape, from: startFret, to: endFret })}
      style={{ display: 'block' }}
    >
      <MiniGrid
        fretCount={fretCount}
        fretWidth={fretWidth}
        boardWidth={boardWidth}
        boardHeight={boardHeight}
        atNut={startFret === 0}
        stringY={stringY}
      />
      <text
        x={PAD.left + 2}
        y={PAD.top - 4}
        fontFamily="var(--mono)"
        fontSize="8"
        fill="var(--ink-4)"
      >
        {startFret}fr
      </text>
      <text
        x={PAD.left + boardWidth}
        y={PAD.top - 4}
        textAnchor="end"
        fontFamily="var(--serif)"
        fontSize="11"
        fontWeight="600"
        fill="var(--gold-2)"
      >
        {shape}
      </text>
      {board.map((row, rowIndex) =>
        row
          .slice(startFret, startFret + fretCount)
          .map((cell, index) =>
            cell.active ? (
              <circle
                key={`mini-dot-${rowIndex}-${index}`}
                cx={fretX(index)}
                cy={stringY(rowIndex)}
                r={cell.isRoot ? 4.5 : 3}
                fill={cell.isRoot ? 'var(--gold)' : 'var(--ink-2)'}
                stroke={cell.isRoot ? 'var(--gold-2)' : 'none'}
                strokeWidth="0.8"
              />
            ) : null
          )
      )}
    </svg>
  );
};
