'use client';

import { useMemo, useState } from 'react';

import type { SongCard } from '@/lib/music-theory/song-card';
import { strumFromRule } from '@/lib/music-theory/song-card-clock';

import type { CardStart } from './song-card-link.helpers';
import type { CardSource } from './SongCardView.Tempo';
import { useBackingClock } from './useBackingClock';
import { useYouTubeClock } from './useYouTubeClock';

type Options = { card: SongCard; start: CardStart; loopPart: number | null };

/**
 * One clock for the card from two sources: the embedded recording (the default) or the backing track (any tempo;
 * the only choice when the recording cannot play here). Switching keeps the place in the song.
 */
export function useCardPlayback({ card, start, loopPart }: Options) {
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
  const [chosen, setChosen] = useState<CardSource>('recording');
  const marks = useMemo(() => (card.strum ? strumFromRule(card.strum) : null), [card.strum]);
  const backing = useBackingClock({
    card,
    strumOf: () => marks,
    loop: loopBars,
    onTime: setBackingTime,
  });

  const canRecord = card.youtubeId !== null && youtube.status !== 'unavailable';
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
