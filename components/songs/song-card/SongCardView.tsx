'use client';

import { useMemo, useState } from 'react';

import type { SongCard } from '@/lib/music-theory/song-card';
import { cardPosition } from '@/lib/music-theory/song-card-clock';

import { SongCardBars } from './SongCardView.Bars';
import { SongCardMap } from './SongCardView.Map';

type Props = {
  card: SongCard;
  /** Staff see the reading aids (degrees, loops); a student sees the plain chart. */
  isTeacher: boolean;
};

/**
 * The interactive song card (SNG-17): every section reads one clock in seconds of the analysed recording. Until
 * the player lands (#1163) the clock moves only when a part, a bar or the timeline is clicked.
 */
export const SongCardView = ({ card, isTeacher }: Props) => {
  const [time, setTime] = useState(() => card.bars[0]?.start ?? 0);
  const position = useMemo(() => cardPosition(card, time), [card, time]);
  const seek = (seconds: number) => setTime(Math.max(0, Math.min(card.duration, seconds)));

  return (
    <div className="flex flex-col gap-4">
      <SongCardMap card={card} time={time} position={position} onSeek={seek} />
      <SongCardBars card={card} position={position} showDegrees={isTeacher} onSeek={seek} />
    </div>
  );
};
