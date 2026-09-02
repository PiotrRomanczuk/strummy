import { useState } from 'react';

import { formatNote, getDiatonicChords, type DiatonicQuality } from '@/lib/music-theory';

import { shareLink } from './fretboard.helpers';
import { card, sectionLabel } from './fretboard.styles';
import type { FretboardExplorerApi } from './useFretboardExplorer';

/** Chord definition key each diatonic quality maps onto. */
const QUALITY_TO_CHORD: Record<DiatonicQuality, string> = {
  '': 'major',
  m: 'minor',
  '°': 'diminished',
  '+': 'augmented',
};

/** Under the board: the key's own chords, and the link that restores this view. */
export const FretboardInsights = ({ fb }: { fb: FretboardExplorerApi }) => (
  <div className="ui-fb-insights">
    <DiatonicChords fb={fb} />
    <ShareCard fb={fb} />
  </div>
);

const DiatonicChords = ({ fb }: { fb: FretboardExplorerApi }) => {
  const chords = fb.mode === 'scale' ? getDiatonicChords(fb.key, fb.scaleKey) : [];

  return (
    <section style={{ ...card, padding: '16px 18px' }} data-testid="fb-diatonic">
      <div style={sectionLabel}>Diatonic chords</div>
      <h2
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          margin: '2px 0 10px',
        }}
      >
        Triads in {formatNote(fb.key, fb.useFlats)}
      </h2>
      {chords.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {chords.map((chord) => (
            <button
              key={chord.roman}
              type="button"
              className="ui-fb-chip"
              data-testid={`fb-diatonic-${chord.roman}`}
              onClick={() => {
                fb.setKey(chord.root);
                fb.setChordKey(QUALITY_TO_CHORD[chord.quality]);
                fb.setMode('chord');
              }}
              style={{
                padding: '8px 2px',
                borderRadius: 6,
                border: '1px solid transparent',
                background: 'var(--rule-2)',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  color: 'var(--ink-4)',
                  letterSpacing: '.08em',
                }}
              >
                {chord.roman}
              </span>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--serif)',
                  fontSize: 16,
                  fontWeight: 500,
                  lineHeight: 1.1,
                  marginTop: 2,
                  color: 'var(--ink)',
                }}
              >
                {formatNote(chord.root, fb.useFlats)}
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                  {chord.quality}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--ink-4)', fontSize: 12, margin: '8px 0 0' }}>
          {fb.mode === 'scale'
            ? 'This scale has no seven-degree harmonisation — pick a mode or a major/minor scale.'
            : 'Switch to Scale mode to see the chords built from the key.'}
        </p>
      )}
    </section>
  );
};

const ShareCard = ({ fb }: { fb: FretboardExplorerApi }) => {
  const [copied, setCopied] = useState(false);
  const link = shareLink({
    key: fb.key,
    mode: fb.mode,
    scaleKey: fb.scaleKey,
    chordKey: fb.chordKey,
    caged: fb.caged,
    style: fb.style,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section style={{ ...card, padding: '16px 18px' }} data-testid="fb-share">
      <div style={sectionLabel}>Shareable link</div>
      <div
        data-testid="fb-share-url"
        style={{
          marginTop: 10,
          padding: '10px 12px',
          background: 'var(--rule-2)',
          borderRadius: 6,
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-2)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {link}
      </div>
      <button
        type="button"
        data-testid="fb-copy-link"
        onClick={copy}
        className="ui-fb-chip"
        style={{
          marginTop: 10,
          padding: '6px 12px',
          border: '1px solid var(--rule)',
          background: 'var(--card)',
          color: 'var(--ink-2)',
          borderRadius: 6,
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </section>
  );
};
