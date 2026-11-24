'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

import { nearestRate, practiceRates } from './song-card-link.helpers';

/**
 * loading → ready; unavailable when YouTube refuses to play the video here; failed when the player has not loaded
 * in time (script blocked, no network), so the card offers the way to YouTube instead of a dead Play button.
 */
export type PlayerStatus = 'loading' | 'ready' | 'unavailable' | 'failed';

export const PLAYER_LOAD_TIMEOUT_MS = 15_000;

// YouTube player errors meaning "not here": removed or private (100), the owner forbids embedding (101, 150).
const UNAVAILABLE = new Set([100, 101, 150]);

/** The custom element react-player renders for YouTube (youtube-video-element): a media element plus the API. */
type YouTubeElement = HTMLVideoElement & {
  api?: { getAvailablePlaybackRates?: () => number[] };
  error: { code?: number } | null;
};

const youTube = (ref: RefObject<HTMLVideoElement | null>) => ref.current as YouTubeElement | null;

type Options = {
  duration: number;
  initialTime: number;
  initialRate: number;
  /** Seconds the loop repeats, when it is on. */
  loop: { start: number; end: number } | null;
};

/**
 * The song card's clock driven by the embedded YouTube player: the card follows the video while it plays (one
 * read per animation frame), a seek on the card moves the video, the loop jumps back at its end.
 */
export function useYouTubeClock({ duration, initialTime, initialRate, loop }: Options) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [time, setTime] = useState(initialTime);
  const [isPlaying, setPlaying] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [rates, setRates] = useState<number[]>([1]);
  // The link's tempo until the player says which speeds it has (then the nearest of those).
  const [rate, setRate] = useState(initialRate);

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('failed'), PLAYER_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const follow = () => {
      const video = youTube(ref);
      if (video) {
        const now = video.currentTime;
        const isOutside = loop && (now >= loop.end || now < loop.start - 1);
        if (isOutside) video.currentTime = loop.start;
        setTime(isOutside ? loop.start : now);
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, loop, ref]);

  const seek = (seconds: number) => {
    const target = Math.max(0, Math.min(duration, seconds));
    setTime(target);
    const video = youTube(ref);
    if (video && status === 'ready') video.currentTime = target;
  };

  // The element's "error" does not reach React's onError (a plain, non-bubbling event on a custom element), so
  // the player's node gets its own listener.
  const onError = (event: Event) => {
    const code = (event.currentTarget as YouTubeElement | null)?.error?.code;
    if (code !== undefined && UNAVAILABLE.has(code)) setStatus('unavailable');
  };
  const attachPlayer = (node: HTMLVideoElement | null) => {
    ref.current?.removeEventListener('error', onError);
    ref.current = node;
    node?.addEventListener('error', onError);
  };

  const playerEvents = {
    // youtube-video-element fires this once the YouTube API is ready; react-player's onReady rides on the first
    // `loadstart`, which the element dispatches before React listens.
    onLoadedMetadata: () => {
      setStatus('ready');
      const video = youTube(ref);
      const offered = practiceRates(video?.api?.getAvailablePlaybackRates?.() ?? [1]);
      setRates(offered);
      setRate(nearestRate(offered, initialRate));
      if (video && time > 0) video.currentTime = time;
    },
    // Not onPlay: the element also reports buffering (after a seek) as "play", which would start the song.
    onPlaying: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
  };

  return {
    time,
    isPlaying,
    status,
    rates,
    rate,
    setRate,
    seek,
    toggle: () => setPlaying((playing) => status === 'ready' && !playing),
    attachPlayer,
    playerEvents,
  };
}

export type YouTubeClock = ReturnType<typeof useYouTubeClock>;
