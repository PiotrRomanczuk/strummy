'use client';

import { useTranslations } from 'next-intl';

import type { SongCard } from '@/lib/music-theory/song-card';
import { strumFromRule, type CardPosition } from '@/lib/music-theory/song-card-clock';

import { DRUM_LABEL, GROOVE_LABEL, lookup, SUBDIVISION } from '../SongMapCard.Detail';
import {
  bassCells,
  chordCells,
  countCells,
  hitCells,
  strumCells,
  type GridCell,
} from './song-card-grid.helpers';
import { cardSection, eyebrow, hint, sectionTitle } from './song-card.styles';
import { SongCardGridRow } from './SongCardView.GridRow';

type Props = {
  card: SongCard;
  position: CardPosition;
  /** The teacher also sees the bass and the drums of the part, marked approximate. */
  isTeacher: boolean;
};

// Toms, crash and ride tick in every bar of most analyses (bleed between drum stems): left out.
const KIT = ['Hi-hat', 'Werbel', 'Stopa'] as const;

const describe = (cells: GridCell[]) =>
  cells
    .filter((cell) => cell.tone !== 'empty')
    .map((cell) => `${cell.slot + 1}: ${cell.text}`)
    .join(', ');

/** The playing bar as a sixteenth grid: count, chord and strum; for the teacher the bass and the drums too. */
export const SongCardRhythm = ({ card, position, isTeacher }: Props) => {
  const t = useTranslations('SongCard');
  const ts = useTranslations('Songs');
  const part = card.parts[position.part];
  const strum = card.strum ? strumCells(strumFromRule(card.strum), card.strum) : null;
  const notes = part?.bass?.[position.bar - part.firstBar] ?? null;
  const drums = KIT.filter((drum) => part?.drums?.patterns[drum]);
  const [cymbalDrum, cymbalStep] = part?.drums?.cymbal?.split(' ') ?? [];
  const cymbal = lookup(DRUM_LABEL, cymbalDrum);
  const step = lookup(SUBDIVISION, cymbalStep);
  const groove = [lookup(GROOVE_LABEL, part?.drums?.kick), lookup(GROOVE_LABEL, part?.drums?.snare)]
    .filter((key) => key !== null)
    .map((key) => ts(key))
    .concat(cymbal && step ? [ts(step, { drum: ts(cymbal) })] : []);
  const row = (label: string, cells: GridCell[]) => (
    <SongCardGridRow
      label={label}
      cells={cells}
      slot={position.slot}
      description={describe(cells)}
    />
  );

  return (
    <section aria-labelledby="song-card-rhythm" className={cardSection}>
      <h2 id="song-card-rhythm" className={sectionTitle}>
        {t('barTitle', { n: position.bar + 1 })}
      </h2>
      <div className="overflow-x-auto">
        {row('', countCells())}
        {row(t('rowChord'), chordCells(card, position.bar))}
        {strum && row(t('rowStrum'), strum)}
        {isTeacher && (notes || drums.length > 0) && (
          <div className="flex items-center gap-2 pt-3">
            <span className={eyebrow}>{t('approxTitle')}</span>
            <span className="h-px flex-1 bg-[var(--rule)]" />
          </div>
        )}
        {isTeacher && notes && row(t('rowBass'), bassCells(notes))}
        {isTeacher &&
          drums.map((drum) => (
            <div key={drum}>
              {row(ts(DRUM_LABEL[drum]), hitCells(part?.drums?.patterns[drum] ?? ''))}
            </div>
          ))}
      </div>
      <p className={hint}>
        {strum ? t(isTeacher ? 'strumRuleTeacher' : 'strumRule') : t('noStrum')}
      </p>
      {isTeacher && groove.length > 0 && (
        <p className={hint}>{t('groove', { groove: groove.join(' · ') })}</p>
      )}
    </section>
  );
};
