'use client';

import { useTranslations } from 'next-intl';

import type { SongCard } from '@/lib/music-theory/song-card';
import type { CardPosition } from '@/lib/music-theory/song-card-clock';

import { hint } from './song-card.styles';
import { SongCardBars } from './SongCardView.Bars';
import { SongCardMap } from './SongCardView.Map';
import { SongCardReview } from './SongCardView.Review';
import { SongCardRhythm } from './SongCardView.Rhythm';
import type { CardReviewState } from './useCardReview';
import { usePartName } from './usePartName';
import { useReviewControls } from './useReviewControls';

type Props = {
  card: SongCard;
  time: number;
  position: CardPosition;
  loopPart: number | null;
  onSeek: (seconds: number) => void;
  isTeacher: boolean;
  reviewState: CardReviewState;
};

/** The map, the part's chord chart and the bar grid — with the teacher's review where the teacher looks. */
export const SongCardStudy = ({
  card,
  time,
  position,
  loopPart,
  onSeek,
  isTeacher,
  reviewState,
}: Props) => {
  const t = useTranslations('SongCard');
  const partName = usePartName();
  const controls = useReviewControls(card, position, reviewState);
  const { review } = reviewState;
  const panel =
    isTeacher && controls.part ? (
      <SongCardReview
        part={controls.part}
        groupNames={controls.group.map(partName)}
        isApproved={controls.isApproved}
        isEditing={controls.isCorrecting}
        onApprove={controls.approve}
        onEdit={controls.setCorrecting}
      />
    ) : !isTeacher && !controls.isApproved ? (
      <p className={`${hint} rounded-md bg-[var(--rule-2)] px-2.5 py-2`}>{t('unsure')}</p>
    ) : null;

  return (
    <>
      {reviewState.hasFailed && (
        <p role="alert" className={`${hint} text-[var(--danger)]`}>
          {t('reviewFailed')}
        </p>
      )}
      <SongCardMap
        card={card}
        time={time}
        position={position}
        loopPart={loopPart}
        onSeek={onSeek}
        isPartApproved={isTeacher ? controls.isPartApproved : null}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <SongCardBars
          card={card}
          position={position}
          showDegrees={isTeacher}
          onSeek={onSeek}
          edits={review.chordEdits}
          panel={panel}
          onCorrect={isTeacher ? controls.correctBar : null}
          isUnsure={!isTeacher && !controls.isApproved}
        />
        <SongCardRhythm
          card={card}
          position={position}
          isTeacher={isTeacher}
          edits={review.chordEdits}
          marks={controls.marks}
          strumEditing={isTeacher ? controls.strumEditing : null}
          isStrumCorrected={controls.isStrumCorrected}
        />
      </div>
    </>
  );
};
