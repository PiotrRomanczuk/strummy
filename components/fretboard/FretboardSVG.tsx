import { useTranslations } from 'next-intl';

import type { CagedPosition, NoteName } from '@/lib/music-theory';

import { BOARD_GEOMETRY, FB_STYLE_TOKENS, type FretboardStyle } from './fretboard.constants';
import { boardGeometry } from './fretboard-board.helpers';
import type { AnnotatedCell, BoardCell, FretMode } from './fretboard.helpers';
import { FretboardMarkers } from './FretboardSVG.Markers';
import { FretboardNeck } from './FretboardSVG.Neck';

interface FretboardSVGProps {
  board: AnnotatedCell[][];
  mode: FretMode;
  useFlats: boolean;
  showIntervals: boolean;
  hideNonScale: boolean;
  highlightRoot: boolean;
  style: FretboardStyle;
  cagedZones: CagedPosition[];
  playingCell: BoardCell | null;
  selectedCell: BoardCell | null;
  onSelect: (row: number, fret: number, note: NoteName) => void;
  width?: number;
  height?: number;
}

/**
 * The neck itself: an open-string column, 15 frets, six strings and one
 * focusable marker per position. Drawn at an intrinsic size and scaled by its
 * container, so the same board works from a phone (scrolled) to a desktop.
 */
export const FretboardSVG = ({
  board,
  mode,
  useFlats,
  showIntervals,
  hideNonScale,
  highlightRoot,
  style,
  cagedZones,
  playingCell,
  selectedCell,
  onSelect,
  width = BOARD_GEOMETRY.maxWidth,
  height = BOARD_GEOMETRY.height,
}: FretboardSVGProps) => {
  const t = useTranslations('Fretboard');
  const geometry = boardGeometry(width, height);
  const tokens = FB_STYLE_TOKENS[style];

  return (
    <svg
      data-testid="fb-svg"
      data-style={style}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="group"
      aria-label={t('boardLabel')}
      style={{ display: 'block', userSelect: 'none', maxWidth: '100%', height: 'auto' }}
    >
      <defs>
        <linearGradient id="fb-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ede0c6" />
          <stop offset="50%" stopColor="#e2d0b0" />
          <stop offset="100%" stopColor="#c8b088" />
        </linearGradient>
      </defs>

      <FretboardNeck geometry={geometry} tokens={tokens} cagedZones={cagedZones} />

      <FretboardMarkers
        board={board}
        geometry={geometry}
        tokens={tokens}
        mode={mode}
        useFlats={useFlats}
        showIntervals={showIntervals}
        hideNonScale={hideNonScale}
        highlightRoot={highlightRoot}
        playingCell={playingCell}
        selectedCell={selectedCell}
        onSelect={onSelect}
      />
    </svg>
  );
};
