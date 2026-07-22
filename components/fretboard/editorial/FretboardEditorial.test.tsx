/**
 * Component tests: FretboardEditorial (Fretboard Explorer)
 *
 * Renders the real component tree (FretboardEditorial → Controls / Board /
 * InfoPanel, driven by the real useFretboardExplorer hook) instead of the
 * pure-logic-only coverage in fretboard.helpers.test.ts. Mirrors the
 * user-facing flows exercised by tests/e2e/teacher/fretboard.spec.ts, but at
 * the RTL/component level.
 *
 * @see components/fretboard/editorial/FretboardEditorial.tsx
 * @see components/fretboard/editorial/useFretboardExplorer.ts
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useSearchParams } from 'next/navigation';

import { FretboardEditorial } from './FretboardEditorial';

// The hook seeds state from useSearchParams() on first render. Override the
// global next/navigation mock (jest.setup.js) with a controllable jest.fn()
// so individual tests can seed a non-default URL (see "seeds initial state
// from the URL" below) — same pattern as app/(auth)/sign-in/page.test.tsx.
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

const mockUseSearchParams = useSearchParams as jest.Mock;

describe('FretboardEditorial', () => {
  beforeEach(() => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('renders the default view: A pentatonic minor with a highlighted root', () => {
    render(<FretboardEditorial />);

    expect(screen.getByTestId('fb-title')).toHaveTextContent('Pentatonic Minor');
    expect(screen.getByTestId('fb-mode-scale')).toHaveAttribute('data-active', 'true');

    // High-E string (row 0), fret 5 → A, the root of the default key.
    const rootCell = screen.getByTestId('fb-cell-0-5');
    expect(rootCell).toHaveAttribute('data-note', 'A');
    expect(rootCell).toHaveAttribute('data-root', 'true');
    expect(rootCell).toHaveAttribute('data-active', 'true');

    // 6 strings × 12 frets = 72 interactive cells.
    expect(screen.getAllByTestId(/^fb-cell-/)).toHaveLength(72);

    expect(screen.getByTestId('fb-tapped')).toHaveTextContent('Tap a note to identify it.');
  });

  it('changing the key moves the root and overlay', async () => {
    const user = userEvent.setup();
    render(<FretboardEditorial />);

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
    render(<FretboardEditorial />);

    const cSharpKey = screen.getByTestId('fb-key-C#');
    expect(cSharpKey).toHaveTextContent('C#');

    await user.click(screen.getByTestId('fb-accidental-flat'));

    expect(cSharpKey).toHaveTextContent('Db');

    // A C# cell on the board is relabeled too (the note attribute stays canonical).
    const cSharpCell = screen.getByTestId('fb-cell-0-9');
    expect(cSharpCell).toHaveAttribute('data-note', 'C#');
    expect(cSharpCell).toHaveTextContent('Db');
  });

  it('selecting a different scale updates the board overlay and info panel', async () => {
    const user = userEvent.setup();
    render(<FretboardEditorial />);

    await user.selectOptions(screen.getByTestId('fb-scale-select'), 'major');
    await user.click(screen.getByTestId('fb-key-C'));

    // C major contains C (active) but not C# (not active).
    expect(screen.getByTestId('fb-cell-0-8')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('fb-cell-0-9')).toHaveAttribute('data-active', 'false');
    expect(screen.getAllByTestId('fb-note-chip')).toHaveLength(7);
    expect(screen.getByTestId('fb-title')).toHaveTextContent('Major (Ionian)');
  });

  it('switching to chord mode reveals the chord select and highlights chord tones', async () => {
    const user = userEvent.setup();
    render(<FretboardEditorial />);

    await user.click(screen.getByTestId('fb-mode-chord'));

    expect(screen.getByTestId('fb-chord-select')).toHaveValue('minor');

    // Key is still A → A minor chord = A, C, E.
    expect(screen.getByTestId('fb-cell-0-5')).toHaveAttribute('data-active', 'true'); // A
    expect(screen.getByTestId('fb-cell-0-8')).toHaveAttribute('data-active', 'true'); // C
    expect(screen.getByTestId('fb-cell-0-10')).toHaveAttribute('data-active', 'false'); // D
    expect(screen.getAllByTestId('fb-note-chip')).toHaveLength(3);
    expect(screen.getByTestId('fb-title')).toHaveTextContent('Minor · Am');
  });

  it('show-intervals toggle swaps note names for interval names', async () => {
    const user = userEvent.setup();
    render(<FretboardEditorial />);

    const rootCell = screen.getByTestId('fb-cell-0-5');
    expect(rootCell).toHaveTextContent('A');

    await user.click(screen.getByTestId('fb-toggle-intervals'));

    expect(rootCell).toHaveTextContent('R');
  });

  it('hide-non-scale toggle hides notes outside the scale', async () => {
    const user = userEvent.setup();
    render(<FretboardEditorial />);

    const offScale = screen.getByTestId('fb-cell-0-1'); // F, not in A pentatonic minor
    expect(offScale).toHaveAttribute('data-hidden', 'false');

    await user.click(screen.getByTestId('fb-toggle-hide-nonscale'));

    expect(offScale).toHaveAttribute('data-hidden', 'true');
    // In-scale notes remain visible.
    expect(screen.getByTestId('fb-cell-0-5')).toHaveAttribute('data-hidden', 'false');
  });

  it('clicking a fret cell identifies the note', async () => {
    const user = userEvent.setup();
    render(<FretboardEditorial />);

    expect(screen.getByTestId('fb-tapped')).toHaveTextContent('Tap a note to identify it.');

    await user.click(screen.getByTestId('fb-cell-0-5'));

    const tapped = screen.getByTestId('fb-tapped');
    expect(tapped).toHaveTextContent('A');
    expect(tapped).toHaveTextContent('string 1');
    expect(tapped).toHaveTextContent('fret 5');
  });

  it('switching to "off" mode clears active notes and hides scale/chord controls', async () => {
    const user = userEvent.setup();
    render(<FretboardEditorial />);

    await user.click(screen.getByTestId('fb-mode-off'));

    expect(screen.queryByTestId('fb-scale-select')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fb-chord-select')).not.toBeInTheDocument();
    expect(screen.getByTestId('fb-cell-0-5')).toHaveAttribute('data-active', 'false');
    expect(screen.queryAllByTestId('fb-note-chip')).toHaveLength(0);
    expect(screen.getByText('No notes selected.')).toBeInTheDocument();
  });

  it('seeds initial state from the URL search params', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('key=C&mode=scale&scale=major'));

    render(<FretboardEditorial />);

    expect(screen.getByTestId('fb-title')).toHaveTextContent('Major (Ionian)');
    expect(screen.getByTestId('fb-scale-select')).toHaveValue('major');
    expect(screen.getByTestId('fb-cell-0-8')).toHaveAttribute('data-root', 'true'); // C
  });
});
