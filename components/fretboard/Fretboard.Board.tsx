import { RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatNote } from '@/lib/music-theory';

import { FRET_COLUMNS } from './fretboard.helpers';
import { FretboardSVG } from './FretboardSVG';
import { card } from './fretboard.styles';
import type { FretboardExplorerApi } from './useFretboardExplorer';

/** The board card: the neck itself plus the tapped-note readout beneath it. */
export const FretboardBoard = ({ fb }: { fb: FretboardExplorerApi }) => {
  const t = useTranslations('Fretboard');
  const selected = fb.selected;

  return (
    <div style={{ minWidth: 0 }}>
      <p className="ui-fb-rotate" data-testid="fb-rotate-hint">
        <RotateCw size={13} aria-hidden />
        {t('board.rotateHint')}
      </p>

      <div data-testid="fb-board" style={{ ...card, padding: 14 }}>
        <div className="ui-fb-scroll" data-testid="fb-scroll">
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
          <span>{t('board.caption', { frets: FRET_COLUMNS - 1 })}</span>
          <span data-testid="fb-tapped" style={{ color: selected ? 'var(--gold-2)' : 'inherit' }}>
            {selected
              ? t(selected.fret === 0 ? 'board.tappedOpen' : 'board.tapped', {
                  note: formatNote(selected.note, fb.useFlats),
                  string: selected.row + 1,
                  fret: selected.fret,
                })
              : t('board.tapPrompt')}
          </span>
        </div>
      </div>
    </div>
  );
};
