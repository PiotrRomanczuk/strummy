import type { KeyboardEvent } from 'react';

import type { NoteName } from '@/lib/music-theory';

import type { FretboardStyleTokens } from './fretboard.constants';
import {
  cellAriaLabel,
  cellLabel,
  type AnnotatedCell,
  type BoardCell,
  type BoardGeometry,
  type FretMode,
} from './fretboard.helpers';

export interface MarkersProps {
  board: AnnotatedCell[][];
  geometry: BoardGeometry;
  tokens: FretboardStyleTokens;
  mode: FretMode;
  useFlats: boolean;
  showIntervals: boolean;
  hideNonScale: boolean;
  highlightRoot: boolean;
  playingCell: BoardCell | null;
  selectedCell: BoardCell | null;
  onSelect: (row: number, fret: number, note: NoteName) => void;
}

interface MarkerProps extends Omit<MarkersProps, 'board'> {
  cell: AnnotatedCell;
  row: number;
  fret: number;
}

/** Interactive note markers — one focusable cell per string × fret. */
export const FretboardMarkers = ({ board, ...rest }: MarkersProps) => (
  <>
    {board.map((row, rowIndex) =>
      row.map((cell, fret) => (
        <Marker key={`cell-${rowIndex}-${fret}`} cell={cell} row={rowIndex} fret={fret} {...rest} />
      ))
    )}
  </>
);

const Marker = ({
  cell,
  row,
  fret,
  geometry,
  tokens,
  mode,
  useFlats,
  showIntervals,
  hideNonScale,
  highlightRoot,
  playingCell,
  selectedCell,
  onSelect,
}: MarkerProps) => {
  const hidden = hideNonScale && mode !== 'off' && !cell.active;
  const labelled = cell.active || mode === 'off';
  const isRootCell = cell.isRoot && highlightRoot && labelled;
  const isPlaying = playingCell?.row === row && playingCell?.fret === fret;
  const isSelected = selectedCell?.row === row && selectedCell?.fret === fret;

  const cx = geometry.fretX(fret);
  const cy = geometry.stringY(row);

  // How this position is drawn, in one word — the display toggles are exactly
  // what moves a cell between these, so tests assert on it rather than on fill
  // colours: root (gold), active (named scale/chord tone), chromatic (named
  // but outside the overlay, i.e. Off mode), dim (a quiet dot), hidden.
  const marker = hidden
    ? 'hidden'
    : isRootCell
      ? 'root'
      : cell.active
        ? 'active'
        : labelled
          ? 'chromatic'
          : 'dim';

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect(row, fret, cell.note);
  };

  return (
    <g
      className="ui-fb-cell"
      data-testid={`fb-cell-${row}-${fret}`}
      data-note={cell.note}
      data-active={cell.active}
      data-root={cell.isRoot}
      data-interval={cell.interval}
      data-hidden={hidden}
      data-marker={marker}
      role="button"
      tabIndex={hidden ? -1 : 0}
      aria-label={cellAriaLabel(cell, isRootCell, row, fret, useFlats)}
      aria-hidden={hidden}
      onClick={() => onSelect(row, fret, cell.note)}
      onKeyDown={handleKeyDown}
      style={{
        cursor: 'pointer',
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
      }}
    >
      {/* Hit area — keeps sparse dots comfortably tappable. */}
      <rect
        x={cx - geometry.fretWidth / 2}
        y={cy - 15}
        width={geometry.fretWidth}
        height={30}
        fill="transparent"
      />
      {isPlaying && <PlayingPulse cx={cx} cy={cy} />}
      {labelled ? (
        <NoteMarker
          cx={cx}
          cy={cy}
          isRootCell={isRootCell}
          isActive={cell.active}
          isSelected={isSelected}
          label={cellLabel(cell, showIntervals, useFlats)}
        />
      ) : (
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 4 : 2.5}
          fill={isSelected ? 'var(--gold-2)' : tokens.textDim}
          opacity={isSelected ? 0.9 : 0.28}
        />
      )}
    </g>
  );
};

const PlayingPulse = ({ cx, cy }: { cx: number; cy: number }) => (
  <circle cx={cx} cy={cy} r={16} fill="var(--gold)" opacity="0.28">
    <animate attributeName="r" from="12" to="24" dur="0.6s" repeatCount="indefinite" />
    <animate attributeName="opacity" from="0.45" to="0" dur="0.6s" repeatCount="indefinite" />
  </circle>
);

const NoteMarker = ({
  cx,
  cy,
  isRootCell,
  isActive,
  isSelected,
  label,
}: {
  cx: number;
  cy: number;
  isRootCell: boolean;
  isActive: boolean;
  isSelected: boolean;
  label: string;
}) => {
  const radius = isRootCell ? 13 : 11.5;
  const fill = isRootCell ? 'var(--gold)' : 'var(--card)';
  const stroke = isRootCell ? 'var(--gold-2)' : isActive ? 'var(--ink-2)' : 'var(--rule)';
  const color = isRootCell ? '#fff' : isActive ? 'var(--ink)' : 'var(--ink-3)';

  return (
    <>
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 3.5}
          fill="none"
          stroke="var(--gold-2)"
          strokeWidth="1.5"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={isRootCell ? 1 : 1.25}
        opacity={isActive || isRootCell ? 1 : 0.75}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--serif)"
        fontSize={isRootCell ? 12 : 11}
        fontWeight={isRootCell ? 600 : 500}
        fill={color}
      >
        {label}
      </text>
    </>
  );
};
