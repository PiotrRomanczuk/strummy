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
import { SongCardTempo } from './SongCardView.Tempo';
import { SongCardTransport } from './SongCardView.Transport';
import { useCardPlayback } from './useCardPlayback';
import { usePartName } from './usePartName';

type Props = {
  card: SongCard;
  /** Staff see the reading aids (degrees, loops, bass, drums) and get the practice link. */
  isTeacher: boolean;
  /** Where to open: a part, its loop and the tempo from the address. */
  start: CardStart;
  /** The card's own path, for the practice link; null hides the link. */
  linkPath: string | null;
};

/** The interactive song card (SNG-17): every section reads one clock — the recording or the backing track. */
export const SongCardView = ({ card, isTeacher, start, linkPath }: Props) => {
  const t = useTranslations('SongCard');
  const partName = usePartName();
  const [loopPart, setLoopPart] = useState(start.isLooping ? start.part : null);
  const playback = useCardPlayback({ card, start, loopPart });
  const { youtube, backing } = playback;
  const position = useMemo(() => cardPosition(card, playback.time), [card, playback.time]);
  const part = card.parts[position.part];

  const seek = (seconds: number) => {
    playback.seek(seconds);
    const next = cardPosition(card, seconds).part;
    if (loopPart !== null && next >= 0) setLoopPart(next);
  };
  const link = linkPath
    ? cardLink(linkPath, card, {
        part: part ? position.part : null,
        isLooping: loopPart !== null,
        rate: playback.source === 'backing' ? backing.rate : youtube.rate,
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <SongCardTransport
        time={playback.time}
        duration={card.duration}
        where={t('where', { part: part ? partName(part) : t('wholeSong'), bar: position.bar + 1 })}
        isPlaying={playback.isPlaying}
        canPlay={playback.canPlay}
        onToggle={playback.toggle}
        tempo={
          <SongCardTempo
            source={playback.source}
            onSource={playback.switchSource}
            canRecord={playback.canRecord}
            rates={youtube.rates}
            rate={youtube.rate}
            onRate={youtube.setRate}
            backingRate={backing.rate}
            onBackingRate={backing.setRate}
            bpm={card.bpm}
          />
        }
        isLooping={card.parts.length > 0 ? loopPart !== null : null}
        onLoop={() => setLoopPart(loopPart === null ? Math.max(0, position.part) : null)}
        link={link}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        <SongCardPlayer
          youtubeId={card.youtubeId}
          status={youtube.status}
          isPlaying={youtube.isPlaying}
          rate={youtube.rate}
          events={youtube.playerEvents}
          attach={youtube.attachPlayer}
        />
        <SongCardNow card={card} position={position} />
      </div>
      <SongCardMap
        card={card}
        time={playback.time}
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
