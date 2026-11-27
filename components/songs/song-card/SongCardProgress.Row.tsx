'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { MASTERED_TEMPO_PERCENT } from '@/lib/services/song-part-progress.helpers';

import type { ProgressRow } from './song-card-progress.helpers';
import { TEMPO_CHOICES } from './song-card-progress.helpers';
import { usePartName } from './usePartName';

type Props = {
  row: ProgressRow;
  state: 'saving' | 'failed' | null;
  isBusy: boolean;
  onMark: (label: string | null, tempoPercent: number) => void;
};

// 44px targets: the panel is tapped on a tablet during the lesson.
const chipClass = (isLatest: boolean) =>
  `min-h-11 min-w-14 rounded-md border px-3 font-mono text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    isLatest
      ? 'border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--ink)] shadow-[inset_0_-2px_0_var(--gold)]'
      : 'border-[var(--rule)] bg-[var(--card)] text-[var(--ink-2)] hover:bg-[var(--rule-2)] active:bg-[var(--rule)]'
  }`;

/** One part (or the whole song): its latest tempo, and one tap per tempo to add a mark. */
export const SongCardProgressRow = ({ row, state, isBusy, onMark }: Props) => {
  const t = useTranslations('SongProgress');
  const format = useFormatter();
  const partName = usePartName();
  const name = row.part ? partName({ ...row.part, ofKind: 1 }) : t('wholeSong');
  const latest = row.latest;
  const isPlayed = latest !== null && latest.tempoPercent >= MASTERED_TEMPO_PERCENT;

  return (
    <li
      className="flex flex-col gap-2 border-t border-[var(--rule)] pt-3 first:border-t-0 first:pt-0"
      data-testid={`progress-row-${row.label ?? 'whole'}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[15px] font-medium text-[var(--ink)]">{name}</span>
        {row.label && <span className="font-mono text-xs text-[var(--ink-4)]">{row.label}</span>}
        <span
          className={`ml-auto font-mono text-xs ${isPlayed ? 'text-[var(--success)]' : 'text-[var(--ink-3)]'}`}
        >
          {latest
            ? t('latest', {
                tempo: latest.tempoPercent,
                date: format.dateTime(new Date(latest.markedAt), {
                  day: 'numeric',
                  month: 'short',
                }),
              })
            : t('notMarked')}
        </span>
      </div>
      <div role="group" aria-label={t('tempoFor', { part: name })} className="flex flex-wrap gap-2">
        {TEMPO_CHOICES.map((tempo) => (
          <button
            key={tempo}
            type="button"
            disabled={isBusy}
            aria-pressed={latest?.tempoPercent === tempo}
            aria-label={t('markAt', { part: name, tempo })}
            onClick={() => onMark(row.label, tempo)}
            className={chipClass(latest?.tempoPercent === tempo)}
          >
            {`${tempo}%`}
          </button>
        ))}
      </div>
      {state === 'saving' && <p className="text-xs text-[var(--ink-3)]">{t('saving')}</p>}
      {state === 'failed' && (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {t('failed')}
        </p>
      )}
    </li>
  );
};
