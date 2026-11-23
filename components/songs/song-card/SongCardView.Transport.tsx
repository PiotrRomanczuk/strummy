'use client';

import { useState, type ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatClock } from './song-card.helpers';
import { groupClass as group, optionClass as option } from './SongCardView.Tempo';

type Props = {
  time: number;
  duration: number;
  /** "Refren 1 · takt 24" */
  where: string;
  isPlaying: boolean;
  canPlay: boolean;
  onToggle: () => void;
  /** The source and tempo controls (SongCardTempo). */
  tempo: ReactNode;
  /** Null when the card has no parts to loop. */
  isLooping: boolean | null;
  onLoop: () => void;
  /** The homework link of the current settings; teacher only. */
  link: string | null;
};

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
      {props.tempo}
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
