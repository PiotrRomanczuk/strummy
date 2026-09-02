import Link from 'next/link';

import { Sparkles } from 'lucide-react';

import { FretboardPlayback } from './Fretboard.Playback';
import { Group, Segmented, Toggle } from './Fretboard.Primitives';
import { CagedSelector, ChordSelector, KeyGrid, ScaleSelector } from './Fretboard.Selectors';
import type { FretMode } from './fretboard.helpers';
import type { FretboardExplorerApi } from './useFretboardExplorer';

const RailHeading = () => (
  <div>
    <div
      style={{
        color: 'var(--ink-4)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '.16em',
        fontFamily: 'var(--mono)',
      }}
    >
      Studio tool
    </div>
    <h2
      style={{
        fontFamily: 'var(--serif)',
        fontWeight: 500,
        fontSize: 24,
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
        margin: '4px 0 2px',
      }}
    >
      Fretboard
    </h2>
    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
      STANDARD · E-A-D-G-B-e
    </div>
  </div>
);

const DisplayToggles = ({ fb }: { fb: FretboardExplorerApi }) => (
  <>
    <Toggle
      id="intervals"
      label="Show intervals"
      hint="R, b3, 5 instead of note names"
      value={fb.showIntervals}
      onChange={fb.setShowIntervals}
    />
    <Toggle
      id="hide-nonscale"
      label="Hide non-scale notes"
      value={fb.hideNonScale}
      onChange={fb.setHideNonScale}
    />
    <Toggle
      id="highlight-root"
      label="Highlight root"
      value={fb.highlightRoot}
      onChange={fb.setHighlightRoot}
    />
  </>
);

const MODES: { value: FretMode; label: string }[] = [
  { value: 'scale', label: 'Scale' },
  { value: 'chord', label: 'Chord' },
  { value: 'off', label: 'Off' },
];

/** Left rail: what the board shows, how it is drawn, and how it plays back. */
export const FretboardControls = ({ fb }: { fb: FretboardExplorerApi }) => (
  <aside
    data-testid="fb-controls"
    style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}
  >
    <RailHeading />

    <Group label="Mode">
      <Segmented
        testId="fb-mode"
        label="Overlay mode"
        value={fb.mode}
        onChange={fb.setMode}
        options={MODES}
      />
    </Group>

    <KeyGrid
      fbKey={fb.key}
      setKey={fb.setKey}
      useFlats={fb.useFlats}
      setUseFlats={fb.setUseFlats}
    />

    {fb.mode === 'scale' && <ScaleSelector value={fb.scaleKey} onChange={fb.setScaleKey} />}
    {fb.mode === 'chord' && (
      <ChordSelector
        fbKey={fb.key}
        value={fb.chordKey}
        onChange={fb.setChordKey}
        useFlats={fb.useFlats}
      />
    )}

    <CagedSelector value={fb.caged} onChange={fb.setCaged} />

    <Group label="Display">
      <DisplayToggles fb={fb} />
    </Group>

    <FretboardPlayback
      playing={fb.playback.playing}
      onToggle={fb.playback.togglePlay}
      bpm={fb.playback.bpm}
      setBpm={fb.playback.setBpm}
      volume={fb.playback.volume}
      setVolume={fb.playback.setVolume}
      audioOn={fb.playback.audioOn}
      setAudioOn={fb.playback.setAudioOn}
      audioSupported={fb.playback.audioSupported}
      disabled={fb.mode === 'off' || fb.activeNotes.length === 0}
    />

    <Link
      href="/dashboard/skills"
      data-testid="fb-quiz-link"
      style={{
        padding: '10px 12px',
        border: '1px dashed var(--gold-dim)',
        background: 'var(--gold-tint)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--gold-2)',
        fontSize: 12,
        fontWeight: 500,
        textDecoration: 'none',
      }}
    >
      <Sparkles size={13} />
      Quiz me on these notes
    </Link>
  </aside>
);
