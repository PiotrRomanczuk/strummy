import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { SongCardPlayer } from './SongCardView.Player';

jest.mock(
  'next/dynamic',
  () => () =>
    function PlayerStub() {
      return <div data-testid="player" />;
    }
);

const EVENTS = {
  onLoadedMetadata: jest.fn(),
  onPlaying: jest.fn(),
  onPause: jest.fn(),
  onEnded: jest.fn(),
};

const renderPlayer = (youtubeId: string | null, status: 'loading' | 'unavailable' | 'failed') =>
  renderWithIntl(
    <SongCardPlayer
      youtubeId={youtubeId}
      status={status}
      isPlaying={false}
      rate={1}
      events={EVENTS}
      attach={jest.fn()}
    />
  );

describe('SongCardPlayer', () => {
  it('embeds the recording while it loads', () => {
    renderPlayer('Y7C21yNsw2g', 'loading');
    expect(screen.getByTestId('player')).toBeInTheDocument();
  });

  it('shows the way to YouTube for a recording that cannot play here', () => {
    renderPlayer('Y7C21yNsw2g', 'unavailable');
    expect(screen.queryByTestId('player')).not.toBeInTheDocument();
    expect(screen.getByText(/does not let it play outside YouTube/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open on YouTube/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=Y7C21yNsw2g'
    );
  });

  it('says the player did not load, with the way to YouTube', () => {
    renderPlayer('Y7C21yNsw2g', 'failed');
    expect(screen.getByText(/player did not load/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open on YouTube/ })).toBeInTheDocument();
  });

  it('says there is no recording when the analysis has no YouTube link', () => {
    renderPlayer(null, 'loading');
    expect(screen.getByText(/no link to a YouTube recording/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
