'use client';

import { useTranslations } from 'next-intl';

import type { StrumMark } from '@/lib/music-theory/song-card-clock';

import { COUNT } from './song-card-grid.helpers';

type Props = {
  marks: StrumMark[];
  /** The playing sixteenth, -1 for none. */
  slot: number;
  onToggle: (index: number) => void;
};

const TEXT: Record<NonNullable<StrumMark>, string> = { down: '↓', up: '↑', mute: '×' };

/** The strum row as buttons: each click turns a sixteenth down → up → muted → rest. */
export const SongCardStrumEditor = ({ marks, slot, onToggle }: Props) => {
  const t = useTranslations('SongCard');
  return (
    <div className="grid min-w-[300px] grid-cols-[44px_repeat(16,minmax(16px,1fr))] border-b border-[var(--rule)] sm:min-w-[380px] sm:grid-cols-[64px_repeat(16,minmax(19px,1fr))]">
      <span className="flex h-8 items-center text-xs text-[var(--ink-3)]">{t('rowStrum')}</span>
      {COUNT.map((count, i) => {
        const mark = marks[i] ?? null;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onToggle(i)}
            aria-label={t('strumCell', {
              count: `${i + 1} (${count})`,
              mark: mark ? TEXT[mark] : '–',
            })}
            className={`flex h-8 items-center justify-center text-[19px] text-[var(--gold-2)] hover:bg-[var(--rule-2)] ${
              i % 4 === 0 ? 'shadow-[inset_1px_0_0_var(--rule)]' : ''
            } ${i === slot ? 'bg-[var(--gold-tint)]' : ''} outline-dashed outline-1 -outline-offset-2 outline-[var(--gold-dim)]`}
          >
            {mark ? TEXT[mark] : ''}
          </button>
        );
      })}
    </div>
  );
};
