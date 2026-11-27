/**
 * SongChordsCard: the "new for you" line (#1140) shows only when the page
 * passes shapes — a student with the chord map on — and says which shapes this
 * song adds, or that the student knows them all.
 */
import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';

import { SongChordsCard } from './SongChordsCard';

const renderCard = (newShapes?: string[] | null) =>
  renderServerTree(
    <SongChordsCard title="Wonderwall" chordTokens={['Em', 'G']} newShapes={newShapes} />
  );

describe('SongChordsCard — new for you', () => {
  it('names the shapes this song adds for the student', async () => {
    await renderCard(['F', 'Bm']);
    expect(screen.getByText('New for you: F, Bm')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chord map →' })).toHaveAttribute(
      'href',
      '/dashboard/chord-map'
    );
  });

  it('says so when the student knows every shape', async () => {
    await renderCard([]);
    expect(screen.getByText(/already know every shape/)).toBeInTheDocument();
  });

  it('shows no line for staff or a student without the chord map', async () => {
    await renderCard(null);
    expect(screen.queryByText(/New for you|already know/)).not.toBeInTheDocument();
  });
});
