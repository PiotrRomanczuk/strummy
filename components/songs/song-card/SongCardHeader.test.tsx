/**
 * The card's facts (#1241): the same tempo, length and analysis date as the song page.
 */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from '@/lib/music-theory/song-card.fixture';
import { songCardFromRows } from '@/lib/services/song-card-queries';

import { SongCardHeader } from './SongCardHeader';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const cardWith = (songBpm: number | null) => {
  const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW, songBpm);
  if (!card) throw new Error('fixture card');
  return card;
};

describe('SongCardHeader', () => {
  it('shows the tempo at the song pulse, the recording length and the analysis date', async () => {
    await renderServerTree(
      <SongCardHeader songId="s1" title="Song" author={null} card={cardWith(58)} />
    );
    expect(screen.getByTestId('song-tempo')).toHaveTextContent(
      '58 BPMcounted at 115 BPM in the recording'
    );
    expect(screen.getByText('0:20')).toBeInTheDocument();
    expect(screen.getByText('Recording analysis · Nov 22, 2026')).toBeInTheDocument();
  });

  it('marks a tempo far from the song for a check', async () => {
    await renderServerTree(
      <SongCardHeader songId="s1" title="Song" author={null} card={cardWith(80)} />
    );
    expect(screen.getByTestId('song-tempo')).toHaveTextContent('115 BPM');
    expect(screen.getByText('check')).toHaveAttribute(
      'title',
      'The recording plays at 115 BPM, the song says 80 BPM. Check the tempo.'
    );
  });
});
