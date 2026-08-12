/**
 * SongDetailContentTabs — switches the main song-detail column between
 * "Chords & structure" and "Lyrics", independent of the staff-only
 * Overview/Production split in SongDetailTabs.
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { SongDetailContentTabs } from '@/components/songs/SongDetail.ContentTabs';

const chordsStub = <div data-testid="chords-stub">Chords content</div>;
const lyricsStub = <div data-testid="lyrics-stub">Lyrics content</div>;

describe('SongDetailContentTabs', () => {
  it('shows the chords tab by default', () => {
    renderWithIntl(<SongDetailContentTabs chords={chordsStub} lyrics={lyricsStub} />);

    expect(screen.getByTestId('chords-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('lyrics-stub')).not.toBeInTheDocument();
  });

  it('switches to the lyrics tab on click', () => {
    renderWithIntl(<SongDetailContentTabs chords={chordsStub} lyrics={lyricsStub} />);

    fireEvent.click(screen.getByRole('tab', { name: /lyrics/i }));

    expect(screen.getByTestId('lyrics-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('chords-stub')).not.toBeInTheDocument();
  });

  it('switches back to chords on click', () => {
    renderWithIntl(<SongDetailContentTabs chords={chordsStub} lyrics={lyricsStub} />);

    fireEvent.click(screen.getByRole('tab', { name: /lyrics/i }));
    fireEvent.click(screen.getByRole('tab', { name: /chords & structure/i }));

    expect(screen.getByTestId('chords-stub')).toBeInTheDocument();
  });
});
