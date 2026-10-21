import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { QualityScorePill } from '@/components/data-quality/QualityScorePill';
import type { RecordQuality } from '@/lib/data-quality/quality.types';

import { Card, CardHeader } from './SongPrimitives';

const REPORT_PATH = '/dashboard/admin/data-quality';

type Props = { quality: RecordQuality; songId: string };

/** Admin-only: the song's data-quality score and what is missing, with fix links. */
export async function QualityCard({ quality, songId }: Props) {
  const t = await getTranslations('DataQuality');
  return (
    <Card>
      <CardHeader
        eyebrow={t('badgeEyebrow')}
        title={t(
          quality.band === 'good' ? 'bandGood' : quality.band === 'fair' ? 'bandFair' : 'bandPoor'
        )}
        action={
          <QualityScorePill score={quality.score} band={quality.band} label={t('badgeEyebrow')} />
        }
      />
      <div className="px-6 pb-5 text-xs text-[var(--ink-3)]">
        {quality.failedRuleIds.length === 0 ? (
          <p>{t('badgeAllGood')}</p>
        ) : (
          <ul className="space-y-2">
            {quality.failedRuleIds.map((ruleId) => (
              <li key={ruleId}>
                <Link
                  href={`/dashboard/songs/${songId}/edit`}
                  className="font-medium text-[var(--ink)] underline-offset-2 hover:underline"
                >
                  {t(`rules.${ruleId}.label`)}
                </Link>
                <span className="block text-[var(--ink-4)]">{t(`rules.${ruleId}.hint`)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={REPORT_PATH}
          className="mt-4 inline-block text-[var(--ink-4)] underline underline-offset-2"
        >
          {t('badgeOpenReport')}
        </Link>
      </div>
    </Card>
  );
}
