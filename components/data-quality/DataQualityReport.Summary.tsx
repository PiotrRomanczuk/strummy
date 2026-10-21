import { getTranslations } from 'next-intl/server';

import { Card, CardContent } from '@/components/ui/card';
import type { CollectionQuality, QualityBand } from '@/lib/data-quality/quality.types';

import { BAND_LABEL_KEY, BAND_PILL_CLASS } from './data-quality.styles';

const BANDS: QualityBand[] = ['good', 'fair', 'poor'];

export async function DataQualityReportSummary({ quality }: { quality: CollectionQuality }) {
  const t = await getTranslations('DataQuality');
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card>
        <CardContent className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">{t('averageScore')}</p>
          <p className="font-mono text-3xl font-semibold tabular-nums">{quality.averageScore}</p>
          <p className="text-xs text-muted-foreground">
            {t('recordsCount', { count: quality.total })}
          </p>
        </CardContent>
      </Card>
      {BANDS.map((band) => (
        <Card key={band}>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-muted-foreground">{t(BAND_LABEL_KEY[band])}</p>
            <p className="font-mono text-3xl font-semibold tabular-nums">{quality.bands[band]}</p>
            <span className={`inline-block rounded-full px-2 text-xs ${BAND_PILL_CLASS[band]}`}>
              {quality.total === 0 ? 0 : Math.round((100 * quality.bands[band]) / quality.total)}%
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
