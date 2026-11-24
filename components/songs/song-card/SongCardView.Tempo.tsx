'use client';

import { useTranslations } from 'next-intl';

import { BACKING_MIN_RATE, BACKING_RATE_STEP } from '@/lib/music-theory/song-card-backing';

import type { CardSource } from './song-card-link.helpers';
import { eyebrow } from './song-card.styles';

type Props = {
  source: CardSource;
  onSource: (source: CardSource) => void;
  /** False when the recording cannot play here: the backing is all there is. */
  canRecord: boolean;
  /** The player's own speeds, for the recording. */
  rates: number[];
  rate: number;
  onRate: (rate: number) => void;
  backingRate: number;
  onBackingRate: (rate: number) => void;
  /** The recording's tempo, for the backing's BPM read-out. */
  bpm: number;
};

export const optionClass = (isOn: boolean) =>
  `px-2.5 py-1.5 text-[12.5px] transition-colors first:rounded-l-md last:rounded-r-md disabled:cursor-not-allowed disabled:opacity-40 ${
    isOn
      ? 'bg-[var(--gold-tint)] text-[var(--ink)] shadow-[inset_0_-2px_0_var(--gold)]'
      : 'text-[var(--ink-3)] hover:bg-[var(--rule-2)]'
  }`;
export const groupClass =
  'inline-flex divide-x divide-[var(--rule)] rounded-md border border-[var(--rule)] bg-[var(--card)]';

/** What plays — the recording at the player's speeds, or the backing track at any tempo from 40% — and how fast. */
export const SongCardTempo = (props: Props) => {
  const t = useTranslations('SongCard');
  const isBacking = props.source === 'backing';
  return (
    <>
      <span className="flex items-center gap-2">
        <span className={eyebrow}>{t('tempo')}</span>
        {isBacking ? (
          <>
            <input
              type="range"
              min={BACKING_MIN_RATE * 100}
              max={100}
              step={BACKING_RATE_STEP * 100}
              value={Math.round(props.backingRate * 100)}
              onChange={(event) => props.onBackingRate(Number(event.target.value) / 100)}
              aria-label={t('backingTempo')}
              className="w-28 accent-[var(--gold-2)]"
            />
            <span className="font-mono text-xs text-[var(--ink-2)]">
              {`${Math.round(props.backingRate * 100)}% · ${Math.round(props.bpm * props.backingRate)} BPM`}
            </span>
          </>
        ) : (
          <span role="group" aria-label={t('tempo')} className={groupClass}>
            {props.rates.map((rate) => (
              <button
                key={rate}
                type="button"
                aria-pressed={rate === props.rate}
                onClick={() => props.onRate(rate)}
                className={optionClass(rate === props.rate)}
              >
                {`${Math.round(rate * 100)}%`}
              </button>
            ))}
          </span>
        )}
      </span>
      <span role="group" aria-label={t('soundSource')} className={groupClass}>
        <button
          type="button"
          aria-pressed={!isBacking}
          disabled={!props.canRecord}
          onClick={() => props.onSource('recording')}
          className={optionClass(!isBacking)}
        >
          {t('sourceRecording')}
        </button>
        <button
          type="button"
          aria-pressed={isBacking}
          onClick={() => props.onSource('backing')}
          className={optionClass(isBacking)}
        >
          {t('sourceBacking')}
        </button>
      </span>
    </>
  );
};
