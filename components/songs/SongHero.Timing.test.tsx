/**
 * The hero's tempo and length (#1241): the analysed recording's when there is one — the values the song card
 * shows — and the song's own otherwise.
 */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { resolveSongTiming } from '@/lib/music-theory/song-tempo';
import { getSongTiming } from '@/lib/services/song-timing-queries';

import { SongHeroTiming } from './SongHero.Timing';

jest.mock('@/lib/services/song-timing-queries', () => ({ getSongTiming: jest.fn() }));

const mockedTiming = jest.mocked(getSongTiming);
const HOTEL = { id: 'hotel', tempo: 75, time_signature: 4, duration_ms: 391000 };
const NOTHING_ELSE = { id: 'nem', tempo: 69, time_signature: 4, duration_ms: 388000 };

describe('SongHeroTiming', () => {
  beforeEach(() => mockedTiming.mockReset());

  it("shows the recording's tempo and length when the recording is analysed", async () => {
    mockedTiming.mockResolvedValue(
      resolveSongTiming(
        { tempo: 75, durationMs: 391000 },
        { bpm: 73.17, feltBpm: null, durationSeconds: 404.747, analysedOn: '2026-11-10' }
      )
    );
    await renderServerTree(<SongHeroTiming song={HOTEL} />);
    expect(screen.getByTestId('song-tempo')).toHaveTextContent('73 BPM');
    expect(screen.getByTestId('song-length')).toHaveTextContent('6:44');
    expect(screen.getByText('4/4')).toBeInTheDocument();
  });

  it('shows a double-time analysis at the song pulse with the counted beat', async () => {
    mockedTiming.mockResolvedValue(
      resolveSongTiming(
        { tempo: 69, durationMs: 388000 },
        { bpm: 142.86, feltBpm: null, durationSeconds: 385.846, analysedOn: '2026-11-17' }
      )
    );
    await renderServerTree(<SongHeroTiming song={NOTHING_ELSE} />);
    expect(screen.getByTestId('song-tempo')).toHaveTextContent(
      '71 BPMcounted at 143 BPM in the recording'
    );
    expect(screen.getByTestId('song-length')).toHaveTextContent('6:25');
    expect(screen.queryByText('check')).not.toBeInTheDocument();
  });

  it("falls back to the song's own values when nothing can be read", async () => {
    mockedTiming.mockResolvedValue(null);
    await renderServerTree(<SongHeroTiming song={HOTEL} />);
    expect(screen.getByTestId('song-tempo')).toHaveTextContent('75 BPM');
    expect(screen.getByTestId('song-length')).toHaveTextContent('6:31');
  });

  it('shows nothing for a song with no tempo, metre or length', async () => {
    mockedTiming.mockResolvedValue(null);
    const { container } = await renderServerTree(
      <SongHeroTiming song={{ id: 'x', tempo: null, time_signature: null, duration_ms: null }} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
