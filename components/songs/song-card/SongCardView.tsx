'use client';

import { useMemo, useState } from 'react';

import type { SongCard } from '@/lib/music-theory/song-card';
import { cardPosition } from '@/lib/music-theory/song-card-clock';
import { isApproved, type CardReview } from '@/lib/music-theory/song-card-review';

import type { CardStart } from './song-card-link.helpers';
import { SongCardControls } from './SongCardView.Controls';
import { SongCardNow } from './SongCardView.Now';
import { SongCardPlayer } from './SongCardView.Player';
import { SongCardStudy } from './SongCardView.Study';
import { useCardPlayback } from './useCardPlayback';
import { useCardReview } from './useCardReview';

type Props = {
  songId: string;
  card: SongCard;
  /** The teacher's stored review of the card (approved chords, corrections, strums). */
  review: CardReview;
  /** Staff see the reading aids (degrees, loops, bass, drums) and get the practice link. */
  isTeacher: boolean;
  /** Where to open: a part, its loop and the tempo from the address. */
  start: CardStart;
  /** The card's own path, for the practice link; null hides the link. */
  linkPath: string | null;
  /** The song's title, for the name an exercise starts with. */
  songTitle?: string;
};

/** The interactive song card (SNG-17): every section reads one clock — the recording or the backing track. */
export const SongCardView = ({
  songId,
  card,
  review,
  isTeacher,
  start,
  linkPath,
  songTitle = '',
}: Props) => {
  const [loopPart, setLoopPart] = useState(start.isLooping ? start.part : null);
  const reviewState = useCardReview({ songId, videoId: card.youtubeId, initial: review });
  const playback = useCardPlayback({ card, start, loopPart, review: reviewState.review });
  const { youtube } = playback;
  const position = useMemo(() => cardPosition(card, playback.time), [card, playback.time]);
  const part = card.parts[position.part];

  const seek = (seconds: number) => {
    playback.seek(seconds);
    const next = cardPosition(card, seconds).part;
    if (loopPart !== null && next >= 0) setLoopPart(next);
  };
  return (
    <div className="flex flex-col gap-4">
      <SongCardControls
        songId={songId}
        songTitle={songTitle}
        card={card}
        playback={playback}
        position={position}
        loopPart={loopPart}
        onLoopPart={setLoopPart}
        isTeacher={isTeacher}
        linkPath={linkPath}
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
        <SongCardNow
          card={card}
          position={position}
          edits={reviewState.review.chordEdits}
          isUnsure={!isTeacher && !isApproved(reviewState.review, part ?? null)}
        />
      </div>
      <SongCardStudy
        card={card}
        time={playback.time}
        position={position}
        loopPart={loopPart}
        onSeek={seek}
        isTeacher={isTeacher}
        reviewState={reviewState}
      />
    </div>
  );
};
