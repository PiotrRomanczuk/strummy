'use client';

import { useTranslations } from 'next-intl';

import type { SongCard } from '@/lib/music-theory/song-card';
import type { CardPosition } from '@/lib/music-theory/song-card-clock';

import { formatClock, partNameKey } from './song-card.helpers';
import { cardSection, eyebrow, hint, PART_STRIPE, sectionTitle } from './song-card.styles';
import { SongCardTimeline } from './SongCardView.Timeline';

type Props = {
  card: SongCard;
  time: number;
  position: CardPosition;
  /** The part the loop repeats, when the loop is on. */
  loopPart?: number | null;
  onSeek: (seconds: number) => void;
  /** For the teacher: whether a part's chords are approved, shown under its name. */
  isPartApproved?: ((partIndex: number) => boolean) | null;
};

const partButton = (isOn: boolean, stripe: string) =>
  `grid min-w-0 basis-0 gap-px overflow-hidden rounded-[2px] px-1.5 pb-1.5 text-left transition-colors hover:bg-[var(--rule-2)] max-sm:basis-[28%] ${stripe} ${
    isOn ? 'border-t-[6px] bg-[var(--rule-2)] pt-[3px]' : 'border-t-[3px] pt-1.5'
  }`;

/** The song's parts in proportion to their length, and the recording's timeline under them. */
export const SongCardMap = (props: Props) => {
  const { card, time, position, loopPart = null, onSeek, isPartApproved = null } = props;
  const t = useTranslations('SongCard');
  const ts = useTranslations('Songs');
  const loop = loopPart === null ? null : (card.parts[loopPart] ?? null);

  return (
    <section aria-labelledby="song-card-map" className={cardSection}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="song-card-map" className={sectionTitle}>
          {t('mapTitle')}
        </h2>
        <span className={eyebrow}>{t('mapHint')}</span>
      </div>
      {card.parts.length === 0 && <p className={hint}>{t('noPartsHint')}</p>}
      {card.parts.length > 0 && (
        <div role="group" aria-label={ts('mapParts')} className="flex gap-[3px] max-sm:flex-wrap">
          {card.parts.map((part, i) => {
            const { key, ordinal } = partNameKey(part);
            return (
              <button
                key={part.n}
                type="button"
                aria-pressed={i === position.part}
                onClick={() => onSeek(part.start + 0.01)}
                className={partButton(i === position.part, PART_STRIPE[part.kind ?? 'other'])}
                style={{ flexGrow: Math.max(0.5, part.end - part.start) }}
              >
                <span className="truncate font-serif text-[15px] font-semibold leading-tight text-[var(--ink)]">
                  {`${key ? ts(key) : part.label}${ordinal ? ` ${ordinal}` : ''}`}
                </span>
                <span className="font-mono text-[10.5px] text-[var(--ink-4)]">
                  {formatClock(part.start)}
                </span>
                {isPartApproved && (
                  <span
                    className={`font-mono text-[10px] ${isPartApproved(i) ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}
                  >
                    {t(isPartApproved(i) ? 'partApproved' : 'partProposal')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <SongCardTimeline card={card} time={time} position={position} loop={loop} onSeek={onSeek} />
    </section>
  );
};
