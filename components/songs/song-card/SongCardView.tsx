'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { SongCard } from '@/lib/music-theory/song-card';
import { cardPosition } from '@/lib/music-theory/song-card-clock';

import { cardLink, type CardStart } from './song-card-link.helpers';
import { SongCardBars } from './SongCardView.Bars';
import { SongCardMap } from './SongCardView.Map';
import { SongCardNow } from './SongCardView.Now';
import { SongCardPlayer } from './SongCardView.Player';
import { SongCardRhythm } from './SongCardView.Rhythm';
import { SongCardTransport } from './SongCardView.Transport';
import { usePartName } from './usePartName';
import { useYouTubeClock } from './useYouTubeClock';

type Props = {
  card: SongCard;
  /** Staff see the reading aids (degrees, loops, bass, drums) and get the practice link. */
  isTeacher: boolean;
  /** Where to open: a part, its loop and the tempo from the address. */
  start: CardStart;
  /** The card's own path, for the practice link; null hides the link. */
  linkPath: string | null;
};

/** The interactive song card (SNG-17): every section reads one clock — the embedded recording. */
export const SongCardView = ({ card, isTeacher, start, linkPath }: Props) => {
  const t = useTranslations('SongCard');
  const partName = usePartName();
  const [loopPart, setLoopPart] = useState(start.isLooping ? start.part : null);
  const loop = useMemo(() => {
    const part = loopPart === null ? null : card.parts[loopPart];
    return part ? { start: part.start, end: part.end } : null;
  }, [card, loopPart]);
  const clock = useYouTubeClock({
    duration: card.duration,
    initialTime:
      start.part === null ? (card.bars[0]?.start ?? 0) : card.parts[start.part].start + 0.01,
    initialRate: start.rate,
    loop,
  });
  const position = useMemo(() => cardPosition(card, clock.time), [card, clock.time]);
  const part = card.parts[position.part];

  const seek = (seconds: number) => {
    clock.seek(seconds);
    const next = cardPosition(card, seconds).part;
    if (loopPart !== null && next >= 0) setLoopPart(next);
  };
  const link = linkPath
    ? cardLink(linkPath, card, {
        part: part ? position.part : null,
        isLooping: loopPart !== null,
        rate: clock.rate,
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <SongCardTransport
        time={clock.time}
        duration={card.duration}
        where={t('where', { part: part ? partName(part) : t('wholeSong'), bar: position.bar + 1 })}
        isPlaying={clock.isPlaying}
        canPlay={clock.status === 'ready'}
        onToggle={clock.toggle}
        rates={clock.rates}
        rate={clock.rate}
        onRate={clock.setRate}
        isLooping={card.parts.length > 0 ? loopPart !== null : null}
        onLoop={() => setLoopPart(loopPart === null ? Math.max(0, position.part) : null)}
        link={link}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        <SongCardPlayer
          youtubeId={card.youtubeId}
          status={clock.status}
          isPlaying={clock.isPlaying}
          rate={clock.rate}
          events={clock.playerEvents}
          attach={clock.attachPlayer}
        />
        <SongCardNow card={card} position={position} />
      </div>
      <SongCardMap
        card={card}
        time={clock.time}
        position={position}
        loopPart={loopPart}
        onSeek={seek}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <SongCardBars card={card} position={position} showDegrees={isTeacher} onSeek={seek} />
        <SongCardRhythm card={card} position={position} isTeacher={isTeacher} />
      </div>
    </div>
  );
};
