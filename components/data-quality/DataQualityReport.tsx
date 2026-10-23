import { getTranslations } from 'next-intl/server';

import type { CollectionQuality } from '@/lib/data-quality/quality.types';

import { DataQualityReportFixQueue } from './DataQualityReport.FixQueue';
import { DataQualityReportRecords, type QualityRecordRow } from './DataQualityReport.Records';
import { DataQualityReportSummary } from './DataQualityReport.Summary';

export const DATA_QUALITY_PATH = '/dashboard/admin/data-quality';
const MAX_ROWS = 100;

type Props = {
  quality: CollectionQuality;
  activeRuleId: string | null;
  /** Turns a scored record id into a displayable row (title, edit link). */
  toRow: (id: string) => Omit<QualityRecordRow, 'quality'> | null;
};

export async function DataQualityReport({ quality, activeRuleId, toRow }: Props) {
  const t = await getTranslations('DataQuality');
  const ruleId = quality.fixQueue.some((r) => r.ruleId === activeRuleId) ? activeRuleId : null;
  const matching = ruleId
    ? quality.records.filter((r) => r.failedRuleIds.includes(ruleId))
    : quality.records.filter((r) => r.failedRuleIds.length > 0);
  const rows = matching.slice(0, MAX_ROWS).flatMap((record) => {
    const row = toRow(record.id);
    return row ? [{ ...row, quality: record }] : [];
  });

  return (
    <div className="space-y-6">
      <nav className="flex gap-2 text-sm" aria-label={t('title')}>
        <span className="rounded-full bg-foreground px-3 py-1 text-background">
          {t('entitySongs')}
        </span>
        {(['entityLessons', 'entityStudents'] as const).map((key) => (
          <span key={key} className="rounded-full border px-3 py-1 text-muted-foreground">
            {t(key)} · {t('comingNext')}
          </span>
        ))}
      </nav>
      <DataQualityReportSummary quality={quality} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <DataQualityReportFixQueue
          fixQueue={quality.fixQueue}
          activeRuleId={ruleId}
          basePath={DATA_QUALITY_PATH}
        />
        <DataQualityReportRecords
          rows={rows}
          total={matching.length}
          activeRuleId={ruleId}
          basePath={DATA_QUALITY_PATH}
        />
      </div>
    </div>
  );
}
