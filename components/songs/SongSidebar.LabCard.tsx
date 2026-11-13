import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { SongEntity } from '@/lib/private-data/private-data.types';

import { Card, CardHeader } from './SongPrimitives';

const LAB_SONGS_PATH = '/dashboard/admin/lab/songs';

type Props = { entity: SongEntity };

/** Admin only, local only: what the private data hub holds about this song, linking to the Lab. */
export async function LabCard({ entity }: Props) {
  const t = await getTranslations('Lab.card');
  const sourceCount = Object.keys(entity.sources).length;
  return (
    <Card>
      <CardHeader eyebrow={t('eyebrow')} title={t('title', { count: sourceCount })} />
      <div className="space-y-3 px-6 pb-5 text-xs text-[var(--ink-3)]">
        {entity.tabs > 0 && <p>{t('tabs', { count: entity.tabs })}</p>}
        <Link
          href={`${LAB_SONGS_PATH}/${entity.id}`}
          className="inline-block font-medium text-[var(--ink)] underline underline-offset-2"
        >
          {t('open')}
        </Link>
      </div>
    </Card>
  );
}
