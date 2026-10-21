import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RuleSummary } from '@/lib/data-quality/quality.types';

type Props = { fixQueue: RuleSummary[]; activeRuleId: string | null; basePath: string };

export async function DataQualityReportFixQueue({ fixQueue, activeRuleId, basePath }: Props) {
  const t = await getTranslations('DataQuality');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('fixQueueTitle')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('fixQueueHint')}</p>
      </CardHeader>
      <CardContent className="p-0">
        {fixQueue.length === 0 && (
          <p className="px-6 pb-4 text-sm text-muted-foreground">{t('noIssues')}</p>
        )}
        <ol className="divide-y" aria-label={t('fixQueueTitle')}>
          {fixQueue.map((rule, index) => {
            const isActive = rule.ruleId === activeRuleId;
            const percent = Math.round((100 * rule.failing) / Math.max(rule.applicable, 1));
            return (
              <li key={rule.ruleId}>
                <Link
                  href={isActive ? basePath : `${basePath}?rule=${rule.ruleId}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex items-center gap-3 px-6 py-3 text-sm hover:bg-muted/60 ${isActive ? 'bg-muted' : ''}`}
                >
                  <span className="w-5 font-mono text-xs text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{t(`rules.${rule.ruleId}.label`)}</span>
                    {rule.isCritical && (
                      <span className="ml-2 rounded bg-destructive/15 px-1.5 text-xs text-destructive">
                        {t('critical')}
                      </span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {t(`dimension.${rule.dimension}`)} · {t(`rules.${rule.ruleId}.hint`)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-mono text-xs tabular-nums">
                    {t('failingOf', { failing: rule.failing, applicable: rule.applicable })}
                    <span className="block text-muted-foreground">{percent}%</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
