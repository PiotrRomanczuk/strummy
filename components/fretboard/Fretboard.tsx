'use client';

import { useState } from 'react';

import { FretboardBoard } from './Fretboard.Board';
import { FretboardControls } from './Fretboard.Controls';
import { FretboardHeader } from './Fretboard.Header';
import { FretboardInfoPanel } from './Fretboard.InfoPanel';
import { FretboardInsights } from './Fretboard.Insights';
import { FretboardMobileBar, FretboardMobileNotes } from './Fretboard.MobileBar';
import { useFretboardExplorer, type FretboardVariant } from './useFretboardExplorer';

/**
 * Fretboard Explorer — pick a key and a scale or chord, and its tones light up
 * across all six strings, with the CAGED shapes that hold them.
 *
 * The same tree serves the in-app tool and the free public page; `variant`
 * only decides where the links around the board point.
 */
export const Fretboard = ({ variant = 'dashboard' }: { variant?: FretboardVariant }) => {
  const fb = useFretboardExplorer(variant);
  // Phones fold the control rail away (mobile mockup); desktop ignores this.
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  return (
    <div
      className="ui-fret-page"
      data-controls={isControlsOpen}
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '28px 24px 64px',
      }}
    >
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>
        <FretboardMobileBar
          fb={fb}
          isOpen={isControlsOpen}
          onToggle={() => setIsControlsOpen((v) => !v)}
        />
        <div className="ui-fret-layout">
          <FretboardControls fb={fb} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            <FretboardHeader fb={fb} />
            <FretboardBoard fb={fb} />
            <FretboardMobileNotes fb={fb} />
            <FretboardInsights fb={fb} />
          </div>

          <FretboardInfoPanel fb={fb} />
        </div>
      </div>
    </div>
  );
};
