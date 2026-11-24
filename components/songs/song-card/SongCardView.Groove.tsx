'use client';

import { useTranslations } from 'next-intl';

import type { CardPart } from '@/lib/music-theory/song-card';

import { DRUM_LABEL, GROOVE_LABEL, lookup, SUBDIVISION } from '../SongMapCard.Detail';
import { bassCells, describeCells, hitCells } from './song-card-grid.helpers';
import { eyebrow, hint } from './song-card.styles';
import { SongCardGridRow } from './SongCardView.GridRow';

type Props = { part: CardPart; bar: number; slot: number };

// Toms, crash and ride tick in every bar of most analyses (bleed between drum stems): left out.
const KIT = ['Hi-hat', 'Werbel', 'Stopa'] as const;

/** The teacher's extra rows of the bar grid: the bar's bass and the part's drums, marked approximate. */
export const SongCardGroove = ({ part, bar, slot }: Props) => {
  const t = useTranslations('SongCard');
  const ts = useTranslations('Songs');
  const notes = part.bass?.[bar - part.firstBar] ?? null;
  const drums = KIT.filter((drum) => part.drums?.patterns[drum]);
  if (!notes && drums.length === 0) return null;
  const [cymbalDrum, cymbalStep] = part.drums?.cymbal?.split(' ') ?? [];
  const cymbal = lookup(DRUM_LABEL, cymbalDrum);
  const step = lookup(SUBDIVISION, cymbalStep);
  const groove = [lookup(GROOVE_LABEL, part.drums?.kick), lookup(GROOVE_LABEL, part.drums?.snare)]
    .filter((key) => key !== null)
    .map((key) => ts(key))
    .concat(cymbal && step ? [ts(step, { drum: ts(cymbal) })] : []);

  return (
    <>
      <div className="flex items-center gap-2 pt-3">
        <span className={eyebrow}>{t('approxTitle')}</span>
        <span className="h-px flex-1 bg-[var(--rule)]" />
      </div>
      {notes && (
        <SongCardGridRow
          label={t('rowBass')}
          cells={bassCells(notes)}
          slot={slot}
          description={describeCells(bassCells(notes))}
        />
      )}
      {drums.map((drum) => {
        const cells = hitCells(part.drums?.patterns[drum] ?? '');
        return (
          <SongCardGridRow
            key={drum}
            label={ts(DRUM_LABEL[drum])}
            cells={cells}
            slot={slot}
            description={describeCells(cells)}
          />
        );
      })}
      {groove.length > 0 && (
        <p className={`${hint} pt-2`}>{t('groove', { groove: groove.join(' · ') })}</p>
      )}
    </>
  );
};
