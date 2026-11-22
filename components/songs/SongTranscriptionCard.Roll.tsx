'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { RollTrack } from '@/lib/music-theory/transcription-roll';

import { TranscriptionNotes } from './SongTranscriptionCard.Notes';

type TrackKey = 'bass' | 'vocals';

type Props = {
  /** Bars of the recording. */
  bars: number;
  bass: RollTrack;
  vocals: RollTrack;
};

const BARS_PER_PAGE = 8;
const TRACK_LABEL = { bass: 'transcriptionBass', vocals: 'transcriptionVocals' } as const;

const toggleClass = (isActive: boolean) =>
  `rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    isActive
      ? 'border-[var(--ink)] text-[var(--ink)]'
      : 'border-[var(--rule)] text-[var(--ink-3)] hover:text-[var(--ink)]'
  }`;

const stepClass =
  'rounded border border-[var(--rule)] px-2 py-0.5 text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40';

/** A piano roll of one track, eight bars at a time; a track without notes cannot be picked. */
export const TranscriptionRoll = ({ bars, bass, vocals }: Props) => {
  const t = useTranslations('Songs');
  const tracks = { bass, vocals };
  const [trackKey, setTrackKey] = useState<TrackKey>(bass.notes.length > 0 ? 'bass' : 'vocals');
  const [page, setPage] = useState(0);

  const pages = Math.max(1, Math.ceil(bars / BARS_PER_PAGE));
  const first = 1 + page * BARS_PER_PAGE;
  const last = Math.min(first + BARS_PER_PAGE - 1, Math.max(bars, 1));
  const range = { from: first, to: last, total: bars };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label={t('transcriptionTracks')} className="flex gap-1">
          {(['bass', 'vocals'] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={trackKey === key}
              disabled={tracks[key].notes.length === 0}
              onClick={() => setTrackKey(key)}
              className={toggleClass(trackKey === key)}
            >
              {t(TRACK_LABEL[key])}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-[var(--ink-3)]">
          <button
            type="button"
            aria-label={t('transcriptionPrevious')}
            disabled={page === 0}
            onClick={() => setPage((current) => current - 1)}
            className={stepClass}
          >
            ←
          </button>
          <span>{t('transcriptionBars', range)}</span>
          <button
            type="button"
            aria-label={t('transcriptionNext')}
            disabled={page >= pages - 1}
            onClick={() => setPage((current) => current + 1)}
            className={stepClass}
          >
            →
          </button>
        </div>
      </div>
      <TranscriptionNotes
        track={tracks[trackKey]}
        first={first}
        count={BARS_PER_PAGE}
        label={t('transcriptionRollLabel', { track: t(TRACK_LABEL[trackKey]), ...range })}
      />
    </div>
  );
};
