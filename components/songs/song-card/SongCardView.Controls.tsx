'use client';

import { useTranslations } from 'next-intl';

import type { SongCard } from '@/lib/music-theory/song-card';
import type { CardPosition } from '@/lib/music-theory/song-card-clock';

import { cardLink } from './song-card-link.helpers';
import { SongCardSaveExercise } from './SongCardView.SaveExercise';
import { SongCardTempo } from './SongCardView.Tempo';
import { SongCardTransport } from './SongCardView.Transport';
import type { useCardPlayback } from './useCardPlayback';
import { usePartName } from './usePartName';

type Props = {
  songId: string;
  songTitle: string;
  card: SongCard;
  playback: ReturnType<typeof useCardPlayback>;
  position: CardPosition;
  loopPart: number | null;
  onLoopPart: (part: number | null) => void;
  /** Staff get the practice link and "Save as exercise". */
  isTeacher: boolean;
  /** The card's own path, for the practice link; null hides the link. */
  linkPath: string | null;
};

/** The transport bar of the card: play, place, tempo, loop, and (staff) the practice link and the exercise. */
export const SongCardControls = (props: Props) => {
  const { card, playback, position, loopPart } = props;
  const t = useTranslations('SongCard');
  const partName = usePartName();
  const { youtube, backing } = playback;
  const part = card.parts[position.part];
  const rate = playback.source === 'backing' ? backing.rate : youtube.rate;
  const link = props.linkPath
    ? cardLink(props.linkPath, card, {
        part: part ? position.part : null,
        isLooping: loopPart !== null,
        rate,
        source: playback.source,
      })
    : null;

  return (
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
      onLoop={() => props.onLoopPart(loopPart === null ? Math.max(0, position.part) : null)}
      link={link}
      exercise={
        props.isTeacher && (
          <SongCardSaveExercise
            songId={props.songId}
            videoId={card.youtubeId}
            partN={part?.n ?? null}
            defaultName={[part ? partName(part) : '', props.songTitle].filter(Boolean).join(' – ')}
            rate={rate}
            source={playback.source}
          />
        )
      }
    />
  );
};
