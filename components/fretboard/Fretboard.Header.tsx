import {
  formatNote,
  getChordDisplayName,
  getScaleStepFormula,
  CHORD_DEFINITIONS,
  SCALE_DEFINITIONS,
} from '@/lib/music-theory';

import { FRETBOARD_STYLES } from './fretboard.constants';
import { Segmented } from './Fretboard.Primitives';
import { sectionLabel } from './fretboard.styles';
import type { FretboardExplorerApi } from './useFretboardExplorer';

/** Page header: what is on the board right now, and how it is drawn. */
export const FretboardHeader = ({ fb }: { fb: FretboardExplorerApi }) => {
  const scale = SCALE_DEFINITIONS[fb.scaleKey];
  const chord = CHORD_DEFINITIONS[fb.chordKey];

  const subtitle =
    fb.mode === 'scale'
      ? scale?.name
      : fb.mode === 'chord'
        ? `${chord?.name} · ${getChordDisplayName(fb.key, fb.chordKey).replace(fb.key, formatNote(fb.key, fb.useFlats))}`
        : 'Chromatic';

  const caption =
    fb.mode === 'scale'
      ? `${fb.activeNotes.length} notes · ${getScaleStepFormula(fb.scaleKey)}`
      : fb.mode === 'chord'
        ? `${fb.activeNotes.length} tones · ${chord?.description ?? ''}`
        : 'All twelve notes across the neck';

  return (
    <header className="ui-fb-header">
      <div style={{ minWidth: 0 }}>
        <div style={{ ...sectionLabel, letterSpacing: '.16em' }}>Fretboard Explorer</div>
        <h1
          data-testid="fb-title"
          style={{
            margin: '4px 0 6px',
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 40,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {formatNote(fb.key, fb.useFlats)}{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>{subtitle}</em>
        </h1>
        <p
          data-testid="fb-subhead"
          style={{
            margin: 0,
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--ink-3)',
            lineHeight: 1.5,
          }}
        >
          {caption}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={sectionLabel}>Style</span>
        <Segmented
          testId="fb-style"
          label="Fretboard style"
          size="sm"
          value={fb.style}
          onChange={fb.setStyle}
          options={FRETBOARD_STYLES}
        />
      </div>
    </header>
  );
};
