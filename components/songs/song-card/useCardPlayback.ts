'use client';

import { useMemo, useState } from 'react';

import type { SongCard } from '@/lib/music-theory/song-card';
import { BACKING_DEFAULT_RATE } from '@/lib/music-theory/song-card-backing';
import { strumOfBar, type CardReview } from '@/lib/music-theory/song-card-review';

import type { CardSource, CardStart } from './song-card-link.helpers';
import { useBackingClock } from './useBackingClock';
import { useYouTubeClock } from './useYouTubeClock';

type Options = { card: SongCard; start: CardStart; loopPart: number | null; review: CardReview };

/**
 * One clock for the card from two sources: the embedded recording (the default) or the backing track (any tempo;
 * the only choice when the recording cannot play here). Switching keeps the place in the song.
 */
export function useCardPlayback({ card, start, loopPart, review }: Options) {
  const part = loopPart === null ? null : (card.parts[loopPart] ?? null);
  const loopSeconds = useMemo(() => (part ? { start: part.start, end: part.end } : null), [part]);
  const loopBars = part
    ? { firstBar: part.firstBar, lastBar: part.firstBar + part.bars - 1 }
    : null;
  const youtube = useYouTubeClock({
    duration: card.duration,
    initialTime:
      start.part === null ? (card.bars[0]?.start ?? 0) : card.parts[start.part].start + 0.01,
    initialRate: start.rate,
    loop: loopSeconds,
  });
  const [backingTime, setBackingTime] = useState<number | null>(null);
  const [chosen, setChosen] = useState<CardSource>(start.source);
  const backing = useBackingClock({
    card,
    strumOf: (bar) => strumOfBar(card, review, bar),
    edits: review.chordEdits,
    loop: loopBars,
    onTime: setBackingTime,
    // A link's tempo is the backing's too (a teacher's slower practice speed); without one, 70%.
    initialRate: start.source === 'backing' || start.rate < 1 ? start.rate : BACKING_DEFAULT_RATE,
  });

  const canRecord =
    card.youtubeId !== null && youtube.status !== 'unavailable' && youtube.status !== 'failed';
  const source: CardSource = canRecord ? chosen : 'backing';
  const isBacking = source === 'backing';
  const time = isBacking ? (backingTime ?? youtube.time) : youtube.time;

  const seek = (seconds: number) => {
    if (!isBacking) return youtube.seek(seconds);
    setBackingTime(seconds);
    if (backing.isPlaying) void backing.start(seconds);
  };
  const toggle = () => {
    if (!isBacking) return youtube.toggle();
    if (backing.isPlaying) backing.stop();
    else void backing.start(time);
  };
  const switchSource = (next: CardSource) => {
    if (next === source) return;
    if (backing.isPlaying) backing.stop();
    if (youtube.isPlaying) youtube.toggle();
    if (next === 'recording') youtube.seek(time);
    else setBackingTime(time);
    setChosen(next);
  };

  return {
    time,
    source,
    canRecord,
    isPlaying: isBacking ? backing.isPlaying : youtube.isPlaying,
    canPlay: isBacking || youtube.status === 'ready',
    toggle,
    seek,
    switchSource,
    youtube,
    backing,
  };
}
