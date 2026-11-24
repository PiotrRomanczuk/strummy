/**
 * useCardPlayback: one clock from two sources. Switching keeps the place in the song, a seek restarts a playing
 * backing there, a recording that cannot play leaves the backing, and a link picks the source and the tempo.
 */

import { act, renderHook } from '@testing-library/react';

import { songCardFromRows } from '@/lib/services/song-card-queries';
import type { SongCard } from '@/lib/music-theory/song-card';
import { EMPTY_REVIEW } from '@/lib/music-theory/song-card-review';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from '@/lib/music-theory/song-card.fixture';

import type { CardStart } from './song-card-link.helpers';
import { useBackingClock } from './useBackingClock';
import { useCardPlayback } from './useCardPlayback';
import { useYouTubeClock, type PlayerStatus } from './useYouTubeClock';

jest.mock('./useYouTubeClock', () => ({ useYouTubeClock: jest.fn() }));
jest.mock('./useBackingClock', () => ({ useBackingClock: jest.fn() }));

const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW) as SongCard;
const START: CardStart = { part: null, isLooping: false, rate: 1, source: 'recording' };

const youtube = {
  time: 30,
  isPlaying: false,
  status: 'ready' as PlayerStatus,
  seek: jest.fn(),
  toggle: jest.fn(),
};
const backing = { isPlaying: false, rate: 0.7, start: jest.fn(), stop: jest.fn() };

beforeEach(() => {
  Object.assign(youtube, { time: 30, isPlaying: false, status: 'ready' });
  Object.assign(backing, { isPlaying: false });
  jest.clearAllMocks();
  jest.mocked(useYouTubeClock).mockImplementation(() => youtube as never);
  jest.mocked(useBackingClock).mockImplementation(() => backing as never);
});

const render = (start: CardStart = START) =>
  renderHook(() => useCardPlayback({ card, start, loopPart: null, review: EMPTY_REVIEW }));

/** The options the card handed to the backing clock on its last render. */
const backingOptions = () => jest.mocked(useBackingClock).mock.lastCall?.[0];

describe('useCardPlayback', () => {
  it('switches to the backing at the place the recording had reached', () => {
    youtube.isPlaying = true;
    const { result } = render();
    expect(result.current.source).toBe('recording');
    act(() => result.current.switchSource('backing'));
    expect(youtube.toggle).toHaveBeenCalled();
    youtube.time = 0;
    act(() => backingOptions()?.onTime(30));
    expect(result.current).toMatchObject({ source: 'backing', time: 30 });
  });

  it('moves the recording to where the backing was when switching back', () => {
    const { result } = render({ ...START, source: 'backing' });
    act(() => backingOptions()?.onTime(42));
    act(() => result.current.switchSource('recording'));
    expect(youtube.seek).toHaveBeenCalledWith(42);
    expect(result.current.source).toBe('recording');
  });

  it('restarts a playing backing at a seek', () => {
    backing.isPlaying = true;
    const { result } = render({ ...START, source: 'backing' });
    act(() => result.current.seek(12));
    expect(backing.start).toHaveBeenCalledWith(12);
    expect(youtube.seek).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'failed'] as const)(
    'plays the backing when the player is %s',
    (status) => {
      youtube.status = status;
      const { result } = render();
      expect(result.current).toMatchObject({ source: 'backing', canRecord: false, canPlay: true });
    }
  );

  it('takes the tempo for the backing from the link, else starts at 70%', () => {
    render({ ...START, rate: 0.4, source: 'backing' });
    expect(backingOptions()?.initialRate).toBe(0.4);
    render({ ...START, rate: 0.75 });
    expect(backingOptions()?.initialRate).toBe(0.75);
    render();
    expect(backingOptions()?.initialRate).toBe(0.7);
  });
});
