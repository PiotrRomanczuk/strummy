/**
 * Component tests: Fretboard (Fretboard Explorer)
 *
 * Renders the real component tree (Fretboard → Controls / Board / Insights /
 * InfoPanel, driven by the real useFretboardExplorer hook) instead of the
 * pure-logic-only coverage in fretboard.helpers.test.ts. Mirrors the
 * user-facing flows exercised by tests/e2e/teacher/fretboard.spec.ts, but at
 * the RTL/component level.
 *
 * @see components/fretboard/Fretboard.tsx
 * @see components/fretboard/useFretboardExplorer.ts
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useSearchParams } from 'next/navigation';

import { Fretboard } from './Fretboard';

// The hook seeds state from useSearchParams() on first render. Override the
// global next/navigation mock (jest.setup.js) with a controllable jest.fn()
// so individual tests can seed a non-default URL (see "seeds initial state
// from the URL" below) — same pattern as app/(auth)/sign-in/page.test.tsx.
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

const mockUseSearchParams = useSearchParams as jest.Mock;

// jsdom has no WebAudio; the board's playback controls key off its presence.
// A no-op stub keeps them rendered (the audio graph itself is covered by
// fretboard-audio.helpers.test.ts).
const audioParam = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} });

class AudioContextStub {
  currentTime = 0;
  state = 'running';
  destination = {};
  createOscillator() {
    return {
      frequency: audioParam(),
      connect: () => ({ connect: () => ({ connect() {} }) }),
      start() {},
      stop() {},
    };
  }
  createBiquadFilter() {
    return { frequency: audioParam(), connect: () => ({ connect() {} }) };
  }
  createGain() {
    return { gain: audioParam(), connect() {} };
  }
  resume() {}
  close() {}
}

describe('Fretboard', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'AudioContext', {
      value: AudioContextStub,
      configurable: true,
      writable: true,
    });
  });

  beforeEach(() => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('renders the default view: A pentatonic minor with a highlighted root', () => {
    render(<Fretboard />);

    expect(screen.getByTestId('fb-title')).toHaveTextContent('Pentatonic Minor');
    expect(screen.getByTestId('fb-mode-scale')).toHaveAttribute('data-active', 'true');

    // High-E string (row 0), fret 5 → A, the root of the default key.
    const rootCell = screen.getByTestId('fb-cell-0-5');
    expect(rootCell).toHaveAttribute('data-note', 'A');
    expect(rootCell).toHaveAttribute('data-root', 'true');
    expect(rootCell).toHaveAttribute('data-active', 'true');
    expect(rootCell).toHaveTextContent('A');

    // 6 strings × (open + 15 frets) = 96 interactive cells.
    expect(screen.getAllByTestId(/^fb-cell-/)).toHaveLength(96);
    // The open-string column is part of the board.
    expect(screen.getByTestId('fb-cell-0-0')).toHaveAttribute('data-note', 'E');

    expect(screen.getByTestId('fb-tapped')).toHaveTextContent('Tap a note to identify it.');
  });

  it('changing the key moves the root and overlay', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    await user.click(screen.getByTestId('fb-key-C'));

    // C pentatonic minor: root C sits at high-E fret 8.
    const cRoot = screen.getByTestId('fb-cell-0-8');
    expect(cRoot).toHaveAttribute('data-note', 'C');
    expect(cRoot).toHaveAttribute('data-root', 'true');
    expect(cRoot).toHaveAttribute('data-active', 'true');

    // The former A root is no longer the root.
    expect(screen.getByTestId('fb-cell-0-5')).toHaveAttribute('data-root', 'false');
  });

  it('sharp/flat toggle relabels the key button and board cells', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    const cSharpKey = screen.getByTestId('fb-key-C#');
    expect(cSharpKey).toHaveTextContent('C#');

    await user.click(screen.getByTestId('fb-accidental-flat'));

    expect(cSharpKey).toHaveTextContent('Db');

    // A labelled C# cell on the board is relabeled too (A blues has a b5 = D#,
    // so switch to a scale that actually contains C#).
    await user.selectOptions(screen.getByTestId('fb-scale-select'), 'major');
    const cSharpCell = screen.getByTestId('fb-cell-0-9');
    expect(cSharpCell).toHaveAttribute('data-note', 'C#');
    expect(cSharpCell).toHaveTextContent('Db');
  });

  it('selecting a different scale updates the board overlay and info panel', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    await user.selectOptions(screen.getByTestId('fb-scale-select'), 'major');
    await user.click(screen.getByTestId('fb-key-C'));

    // C major contains C (active) but not C# (not active).
    expect(screen.getByTestId('fb-cell-0-8')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('fb-cell-0-9')).toHaveAttribute('data-active', 'false');
    expect(screen.getAllByTestId('fb-note-chip')).toHaveLength(7);
    expect(screen.getByTestId('fb-title')).toHaveTextContent('Major (Ionian)');
  });

  it('the quick scale buttons pick a scale without opening the dropdown', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    await user.click(screen.getByTestId('fb-scale-blues'));

    expect(screen.getByTestId('fb-scale-select')).toHaveValue('blues');
    expect(screen.getByTestId('fb-title')).toHaveTextContent('Blues');
  });

  it('switching to chord mode reveals the chord grid and highlights chord tones', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    await user.click(screen.getByTestId('fb-mode-chord'));

    expect(screen.getByTestId('fb-chord-minor')).toHaveAttribute('data-active', 'true');

    // Key is still A → A minor chord = A, C, E.
    expect(screen.getByTestId('fb-cell-0-5')).toHaveAttribute('data-active', 'true'); // A
    expect(screen.getByTestId('fb-cell-0-8')).toHaveAttribute('data-active', 'true'); // C
    expect(screen.getByTestId('fb-cell-0-10')).toHaveAttribute('data-active', 'false'); // D
    expect(screen.getAllByTestId('fb-note-chip')).toHaveLength(3);
    expect(screen.getByTestId('fb-title')).toHaveTextContent('Minor · Am');

    await user.click(screen.getByTestId('fb-chord-major7'));
    expect(screen.getByTestId('fb-title')).toHaveTextContent('Major 7th · Amaj7');
    expect(screen.getAllByTestId('fb-note-chip')).toHaveLength(4);
  });

  it('show-intervals toggle swaps note names for interval names', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    const rootCell = screen.getByTestId('fb-cell-0-5');
    expect(rootCell).toHaveTextContent('A');

    await user.click(screen.getByTestId('fb-toggle-intervals'));

    expect(rootCell).toHaveTextContent('R');
  });

  it('hide-non-scale toggle hides notes outside the scale', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    const offScale = screen.getByTestId('fb-cell-0-1'); // F, not in A pentatonic minor
    expect(offScale).toHaveAttribute('data-hidden', 'false');

    await user.click(screen.getByTestId('fb-toggle-hide-nonscale'));

    expect(offScale).toHaveAttribute('data-hidden', 'true');
    expect(offScale).toHaveAttribute('tabindex', '-1');
    // In-scale notes remain visible.
    expect(screen.getByTestId('fb-cell-0-5')).toHaveAttribute('data-hidden', 'false');
  });

  it('clicking a fret cell identifies the note', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    expect(screen.getByTestId('fb-tapped')).toHaveTextContent('Tap a note to identify it.');

    await user.click(screen.getByTestId('fb-cell-0-5'));

    const tapped = screen.getByTestId('fb-tapped');
    expect(tapped).toHaveTextContent('A');
    expect(tapped).toHaveTextContent('string 1');
    expect(tapped).toHaveTextContent('fret 5');

    // Open strings read as "open" rather than "fret 0".
    await user.click(screen.getByTestId('fb-cell-0-0'));
    expect(screen.getByTestId('fb-tapped')).toHaveTextContent('string 1 · open');
  });

  it('switching to "off" mode labels every note and clears the overlay', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    await user.click(screen.getByTestId('fb-mode-off'));

    expect(screen.queryByTestId('fb-scale-select')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fb-chord-minor')).not.toBeInTheDocument();
    expect(screen.getByTestId('fb-cell-0-5')).toHaveAttribute('data-active', 'false');
    // Off mode is the chromatic view: notes are still named on the neck.
    expect(screen.getByTestId('fb-cell-0-1')).toHaveTextContent('F');
    expect(screen.queryAllByTestId('fb-note-chip')).toHaveLength(0);
    expect(screen.getByText('No notes selected.')).toBeInTheDocument();
  });

  it('seeds initial state from the URL search params', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('key=C&mode=scale&scale=major&caged=E&style=studio')
    );

    render(<Fretboard />);

    expect(screen.getByTestId('fb-title')).toHaveTextContent('Major (Ionian)');
    expect(screen.getByTestId('fb-scale-select')).toHaveValue('major');
    expect(screen.getByTestId('fb-cell-0-8')).toHaveAttribute('data-root', 'true'); // C
    expect(screen.getByTestId('fb-caged-E')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('fb-svg')).toHaveAttribute('data-style', 'studio');
  });

  describe('CAGED overlay', () => {
    it('draws no zone until a shape is picked, then one per selection', async () => {
      const user = userEvent.setup();
      render(<Fretboard />);

      expect(screen.queryAllByTestId(/^fb-caged-zone-/)).toHaveLength(0);

      await user.click(screen.getByTestId('fb-caged-E'));
      expect(screen.getAllByTestId(/^fb-caged-zone-/)).toHaveLength(1);
      expect(screen.getByTestId('fb-caged-zone-E')).toBeInTheDocument();

      await user.click(screen.getByTestId('fb-caged-all'));
      const zones = screen.getAllByTestId(/^fb-caged-zone-/);
      expect(zones.length).toBeGreaterThan(1);

      await user.click(screen.getByTestId('fb-caged-none'));
      expect(screen.queryAllByTestId(/^fb-caged-zone-/)).toHaveLength(0);
    });

    it('lists the shapes for the key and toggles one from the info rail', async () => {
      const user = userEvent.setup();
      render(<Fretboard />);

      const cards = screen.getAllByTestId(/^fb-caged-card-/);
      expect(cards.length).toBeGreaterThan(0);
      expect(screen.getByTestId('fb-caged-count')).toHaveTextContent(`${cards.length} shapes`);

      await user.click(cards[0]);
      expect(cards[0]).toHaveAttribute('data-active', 'true');
      expect(screen.getAllByTestId(/^fb-caged-zone-/)).toHaveLength(1);

      await user.click(cards[0]);
      expect(cards[0]).toHaveAttribute('data-active', 'false');
    });
  });

  it('switches the board finish from the style control', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    expect(screen.getByTestId('fb-svg')).toHaveAttribute('data-style', 'engraved');

    await user.click(screen.getByTestId('fb-style-mono'));

    expect(screen.getByTestId('fb-svg')).toHaveAttribute('data-style', 'mono');
  });

  describe('under the board', () => {
    it('shows the diatonic chords of the key and loads one on click', async () => {
      const user = userEvent.setup();
      render(<Fretboard />);

      // Pentatonic minor has no seven-degree harmony; a real scale does.
      expect(screen.queryByTestId('fb-diatonic-I')).not.toBeInTheDocument();
      await user.selectOptions(screen.getByTestId('fb-scale-select'), 'major');

      expect(screen.getByTestId('fb-diatonic-I')).toHaveTextContent('A');
      expect(screen.getByTestId('fb-diatonic-vii°')).toHaveTextContent('G#');

      await user.click(screen.getByTestId('fb-diatonic-vi'));

      expect(screen.getByTestId('fb-mode-chord')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('fb-title')).toHaveTextContent('F#m');
    });

    it('keeps the shareable link in step with the current view', async () => {
      const user = userEvent.setup();
      render(<Fretboard />);

      expect(screen.getByTestId('fb-share-url')).toHaveTextContent(
        '/dashboard/fretboard?key=A&mode=scale&scale=pentatonic_minor'
      );

      await user.click(screen.getByTestId('fb-key-C'));
      await user.click(screen.getByTestId('fb-caged-G'));

      const link = screen.getByTestId('fb-share-url').textContent ?? '';
      expect(link).toContain('key=C');
      expect(link).toContain('caged=G');
    });
  });

  it('starts and stops the scale walkthrough', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    const play = screen.getByTestId('fb-play');
    expect(play).toHaveAttribute('data-playing', 'false');

    await user.click(play);
    expect(play).toHaveAttribute('data-playing', 'true');
    expect(play).toHaveTextContent('Stop');

    await user.click(play);
    expect(play).toHaveAttribute('data-playing', 'false');
    expect(play).toHaveTextContent('Play notes');
  });

  it('mutes and unmutes playback', async () => {
    const user = userEvent.setup();
    render(<Fretboard />);

    expect(screen.getByTestId('fb-audio-state')).toHaveTextContent('Audio on');

    await user.click(screen.getByTestId('fb-mute'));

    expect(screen.getByTestId('fb-audio-state')).toHaveTextContent('Muted');
  });
});
