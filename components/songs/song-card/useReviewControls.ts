'use client';

import { useState } from 'react';

import type { SongCard } from '@/lib/music-theory/song-card';
import { chordAt, chordsOfBars, type CardPosition } from '@/lib/music-theory/song-card-clock';
import {
  codeFromMarks,
  isApproved,
  nextChordFor,
  nextMark,
  strumOfBar,
} from '@/lib/music-theory/song-card-review';

import type { StrumEditing } from './SongCardView.Rhythm';
import type { CardReviewState } from './useCardReview';

/**
 * What the teacher can do with the card's review at the playing position: approve the part's chords (for its
 * whole group), correct bars, correct the part's strum. Null pieces where the card has no part to act on.
 */
export function useReviewControls(card: SongCard, position: CardPosition, state: CardReviewState) {
  const { review, save } = state;
  const [isCorrecting, setCorrecting] = useState(false);
  const [isEditingStrum, setEditingStrum] = useState(false);
  const part = card.parts[position.part] ?? null;
  const songChords = chordsOfBars(card, 0, card.bars.length);
  const marks = strumOfBar(card, review, position.bar);

  const correctBar = (bar: number) => {
    const analysed = chordAt(card, bar, 0);
    const next = nextChordFor(songChords, chordAt(card, bar, 0, review.chordEdits));
    save({ kind: 'chord', bar, chord: next === analysed ? null : next });
  };
  const strumEditing: StrumEditing | null =
    part && marks
      ? {
          isEditing: isEditingStrum,
          isCorrected: part.group in review.strums,
          onEdit: setEditingStrum,
          onToggle: (index) => {
            const next = [...marks];
            next[index] = nextMark(next[index] ?? null);
            save({ kind: 'strum', group: part.group, code: codeFromMarks(next) });
          },
          onReset: () => save({ kind: 'strum', group: part.group, code: null }),
        }
      : null;

  return {
    part,
    group: part ? card.parts.filter((p) => p.group === part.group) : [],
    isApproved: isApproved(review, part),
    isCorrecting: part !== null && isCorrecting,
    setCorrecting,
    approve: (approved: boolean) =>
      part && save({ kind: 'approve', group: part.group, isApproved: approved }),
    correctBar: part && isCorrecting ? correctBar : null,
    marks,
    isStrumCorrected: part !== null && part.group in review.strums,
    strumEditing,
    isPartApproved: (index: number) => isApproved(review, card.parts[index] ?? null),
  };
}
