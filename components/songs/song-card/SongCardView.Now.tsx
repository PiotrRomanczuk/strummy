'use client';

import { useTranslations } from 'next-intl';

import { CHORD_VOICINGS } from '@/lib/music-theory/chord-voicings';
import type { SongCard } from '@/lib/music-theory/song-card';
import {
  chordAt,
  chordsOfBars,
  nextChord,
  type CardPosition,
} from '@/lib/music-theory/song-card-clock';
import { ChordDiagram } from '@/components/skills/chord-quiz/ChordDiagram';

import { chordLabel, partNameKey, shownBars } from './song-card.helpers';
import { cardSection, eyebrow } from './song-card.styles';

type Props = { card: SongCard; position: CardPosition };

const voicingOf = (chord: string) => CHORD_VOICINGS.find((voicing) => voicing.name === chord);

/** What sounds now: the chord in large, the next one and how far away it is, the shapes of the part's chords. */
export const SongCardNow = ({ card, position }: Props) => {
  const t = useTranslations('SongCard');
  const ts = useTranslations('Songs');
  const part = card.parts[position.part];
  const name = part ? partNameKey(part) : null;
  const where = part
    ? `${name?.key ? ts(name.key) : part.label}${name?.ordinal ? ` ${name.ordinal}` : ''}`
    : t('nowBar', { n: position.bar + 1 });
  const current = chordAt(card, position.bar, position.half);
  const next = nextChord(card, position.bar, position.half);
  const [from, to] = shownBars(card, position);
  const shapes = chordsOfBars(card, from, to);

  return (
    <section aria-label={t('nowTitle')} className={cardSection}>
      <span className={eyebrow}>{t('now', { where })}</span>
      <div className="flex flex-wrap items-end gap-6">
        <span
          aria-live="polite"
          className="font-serif text-[clamp(84px,10vw,128px)] font-normal leading-[0.8] tracking-[-0.04em] text-[var(--ink)]"
        >
          {chordLabel(current)}
        </span>
        <span className="grid gap-1 border-l border-[var(--rule)] pb-1.5 pl-4">
          <span className={eyebrow}>{next ? t('next', { bars: next.inBars }) : t('nextNone')}</span>
          <span className="font-serif text-4xl leading-none text-[var(--ink-3)]">
            {next ? next.chord : '—'}
          </span>
        </span>
      </div>
      <ul
        aria-label={t('shapes')}
        className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2"
      >
        {shapes.map((chord) => {
          const voicing = voicingOf(chord);
          return (
            <li
              key={chord}
              aria-current={chord === current ? 'true' : undefined}
              className={`flex flex-col items-center gap-1 rounded-[10px] border p-1.5 ${
                chord === current
                  ? 'border-[var(--gold)] bg-[var(--gold-tint)]'
                  : 'border-transparent'
              }`}
            >
              {voicing ? (
                <ChordDiagram voicing={voicing} size="sm" />
              ) : (
                <>
                  <span className="font-serif text-lg font-semibold">{chord}</span>
                  <span className="text-[11px] text-[var(--ink-4)]">{t('noShape')}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
