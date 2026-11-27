/**
 * ChordGrid draws the shape the shared lookup finds (#1240: F# drew "no chart")
 * and never substitutes a wrong diagram for a name that is not a chord
 * (docs-vs-implementation audit, finding #2).
 */
import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { ChordGrid } from './ChordGrid';

describe('ChordGrid', () => {
  it('draws F# as its barre shape', () => {
    renderWithIntl(<ChordGrid name="F#" />);
    const svg = screen.getByRole('img', { name: 'F# chord diagram' });
    expect(svg).toHaveAttribute('data-voicing', 'Fsharp-barre');
    expect(svg.querySelectorAll('circle').length).toBeGreaterThan(0);
    expect(screen.queryByText('no shape')).toBeNull();
  });

  it('draws an enharmonic spelling with the same shape', () => {
    renderWithIntl(<ChordGrid name="Gb" />);
    expect(screen.getByRole('img', { name: 'F# chord diagram' })).toBeInTheDocument();
  });

  it('marks muted strings and open strings above the nut', () => {
    renderWithIntl(<ChordGrid name="D" />);
    const svg = screen.getByRole('img', { name: 'D chord diagram' });
    // Two muted strings (crosses) and one open string (an unfilled circle).
    expect(svg.querySelectorAll('path')).toHaveLength(2);
    expect(svg.querySelectorAll('circle[fill="none"]')).toHaveLength(1);
  });

  it('says there is no shape for a name that is not a chord, without dots', () => {
    renderWithIntl(<ChordGrid name="Chorus" />);
    const svg = screen.getByRole('img', { name: 'Chorus: no shape' });
    expect(screen.getByText('no shape')).toBeInTheDocument();
    expect(svg.querySelectorAll('circle')).toHaveLength(0);
  });
});
