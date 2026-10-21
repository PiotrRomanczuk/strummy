import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RecordQuality } from '@/lib/data-quality/quality.types';

import { QualityScorePill } from './QualityScorePill';

export type QualityRecordRow = {
  quality: RecordQuality;
  title: string;
  subtitle: string | null;
  editHref: string;
};

type Props = {
  rows: QualityRecordRow[];
  total: number;
  activeRuleId: string | null;
  basePath: string;
};

export async function DataQualityReportRecords({ rows, total, activeRuleId, basePath }: Props) {
  const t = await getTranslations('DataQuality');
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">
          {activeRuleId
            ? t('recordsFiltered', { rule: t(`rules.${activeRuleId}.label`) })
            : t('recordsTitle')}
        </CardTitle>
        {activeRuleId && (
          <Link href={basePath} className="text-xs underline underline-offset-2">
            {t('clearFilter')}
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {rows.map(({ quality, title, subtitle, editHref }) => (
            <li key={quality.id} className="flex items-start gap-3 px-6 py-3 text-sm">
              <QualityScorePill score={quality.score} band={quality.band} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{title}</p>
                {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                <p className="mt-1 flex flex-wrap gap-1">
                  {quality.failedRuleIds.map((ruleId) => (
                    <span key={ruleId} className="rounded bg-muted px-1.5 text-xs">
                      {t(`rules.${ruleId}.label`)}
                    </span>
                  ))}
                </p>
              </div>
              <Link
                href={editHref}
                className="shrink-0 text-xs font-medium underline underline-offset-2"
              >
                {t('edit')}
              </Link>
            </li>
          ))}
        </ul>
        {total > rows.length && (
          <p className="px-6 py-3 text-xs text-muted-foreground">
            {t('showingFirst', { shown: rows.length, total })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
