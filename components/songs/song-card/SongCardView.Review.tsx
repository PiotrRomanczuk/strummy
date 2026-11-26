'use client';

import { useTranslations } from 'next-intl';

import type { CardPart } from '@/lib/music-theory/song-card';

import { hint } from './song-card.styles';

type Props = {
  part: CardPart;
  /** The parts reviewed together with it (same kind, same loop), by name. */
  groupNames: string[];
  isApproved: boolean;
  isEditing: boolean;
  onApprove: (isApproved: boolean) => void;
  onEdit: (isEditing: boolean) => void;
};

const button = 'rounded-md border px-3 py-1.5 text-[13px] transition-colors';
const plain = `${button} border-[var(--rule)] bg-[var(--card)] text-[var(--ink-2)] hover:bg-[var(--rule-2)]`;
const gold = `${button} border-[var(--gold-2)] bg-[var(--gold-2)] text-[var(--on-accent)] hover:bg-[var(--gold)]`;
const box = 'rounded-[10px] border border-[var(--gold-dim)] bg-[var(--gold-tint)] px-3 py-2.5';
const panel = `grid gap-2 ${box}`;

/** The teacher's say on the part's chords: a proposal of the analysis until approved, correctable bar by bar. */
export const SongCardReview = ({
  part,
  groupNames,
  isApproved,
  isEditing,
  onApprove,
  onEdit,
}: Props) => {
  const t = useTranslations('SongCard');
  if (isEditing) {
    return (
      <div className={`${box} flex flex-wrap items-center gap-2`}>
        <span className={hint}>{t('editChordsHint')}</span>
        <button type="button" className={gold} onClick={() => onEdit(false)}>
          {t('editDone')}
        </button>
      </div>
    );
  }
  if (isApproved) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--success)]">
        <span>{t('approved')}</span>
        <button type="button" className={plain} onClick={() => onEdit(true)}>
          {t('correct')}
        </button>
        <button type="button" className={plain} onClick={() => onApprove(false)}>
          {t('unapprove')}
        </button>
      </div>
    );
  }
  return (
    <div className={panel} data-group={part.group}>
      <p className={hint}>
        <span className="mr-2 rounded-full border border-[var(--gold-dim)] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[.08em] text-[var(--gold-2)]">
          {t('proposal')}
        </span>
        {t('proposalBody')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={gold} onClick={() => onApprove(true)}>
          {t('approve')}
        </button>
        <button type="button" className={plain} onClick={() => onEdit(true)}>
          {t('correct')}
        </button>
        <span className={hint}>
          {groupNames.length > 1
            ? t('approveGroup', { count: groupNames.length, names: groupNames.join(', ') })
            : t('approveOne')}
        </span>
      </div>
    </div>
  );
};
