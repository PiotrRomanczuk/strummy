'use client';

import { useState } from 'react';

import { createSongExercise } from '@/app/actions/song-exercises';
import type { ExerciseKind } from '@/schemas/SongExerciseSchema';

import type { CardSource } from './song-card-link.helpers';

type Props = {
  songId: string;
  videoId: string | null;
  /** song2logic number of the selected part. */
  partN: number;
  /** What the form starts with: "<part name> – <song title>". */
  defaultName: string;
  /** Playback rate of the card, 0.4–1. */
  rate: number;
  source: CardSource;
};

export type SaveExerciseStatus = 'idle' | 'saving' | 'saved' | 'duplicate' | 'failed';

/** The form state of "Save as exercise" and its submit; tempo and source are the card's current settings. */
export function useSaveExercise({ songId, videoId, partN, defaultName, rate, source }: Props) {
  const [name, setName] = useState(defaultName);
  const [kind, setKind] = useState<ExerciseKind>('riff');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<SaveExerciseStatus>('idle');

  /** Opens with a fresh form for the part the card is on now. */
  const reset = () => {
    setName(defaultName);
    setKind('riff');
    setNote('');
    setStatus('idle');
  };

  const submit = async () => {
    setStatus('saving');
    const result = await createSongExercise({
      songId,
      videoId,
      partN,
      name,
      kind,
      tempoPercent: Math.round(rate * 100),
      source,
      note,
    }).catch(() => ({ error: 'failed' as const }));
    if ('exerciseId' in result) return setStatus('saved');
    setStatus(result.error === 'duplicate' ? 'duplicate' : 'failed');
  };

  const setNameClearing = (value: string) => {
    setName(value);
    if (status === 'duplicate' || status === 'failed') setStatus('idle');
  };

  return { name, kind, note, status, setName: setNameClearing, setKind, setNote, reset, submit };
}
