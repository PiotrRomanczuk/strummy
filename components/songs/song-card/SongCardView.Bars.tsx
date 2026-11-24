'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import type { SongCard } from '@/lib/music-theory/song-card';
import { chordAt, type CardPosition } from '@/lib/music-theory/song-card-clock';

import { formatClock, partNameKey, shownBars } from './song-card.helpers';
import { cardSection, eyebrow, hint, sectionTitle } from './song-card.styles';
import { SongCardBar } from './SongCardView.Bar';

type Props = {
  card: SongCard;
  position: CardPosition;
  /** Roman degrees under the bars and the part's loop — the teacher's reading aids. */
  showDegrees: boolean;
  onSeek: (seconds: number) => void;
  /** The teacher's corrections, a chord per bar. */
  edits?: Readonly<Record<number, string>>;
  /** Above the bars: the teacher's approval panel. */
  panel?: ReactNode;
  /** While correcting, a click on a bar changes its chord instead of moving there. */
  onCorrect?: ((bar: number) => void) | null;
  /** The part's chords are not approved yet (student view). */
  isUnsure?: boolean;
};

/** The bars of the current part as a chord chart: one box per bar, a chord per half when it changes mid-bar. */
export const SongCardBars = (props: Props) => {
  const { card, position, showDegrees, onSeek, edits = {}, panel = null, onCorrect = null } = props;
  const { isUnsure = false } = props;
  const t = useTranslations('SongCard');
  const ts = useTranslations('Songs');
  const [from, to] = shownBars(card, position);
  const part = card.parts[position.part];
  const name = part ? partNameKey(part) : null;
  const title = name
    ? `${name.key ? ts(name.key) : part.label}${name.ordinal ? ` ${name.ordinal}` : ''}`
    : t('pageTitle', { from: from + 1, to, total: card.bars.length });
  const times = part && part.loop.length > 0 ? Math.floor(part.bars / part.loop.length) : 0;
  // A loop is worth naming only when the part plays it at least twice.
  const loop = part && part.loop.length > 1 && times > 1 ? part.loop.join('–') : null;
  const range = part
    ? t('partRange', {
        from: from + 1,
        to,
        start: formatClock(part.start),
        end: formatClock(part.end),
      })
    : t('noParts');
  const bars = Array.from({ length: to - from }, (_, k) => from + k);

  return (
    <section aria-labelledby="song-card-bars" className={cardSection}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="song-card-bars" className={sectionTitle}>
          {title}
        </h2>
        <span className={eyebrow}>{range}</span>
      </div>
      {showDegrees && part && loop && (
        <p className={`${hint} font-mono`}>{t('loop', { loop, times })}</p>
      )}
      {panel}
      <ol className="grid grid-cols-2 border-l border-t border-[var(--rule)] sm:grid-cols-4">
        {bars.map((bar) => {
          const halves = [chordAt(card, bar, 0, edits), chordAt(card, bar, 1, edits)];
          const chords = halves[0] === halves[1] ? [halves[0]] : halves;
          return (
            <SongCardBar
              key={bar}
              bar={bar}
              chords={chords}
              isRepeat={
                chords.length === 1 && bar > from && chordAt(card, bar - 1, 1, edits) === halves[0]
              }
              isNow={bar === position.bar}
              slot={position.slot}
              degree={showDegrees && part ? (part.roman[bar - part.firstBar] ?? null) : null}
              isCorrected={bar in edits}
              isCorrecting={onCorrect !== null}
              isUnsure={isUnsure}
              onSelect={() => (onCorrect ? onCorrect(bar) : onSeek(card.bars[bar].start + 0.01))}
            />
          );
        })}
      </ol>
    </section>
  );
};
