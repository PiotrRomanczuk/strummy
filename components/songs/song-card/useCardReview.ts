'use client';

import { useState } from 'react';

import { saveSongCardReview } from '@/app/dashboard/songs/[id]/card/actions';
import {
  applyReviewPatch,
  type CardReview,
  type ReviewPatch,
} from '@/lib/music-theory/song-card-review';

type Options = { songId: string; videoId: string | null; initial: CardReview };

/**
 * The teacher's review on the card: a change shows at once and is saved in the background; if the save fails the
 * card goes back to what was stored and says so.
 */
export function useCardReview({ songId, videoId, initial }: Options) {
  const [review, setReview] = useState(initial);
  const [hasFailed, setFailed] = useState(false);

  const save = (patch: ReviewPatch) => {
    const before = review;
    setReview(applyReviewPatch(review, patch));
    setFailed(false);
    void saveSongCardReview(songId, videoId, patch).then((result) => {
      if ('review' in result) return setReview(result.review);
      setReview(before);
      setFailed(true);
    });
  };

  return { review, hasFailed, save };
}

export type CardReviewState = ReturnType<typeof useCardReview>;
