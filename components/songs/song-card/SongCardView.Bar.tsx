'use client';

import { useTranslations } from 'next-intl';

import { SLOTS_PER_BAR } from '@/lib/music-theory/song-card-clock';

import { chordLabel } from './song-card.helpers';

type Props = {
  /** 0-based bar of the song. */
  bar: number;
  /** One chord, or one per half when it changes mid-bar. */
  chords: string[];
  /** Same chord as the bar before: drawn quieter, like a repeat sign. */
  isRepeat: boolean;
  isNow: boolean;
  /** The playing sixteenth of the current bar, -1 for none. */
  slot: number;
  degree: string | null;
  /** The teacher replaced the analysis' chord: drawn in gold. */
  isCorrected?: boolean;
  /** A click corrects the chord instead of moving there. */
  isCorrecting?: boolean;
  onSelect: () => void;
};

const barClass = (isNow: boolean, isCorrecting: boolean) =>
  `relative h-16 w-full overflow-hidden border-b border-r border-[var(--rule)] text-left transition-colors hover:bg-[var(--rule-2)] ${
    isNow ? 'bg-[var(--gold-tint)] shadow-[inset_0_0_0_2px_var(--gold)]' : ''
  } ${isCorrecting ? 'cursor-cell hover:shadow-[inset_0_0_0_2px_var(--gold-dim)]' : ''}`;
const chordTone = (isCorrected: boolean, isRepeat: boolean) =>
  isCorrected ? 'text-[var(--gold-2)]' : isRepeat ? 'text-[var(--ink-4)]' : 'text-[var(--ink)]';

/** One bar of the chord chart; a click moves the card's clock to it. */
export const SongCardBar = (props: Props) => {
  const { bar, chords, isRepeat, isNow, slot, degree, onSelect } = props;
  const { isCorrected = false, isCorrecting = false } = props;
  const t = useTranslations('SongCard');
  return (
    <li className="contents">
      <button
        type="button"
        aria-current={isNow ? 'true' : undefined}
        aria-label={t('barLabel', { n: bar + 1, chords: chords.map(chordLabel).join(' ') })}
        onClick={onSelect}
        className={barClass(isNow, isCorrecting)}
      >
        {chords.map((chord, i) => (
          <span
            key={i}
            className={`absolute top-3 whitespace-nowrap pl-2.5 font-serif text-[22px] font-semibold leading-none ${
              i === 1 ? 'left-1/2' : 'left-0'
            } ${chordTone(isCorrected, isRepeat)}`}
          >
            {chordLabel(chord)}
          </span>
        ))}
        <span className="absolute bottom-1.5 left-2.5 font-mono text-[10px] text-[var(--ink-4)]">
          {bar + 1}
        </span>
        {degree && (
          <span className="absolute bottom-1.5 right-2 font-mono text-[10px] text-[var(--ink-4)]">
            {degree}
          </span>
        )}
        {isNow && slot >= 0 && (
          <span
            className="absolute inset-y-0 w-0.5 bg-[var(--ink)]"
            style={{ left: `${(slot / SLOTS_PER_BAR) * 100}%` }}
          />
        )}
      </button>
    </li>
  );
};
