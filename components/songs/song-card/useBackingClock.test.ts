/**
 * useBackingClock with a stand-in Tone.js: the transport runs at the chosen share of the song's tempo, a sixteenth
 * strums the chord and moves the card, and leaving the card clears Tone's global schedule and frees the synths.
 */

import { act, renderHook } from '@testing-library/react';

import { songCardFromRows } from '@/lib/services/song-card-queries';
import type { SongCard } from '@/lib/music-theory/song-card';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from '@/lib/music-theory/song-card.fixture';
import type { StrumMark } from '@/lib/music-theory/song-card-clock';

import { useBackingClock } from './useBackingClock';

type Synth = { toDestination: () => Synth; dispose: jest.Mock; triggerAttackRelease: jest.Mock };

const mockTransport = {
  bpm: { value: 0 },
  start: jest.fn(),
  stop: jest.fn(),
  cancel: jest.fn(),
  scheduleRepeat: jest.fn(),
};
const mockSynths: Synth[] = [];
const mockSynth = () => {
  const synth: Synth = {
    toDestination: () => synth,
    dispose: jest.fn(),
    triggerAttackRelease: jest.fn(),
  };
  mockSynths.push(synth);
  return synth;
};

jest.mock('tone', () => ({
  start: jest.fn().mockResolvedValue(undefined),
  getTransport: () => mockTransport,
  getDraw: () => ({ schedule: (callback: () => void) => callback() }),
  PolySynth: jest.fn().mockImplementation(() => mockSynth()),
  Synth: jest.fn().mockImplementation(() => mockSynth()),
  Frequency: (note: number) => ({ toNote: () => `midi${note}` }),
}));

const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW) as SongCard;
const DOWN_ON_BEATS: StrumMark[] = Array.from({ length: 16 }, (_, slot) =>
  slot % 4 === 0 ? 'down' : null
);

beforeEach(() => {
  jest.clearAllMocks();
  mockSynths.length = 0;
  mockTransport.bpm.value = 0;
});

const render = (onTime = jest.fn()) =>
  renderHook(() =>
    useBackingClock({
      card,
      strumOf: () => DOWN_ON_BEATS,
      loop: null,
      edits: {},
      onTime,
      initialRate: 0.5,
    })
  );

describe('useBackingClock', () => {
  it('starts the transport at the chosen share of the song tempo and follows a tempo change', async () => {
    const { result } = render();
    expect(result.current.rate).toBe(0.5);
    await act(() => result.current.start(card.bars[0].start));
    expect(mockTransport.bpm.value).toBeCloseTo(card.bpm * 0.5);
    expect(mockTransport.scheduleRepeat).toHaveBeenCalledWith(expect.any(Function), '16n');
    expect(mockTransport.start).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(true);
    act(() => result.current.setRate(0.8));
    expect(mockTransport.bpm.value).toBeCloseTo(card.bpm * 0.8);
  });

  it('strums the chord on a down mark and moves the card to the sixteenth', async () => {
    const onTime = jest.fn();
    const { result } = render(onTime);
    await act(() => result.current.start(card.bars[0].start));
    const [sixteenth] = mockTransport.scheduleRepeat.mock.calls[0];
    act(() => sixteenth(0));
    const [guitar, click] = mockSynths;
    expect(guitar.triggerAttackRelease.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(click.triggerAttackRelease).toHaveBeenCalledWith('C6', '32n', 0);
    expect(onTime).toHaveBeenCalledWith(card.bars[0].start);
  });

  it('stops, clears the schedule and frees the synths when the card goes away', async () => {
    const { result, unmount } = render();
    await act(() => result.current.start(0));
    unmount();
    expect(mockTransport.stop).toHaveBeenCalled();
    expect(mockTransport.cancel).toHaveBeenCalled();
    mockSynths.forEach((synth) => expect(synth.dispose).toHaveBeenCalled());
  });
});
