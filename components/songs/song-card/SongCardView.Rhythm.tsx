'use client';

import { useTranslations } from 'next-intl';

import type { SongCard } from '@/lib/music-theory/song-card';
import type { CardPosition, StrumMark } from '@/lib/music-theory/song-card-clock';

import { chordCells, countCells, describeCells, strumCells } from './song-card-grid.helpers';
import { cardSection, hint, sectionTitle } from './song-card.styles';
import { groupClass, optionClass } from './SongCardView.Tempo';
import { SongCardGridRow } from './SongCardView.GridRow';
import { SongCardGroove } from './SongCardView.Groove';
import { SongCardStrumEditor } from './SongCardView.StrumEditor';

/** The teacher's handle on the part's strum; null for a student. */
export type StrumEditing = {
  isEditing: boolean;
  isCorrected: boolean;
  onEdit: (isEditing: boolean) => void;
  onToggle: (index: number) => void;
  onReset: () => void;
};

type Props = {
  card: SongCard;
  position: CardPosition;
  /** The teacher also sees the bass and the drums of the part, marked approximate. */
  isTeacher: boolean;
  edits?: Readonly<Record<number, string>>;
  /** The strum of the playing bar: the teacher's for its part, else the analysis' with the direction rule. */
  marks: StrumMark[] | null;
  strumEditing?: StrumEditing | null;
  /** The teacher corrected this part's strum (what a student is told). */
  isStrumCorrected?: boolean;
};

/** The playing bar as a sixteenth grid: count, chord and strum; for the teacher the bass and the drums too. */
export const SongCardRhythm = (props: Props) => {
  const { card, position, isTeacher, edits = {}, marks, strumEditing = null } = props;
  const isCorrected = strumEditing?.isCorrected ?? props.isStrumCorrected ?? false;
  const t = useTranslations('SongCard');
  const part = card.parts[position.part];
  const strum = marks ? strumCells(marks, card.strum ?? '') : null;
  const note = isCorrected
    ? t(isTeacher ? 'strumByYou' : 'strumByTeacher')
    : t(strum ? (isTeacher ? 'strumRuleTeacher' : 'strumRule') : 'noStrum');

  return (
    <section aria-labelledby="song-card-rhythm" className={cardSection}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="song-card-rhythm" className={sectionTitle}>
          {t('barTitle', { n: position.bar + 1 })}
        </h2>
        {strumEditing && marks && (
          <span className="flex gap-1.5">
            {strumEditing.isCorrected && (
              <button
                type="button"
                className={`${groupClass} ${optionClass(false)}`}
                onClick={strumEditing.onReset}
              >
                {t('strumReset')}
              </button>
            )}
            <button
              type="button"
              aria-pressed={strumEditing.isEditing}
              className={`${groupClass} ${optionClass(strumEditing.isEditing)}`}
              onClick={() => strumEditing.onEdit(!strumEditing.isEditing)}
            >
              {t('strumEdit')}
            </button>
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <SongCardGridRow label="" cells={countCells()} slot={position.slot} description="" />
        <SongCardGridRow
          label={t('rowChord')}
          cells={chordCells(card, position.bar, edits)}
          slot={position.slot}
          description={describeCells(chordCells(card, position.bar, edits))}
        />
        {strum && marks && strumEditing?.isEditing ? (
          <SongCardStrumEditor
            marks={marks}
            slot={position.slot}
            onToggle={strumEditing.onToggle}
          />
        ) : (
          strum && (
            <SongCardGridRow
              label={t('rowStrum')}
              cells={strum}
              slot={position.slot}
              description={describeCells(strum)}
            />
          )
        )}
        {isTeacher && part && (
          <SongCardGroove part={part} bar={position.bar} slot={position.slot} />
        )}
      </div>
      <p className={hint}>{note}</p>
    </section>
  );
};
