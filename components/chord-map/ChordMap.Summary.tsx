'use client';

import { useTranslations } from 'next-intl';

type Props = {
  playable: number;
  total: number;
  knownCount: number;
  /** The student clicked tiles away from what their lessons say. */
  isChanged: boolean;
  onReset: () => void;
};

/** The headline: songs playable today, out of the catalogue, with a thin meter. */
export function ChordMapSummary({ playable, total, knownCount, isChanged, onReset }: Props) {
  const t = useTranslations('ChordMap');
  const share = total > 0 ? Math.round((playable / total) * 1000) / 10 : 0;

  return (
    <section className="flex flex-col gap-3" aria-live="polite">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <span className="font-[family-name:var(--serif)] text-6xl font-normal leading-[0.9] tabular-nums">
          {playable}
        </span>
        <div className="flex flex-col gap-1 pb-1">
          <span className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-4)]">
            {t('playableLabel', { count: playable })}
          </span>
          <span className="text-sm tabular-nums text-[var(--ink-3)]">
            {t('summaryLine', { known: knownCount, total })}
          </span>
        </div>
      </div>
      <div className="relative h-[3px] bg-[var(--rule)]" role="presentation">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--gold)]"
          style={{ width: `${share}%` }}
        />
      </div>
      {isChanged && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--gold-dim)] bg-[var(--gold-tint)] px-3 py-2 text-xs text-[var(--ink-2)]">
          <span>{t('whatIf')}</span>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md px-2 py-1 font-medium text-[var(--gold-2)] hover:bg-[var(--rule-2)] focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
          >
            {t('reset')}
          </button>
        </div>
      )}
    </section>
  );
}
