import Link from 'next/link';
import { PenLine, Sparkles, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { RuleSummary } from '@/lib/data-quality/quality.types';
import { AI_RULE, FILL_RULE } from '@/lib/repertoire-stats/quality-list';

import { CardHead, StatsCard } from './RepertoireStatsPrimitives';
import { statsHref, type StatsParams } from './repertoire-stats.helpers';

type Props = { rules: RuleSummary[]; fillSongs: number; aiSongs: number; params: StatsParams };

/** How proposals are made: on a home machine, never by the app (SNG-15). */
const SUGGEST_COMMAND =
  'npx tsx scripts/backfill/2026-11-song-suggestions.ts --field all --model claude --commit --remote';

const row = (isActive: boolean) =>
  `grid min-h-11 grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--rule-2)] px-4 py-2.5 text-inherit md:px-5 ${isActive ? 'bg-[var(--rule-2)]' : 'hover:bg-[var(--paper)]'}`;

function ShortcutRow({
  href,
  isActive,
  icon: Icon,
  title,
  hint,
  count,
}: {
  href: string;
  isActive: boolean;
  icon: LucideIcon;
  title: string;
  hint: string;
  count: string;
}) {
  return (
    <Link href={href} aria-current={isActive ? 'true' : undefined} className={row(isActive)}>
      <Icon aria-hidden className="size-3.5 text-[var(--gold-2)]" />
      <span className="min-w-0">
        <span className="font-medium">{title}</span>
        <span className="block text-[12px] text-[var(--ink-3)]">{hint}</span>
      </span>
      <span className="text-right font-mono text-[12px]">{count}</span>
    </Link>
  );
}

/** Every rule that fails somewhere, heaviest impact first (weight × failing songs); a click filters the songs. */
export async function RepertoireStatsFixQueue({ rules, fillSongs, aiSongs, params }: Props) {
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
        <ShortcutRow
          href={link(FILL_RULE)}
          isActive={params.rule === FILL_RULE}
          icon={PenLine}
          title={t('fillRule')}
          hint={t('fillRuleHint')}
          count={t('fillSongs', { count: fillSongs })}
        />
      )}
      {aiSongs > 0 && (
        <ShortcutRow
          href={link(AI_RULE)}
          isActive={params.rule === AI_RULE}
          icon={Sparkles}
          title={t('aiRule')}
          hint={t('aiRuleHint')}
          count={t('fillSongs', { count: aiSongs })}
        />
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
      <div className="border-t border-[var(--rule-2)] px-4 py-3 text-[12px] text-[var(--ink-3)] md:px-5">
        <span className="block">{t('aiHowTo')}</span>
        <code className="mt-1 block break-all rounded bg-[var(--paper)] px-2 py-1 font-mono text-[11px] text-[var(--ink-2)]">
          {SUGGEST_COMMAND}
        </code>
      </div>
    </StatsCard>
  );
}
