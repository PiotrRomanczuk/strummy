import Link from 'next/link';
import { PenLine } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { RuleSummary } from '@/lib/data-quality/quality.types';
import { FILL_RULE } from '@/lib/repertoire-stats/quality-list';

import { CardHead, StatsCard } from './RepertoireStatsPrimitives';
import { statsHref, type StatsParams } from './repertoire-stats.helpers';

type Props = { rules: RuleSummary[]; fillSongs: number; params: StatsParams };

const row = (isActive: boolean) =>
  `grid min-h-11 grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--rule-2)] px-4 py-2.5 text-inherit md:px-5 ${isActive ? 'bg-[var(--rule-2)]' : 'hover:bg-[var(--paper)]'}`;

/** Every rule that fails somewhere, heaviest impact first (weight × failing songs); a click filters the songs. */
export async function RepertoireStatsFixQueue({ rules, fillSongs, params }: Props) {
  const [t, dq] = await Promise.all([
    getTranslations('RepertoireStats.quality'),
    getTranslations('DataQuality'),
  ]);
  const link = (rule: string) =>
    statsHref(params, { rule: params.rule === rule ? null : rule, limit: 0 });
  return (
    <StatsCard className="pt-5">
      <div className="px-4 md:px-5">
        <CardHead title={t('queueTitle')} sub={t('queueHint')} />
      </div>
      {fillSongs > 0 && (
        <Link
          href={link(FILL_RULE)}
          aria-current={params.rule === FILL_RULE ? 'true' : undefined}
          className={row(params.rule === FILL_RULE)}
        >
          <PenLine aria-hidden className="size-3.5 text-[var(--gold-2)]" />
          <span className="min-w-0">
            <span className="font-medium">{t('fillRule')}</span>
            <span className="block text-[12px] text-[var(--ink-3)]">{t('fillRuleHint')}</span>
          </span>
          <span className="text-right font-mono text-[12px]">
            {t('fillSongs', { count: fillSongs })}
          </span>
        </Link>
      )}
      <ol aria-label={t('queueTitle')}>
        {rules.map((rule, index) => {
          const isActive = params.rule === rule.ruleId;
          const percent = Math.round((100 * rule.failing) / Math.max(rule.applicable, 1));
          return (
            <li key={rule.ruleId}>
              <Link
                href={link(rule.ruleId)}
                aria-current={isActive ? 'true' : undefined}
                className={row(isActive)}
              >
                <span className="font-mono text-[11px] text-[var(--ink-4)]">{index + 1}</span>
                <span className="min-w-0">
                  <span className="font-medium">{dq(`rules.${rule.ruleId}.label`)}</span>
                  {rule.isCritical && (
                    <span className="ml-2 rounded border border-[var(--danger)] px-1.5 text-[11px] text-[var(--danger)]">
                      {dq('critical')}
                    </span>
                  )}
                  <span className="block text-[12px] text-[var(--ink-3)]">
                    {dq(`dimension.${rule.dimension}`)} · {dq(`rules.${rule.ruleId}.hint`)}
                  </span>
                </span>
                <span className="text-right font-mono text-[12px]">
                  {dq('failingOf', { failing: rule.failing, applicable: rule.applicable })}
                  <span className="block text-[var(--ink-4)]">{percent}%</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </StatsCard>
  );
}
