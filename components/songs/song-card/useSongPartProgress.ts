'use client';

import { useState } from 'react';

import { markSongPartTempo } from '@/app/actions/song-part-progress';
import type { SongProgressMark } from '@/lib/services/song-part-progress.helpers';

type Props = {
  studentId: string;
  songId: string;
  /** The lesson the marks belong to, when the card was opened from one. */
  lessonId: string | null;
  initialMarks: SongProgressMark[];
};

/** Which row is saving or failed, by its part label ('' = the whole song). */
export type MarkState = { key: string; status: 'saving' | 'failed' } | null;

const keyOf = (label: string | null) => label ?? '';

/**
 * The student's marks for this song and the one-tap "plays this part at N%". A mark is shown as soon as the
 * server stored it; a failed one leaves the history as it was and says so on its row.
 */
export function useSongPartProgress({ studentId, songId, lessonId, initialMarks }: Props) {
  const [marks, setMarks] = useState<SongProgressMark[]>(initialMarks);
  const [state, setState] = useState<MarkState>(null);

  const mark = async (label: string | null, tempoPercent: number) => {
    setState({ key: keyOf(label), status: 'saving' });
    const result = await markSongPartTempo({
      studentId,
      songId,
      partLabel: label,
      tempoPercent,
      ...(lessonId ? { lessonId } : {}),
    }).catch(() => ({ error: 'failed' as const }));
    if ('error' in result) return setState({ key: keyOf(label), status: 'failed' });
    const added: SongProgressMark = {
      partLabel: label,
      tempoPercent,
      markedAt: new Date().toISOString(),
    };
    setMarks((current) => [added, ...current]);
    setState(null);
  };

  const stateOf = (label: string | null) =>
    state && state.key === keyOf(label) ? state.status : null;

  return { marks, mark, stateOf, isBusy: state?.status === 'saving' };
}
