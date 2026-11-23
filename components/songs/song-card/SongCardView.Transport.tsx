'use client';

import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatClock } from './song-card.helpers';
import { eyebrow } from './song-card.styles';

type Props = {
  time: number;
  duration: number;
  /** "Refren 1 · takt 24" */
  where: string;
  isPlaying: boolean;
  canPlay: boolean;
  onToggle: () => void;
  rates: number[];
  rate: number;
  onRate: (rate: number) => void;
  /** Null when the card has no parts to loop. */
  isLooping: boolean | null;
  onLoop: () => void;
  /** The homework link of the current settings; teacher only. */
  link: string | null;
};

const option = (isOn: boolean) =>
  `px-2.5 py-1.5 text-[12.5px] transition-colors first:rounded-l-md last:rounded-r-md ${
    isOn
      ? 'bg-[var(--gold-tint)] text-[var(--ink)] shadow-[inset_0_-2px_0_var(--gold)]'
      : 'text-[var(--ink-3)] hover:bg-[var(--rule-2)]'
  }`;
const group =
  'inline-flex divide-x divide-[var(--rule)] rounded-md border border-[var(--rule)] bg-[var(--card)]';

/** Play, where the song is, the tempo, the part loop and (for the teacher) the practice link — always in reach. */
export const SongCardTransport = (props: Props) => {
  const t = useTranslations('SongCard');
  const [copied, setCopied] = useState<string | null>(null);
  const isCopied = copied !== null && copied === props.link;
  const copy = async () => {
    if (!props.link) return;
    try {
      await navigator.clipboard.writeText(new URL(props.link, window.location.origin).toString());
      setCopied(props.link);
    } catch {
      // No clipboard access (insecure origin, denied permission): the address bar holds the same settings.
      window.history.replaceState(null, '', props.link);
    }
  };

  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-[var(--rule)] bg-[var(--card)] px-3.5 py-2.5 shadow-[var(--shadow-sm)]">
      <button
        type="button"
        onClick={props.onToggle}
        disabled={!props.canPlay}
        aria-label={t(props.isPlaying ? 'pause' : 'play')}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[var(--paper)] disabled:opacity-40"
      >
        {props.isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
      </button>
      <span className="font-mono text-xl text-[var(--ink)]">
        {formatClock(props.time)}
        <span className="text-xs text-[var(--ink-4)]">{` / ${formatClock(props.duration)}`}</span>
      </span>
      <span className="min-w-[140px] text-[13px] text-[var(--ink-3)] max-sm:order-last max-sm:basis-full">
        {props.where}
      </span>
      <span className="flex items-center gap-2">
        <span className={eyebrow}>{t('tempo')}</span>
        <span role="group" aria-label={t('tempo')} className={group}>
          {props.rates.map((rate) => (
            <button
              key={rate}
              type="button"
              aria-pressed={rate === props.rate}
              onClick={() => props.onRate(rate)}
              className={option(rate === props.rate)}
            >
              {`${Math.round(rate * 100)}%`}
            </button>
          ))}
        </span>
      </span>
      {props.isLooping !== null && (
        <button
          type="button"
          aria-pressed={props.isLooping}
          onClick={props.onLoop}
          className={`${group} ${option(props.isLooping)}`}
        >
          {t('loopPart')}
        </button>
      )}
      {props.link && (
        <button type="button" onClick={copy} className={`${group} ${option(isCopied)} sm:ml-auto`}>
          {t(isCopied ? 'linkCopied' : 'copyLink')}
        </button>
      )}
    </div>
  );
};
