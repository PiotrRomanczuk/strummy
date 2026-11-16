import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { Coverage } from '@/lib/repertoire-stats/coverage';

import { CardHead, StatsCard, StatsLabel } from './RepertoireStatsPrimitives';

/** The transcription target: every repertoire recording song2logic can study (2026-11). */
export const TRANSCRIPTION_TARGET = 360;

type Step = {
  id: 'all' | 'link' | 'analysis' | 'transcription';
  count: number;
  missing: number | null;
};

/**
 * Data coverage as steps on one 0–total axis. Not a strict funnel: an analysis can come from a recording found
 * elsewhere, so there are more analyses than links.
 */
export async function RepertoireStatsFunnel({ coverage }: { coverage: Coverage }) {
  const t = await getTranslations('RepertoireStats.funnel');
  const { total } = coverage;
  const steps: Step[] = [
    { id: 'all', count: total, missing: null },
    { id: 'link', count: coverage.withLink, missing: total - coverage.withLink },
    { id: 'analysis', count: coverage.withAnalysis, missing: total - coverage.withAnalysis },
    {
      id: 'transcription',
      count: coverage.withTranscription,
      missing: coverage.withAnalysis - coverage.withTranscription,
    },
  ];
  const percent = (count: number) => (total ? Math.round((count / total) * 100) : 0);
  return (
    <StatsCard className="p-5 md:p-6">
      <CardHead
        title={t('title')}
        sub={t('incomplete', { count: coverage.incomplete, total })}
        right={<StatsLabel className="hidden md:block">{t('axis', { total })}</StatsLabel>}
      />
      {steps.map((step, i) => (
        <div
          key={step.id}
          className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-2 py-3.5 md:grid-cols-[190px_minmax(0,1fr)_120px] ${i ? 'border-t border-[var(--rule-2)]' : ''}`}
        >
          <div>
            <div className="font-medium">{t(`step.${step.id}`)}</div>
            {step.missing !== null && (
              <div className="mt-0.5 font-mono text-[12px] text-[var(--ink-3)]">
                {t(`missing.${step.id}`, { count: step.missing })}
              </div>
            )}
          </div>
          <div className="text-right md:order-last">
            <span className="font-serif text-[30px] font-medium tracking-[-0.02em]">
              {step.count}
            </span>
            <span className="ml-2 font-mono text-[12px] text-[var(--ink-3)]">
              {percent(step.count)}%
            </span>
          </div>
          <div className="col-span-2 md:col-span-1">
            <div className="relative h-[22px] rounded bg-[var(--rule-2)]">
              <div
                className={`h-full rounded ${i ? 'bg-[var(--ink)]' : 'bg-[var(--ink-5)]'}`}
                style={{ width: `${Math.max(percent(step.count), 1)}%` }}
              />
              {step.id === 'transcription' && (
                <div
                  title={t('target', { count: TRANSCRIPTION_TARGET })}
                  className="absolute inset-y-0 left-0 rounded border border-dashed border-[var(--ink-4)]"
                  style={{ width: `${(TRANSCRIPTION_TARGET / Math.max(total, 1)) * 100}%` }}
                >
                  <span className="absolute right-1.5 top-0.5 font-mono text-[11px] text-[var(--ink-3)]">
                    {t('target', { count: TRANSCRIPTION_TARGET })}
                  </span>
                </div>
              )}
            </div>
            {step.id !== 'all' && (
              <div className="mt-1.5 flex gap-1.5 text-[12.5px] text-[var(--ink-3)]">
                <ArrowRight aria-hidden className="mt-0.5 size-3.5 shrink-0 text-[var(--gold-2)]" />
                <span>
                  {t(`unlocks.${step.id}`)}
                  {step.id === 'analysis' && coverage.analysedWithoutLink > 0 && (
                    <span className="block text-[var(--ink-4)]">
                      {t('elsewhere', { count: coverage.analysedWithoutLink })}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </StatsCard>
  );
}
