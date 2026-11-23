'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import { useTranslations } from 'next-intl';

import type { CardPart, SongCard } from '@/lib/music-theory/song-card';
import type { CardPosition } from '@/lib/music-theory/song-card-clock';

import { formatClock, percentOf } from './song-card.helpers';

type Props = {
  card: SongCard;
  time: number;
  position: CardPosition;
  loop: CardPart | null;
  onSeek: (seconds: number) => void;
};

/** The recording as a line: a tick per bar (taller every fourth), the loop's span and the playhead. */
export const SongCardTimeline = ({ card, time, position, loop, onSeek }: Props) => {
  const t = useTranslations('SongCard');
  const seekAt = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onSeek(((event.clientX - box.left) / box.width) * card.duration);
  };
  const stepBar = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const bar = card.bars[Math.max(0, Math.min(card.bars.length - 1, position.bar + step))];
    if (bar) onSeek(bar.start + 0.01);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t('timeline')}
      aria-valuemin={0}
      aria-valuemax={Math.round(card.duration)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={t('timelineValue', { time: formatClock(time), bar: position.bar + 1 })}
      onClick={seekAt}
      onKeyDown={stepBar}
      className="relative h-7 cursor-pointer border-b border-[var(--rule)]"
    >
      {loop && (
        <div
          data-testid="song-card-loop"
          className="absolute inset-y-0 border-x-2 border-[var(--gold)] bg-[var(--gold-tint)]"
          style={{
            left: percentOf(loop.start, card.duration),
            width: percentOf(loop.end - loop.start, card.duration),
          }}
        />
      )}
      {card.bars.map((bar, i) => (
        <span
          key={i}
          className={`absolute bottom-0 w-px ${i % 4 === 0 ? 'h-3 bg-[var(--ink-4)]' : 'h-[7px] bg-[var(--ink-5)]'}`}
          style={{ left: percentOf(bar.start, card.duration) }}
        />
      ))}
      <span
        className="pointer-events-none absolute -inset-y-1 -ml-px w-0.5 bg-[var(--ink)]"
        style={{ left: percentOf(time, card.duration) }}
      />
    </div>
  );
};
