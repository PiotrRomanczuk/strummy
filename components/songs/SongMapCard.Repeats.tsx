import { useTranslations } from 'next-intl';

import type { SongPart } from '@/schemas/SongSegmentsSchema';

type Props = {
  /** The parts of the picked run, in order. */
  parts: SongPart[];
  name: string;
  /** Index of the shown repeat within the run. */
  picked: number;
  onPick: (index: number) => void;
};

const stepClass = (isActive: boolean) =>
  `min-h-9 min-w-9 rounded-sm border px-2 font-mono text-xs transition-colors ${
    isActive
      ? 'border-[var(--ink)] bg-[var(--rule)] text-[var(--ink)]'
      : 'border-[var(--rule)] text-[var(--ink-3)] hover:text-[var(--ink)]'
  }`;

/** One button per repeat of a run (Intro 1, 2, 3, 4): each shows its own bars, chords, drums and bass. */
export const SongMapRepeats = ({ parts, name, picked, onPick }: Props) => {
  const t = useTranslations('Songs');

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--ink-4)]">
        {t('mapRepeat')}
      </span>
      <div role="group" aria-label={t('mapRepeats', { name })} className="flex flex-wrap gap-1">
        {parts.map((part, i) => (
          <button
            key={part.n}
            type="button"
            aria-pressed={i === picked}
            aria-label={t('mapRepeatLabel', {
              name,
              index: i + 1,
              count: parts.length,
              n: part.n,
              bars: part.bars,
            })}
            onClick={() => onPick(i)}
            className={stepClass(i === picked)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};
