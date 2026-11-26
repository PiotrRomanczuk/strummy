/**
 * useYouTubeClock: the card's clock follows the embedded YouTube element — speeds and start once it loads, the loop
 * jump while it plays, "unavailable" for YouTube's not-here errors, "failed" when it never loads.
 */

import { act, renderHook } from '@testing-library/react';

import { PLAYER_LOAD_TIMEOUT_MS, useYouTubeClock } from './useYouTubeClock';

type FakePlayer = HTMLVideoElement & { error: { code?: number } | null };

/** The bits of youtube-video-element the clock reads: time, error, the API's speeds, events. */
const fakePlayer = (rates = [0.25, 0.5, 0.75, 1, 1.25]): FakePlayer =>
  Object.assign(new EventTarget(), {
    currentTime: 0,
    error: null,
    api: { getAvailablePlaybackRates: () => rates },
  }) as unknown as FakePlayer;

const OPTIONS = { duration: 60, initialTime: 0, initialRate: 1, loop: null };

let frames: FrameRequestCallback[] = [];
const nextFrame = () => act(() => frames.splice(0).forEach((frame) => frame(0)));

beforeEach(() => {
  frames = [];
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => frames.push(frame));
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

/** Renders the clock with a fake player attached and loaded. */
const loaded = (options: Partial<typeof OPTIONS> & { loop?: { start: number; end: number } }) => {
  const player = fakePlayer();
  const hook = renderHook(() => useYouTubeClock({ ...OPTIONS, ...options }));
  act(() => {
    hook.result.current.attachPlayer(player);
    hook.result.current.playerEvents.onLoadedMetadata();
  });
  return { player, hook };
};

describe('useYouTubeClock', () => {
  it('keeps the link tempo until the player loads, then offers its practice speeds', () => {
    const player = fakePlayer();
    const { result } = renderHook(() =>
      useYouTubeClock({ ...OPTIONS, initialTime: 12, initialRate: 0.9 })
    );
    expect(result.current).toMatchObject({ status: 'loading', rate: 0.9, time: 12 });
    act(() => {
      result.current.attachPlayer(player);
      result.current.playerEvents.onLoadedMetadata();
    });
    expect(result.current).toMatchObject({ status: 'ready', rates: [0.5, 0.75, 1], rate: 0.75 });
    expect(player.currentTime).toBe(12);
  });

  it.each([100, 101, 150])('marks the recording unavailable on YouTube error %i', (code) => {
    const player = fakePlayer();
    const { result } = renderHook(() => useYouTubeClock(OPTIONS));
    act(() => result.current.attachPlayer(player));
    player.error = { code };
    act(() => void player.dispatchEvent(new Event('error')));
    expect(result.current.status).toBe('unavailable');
  });

  it('stays loading on other player errors', () => {
    const player = fakePlayer();
    const { result } = renderHook(() => useYouTubeClock(OPTIONS));
    act(() => result.current.attachPlayer(player));
    player.error = { code: 5 };
    act(() => void player.dispatchEvent(new Event('error')));
    expect(result.current.status).toBe('loading');
  });

  it('gives up on a player that does not load in time, not on one that did', () => {
    jest.useFakeTimers();
    const slow = renderHook(() => useYouTubeClock(OPTIONS));
    act(() => jest.advanceTimersByTime(PLAYER_LOAD_TIMEOUT_MS));
    expect(slow.result.current.status).toBe('failed');

    const { hook } = loaded({});
    act(() => jest.advanceTimersByTime(PLAYER_LOAD_TIMEOUT_MS));
    expect(hook.result.current.status).toBe('ready');
  });

  it('follows the video while it plays and jumps back at the end of the loop', () => {
    const { player, hook } = loaded({ initialTime: 10, loop: { start: 10, end: 20 } });
    act(() => hook.result.current.playerEvents.onPlaying());
    player.currentTime = 15;
    nextFrame();
    expect(hook.result.current.time).toBe(15);
    player.currentTime = 20.1;
    nextFrame();
    expect(player.currentTime).toBe(10);
    expect(hook.result.current.time).toBe(10);
  });

  it('moves a loaded video on a seek, within the song', () => {
    const { player, hook } = loaded({});
    act(() => hook.result.current.seek(90));
    expect(hook.result.current.time).toBe(60);
    expect(player.currentTime).toBe(60);
  });

  it('plays only once the player is ready', () => {
    const { result } = renderHook(() => useYouTubeClock(OPTIONS));
    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(false);
  });
});
