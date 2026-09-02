import { RotateCw } from 'lucide-react';

import { formatNote } from '@/lib/music-theory';

import { FRET_COLUMNS } from './fretboard.helpers';
import { FretboardSVG } from './FretboardSVG';
import { card } from './fretboard.styles';
import type { FretboardExplorerApi } from './useFretboardExplorer';

/** The board card: the neck itself plus the tapped-note readout beneath it. */
export const FretboardBoard = ({ fb }: { fb: FretboardExplorerApi }) => (
  <div style={{ minWidth: 0 }}>
    <p className="ui-fb-rotate" data-testid="fb-rotate-hint">
      <RotateCw size={13} aria-hidden />
      Rotate your phone — or scroll the neck sideways — for the full 15 frets.
    </p>

    <div data-testid="fb-board" style={{ ...card, padding: 14 }}>
      <div className="ui-fb-scroll">
        <FretboardSVG
          board={fb.board}
          mode={fb.mode}
          useFlats={fb.useFlats}
          showIntervals={fb.showIntervals}
          hideNonScale={fb.hideNonScale}
          highlightRoot={fb.highlightRoot}
          style={fb.style}
          cagedZones={fb.cagedZones}
          playingCell={fb.playback.playingCell}
          selectedCell={fb.selected}
          onSelect={fb.selectCell}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--rule)',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
        }}
      >
        <span>{FRET_COLUMNS - 1} frets · 6 strings · open position</span>
        <span data-testid="fb-tapped" style={{ color: fb.selected ? 'var(--gold-2)' : 'inherit' }}>
          {fb.selected
            ? `${formatNote(fb.selected.note, fb.useFlats)} · string ${fb.selected.row + 1} · ${
                fb.selected.fret === 0 ? 'open' : `fret ${fb.selected.fret}`
              }`
            : 'Tap a note to identify it.'}
        </span>
      </div>
    </div>
  </div>
);
