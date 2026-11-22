import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { LAB_PATH } from '@/components/lab/lab.helpers';
import { LabSources } from '@/components/lab/LabSources';
import { requireLabAdmin } from '@/lib/private-data/access';
import { loadManifest } from '@/lib/private-data/manifest';

export const metadata = { title: 'Lab' };

const COUNT_KEYS = [
  'entities',
  'entities_in_strummy',
  'entities_liked',
  'entities_with_tabs',
  'tabs',
] as const;

/** The Lab: the owner's private data hub, read from this Mac only, for the admin only. */
export default async function LabPage() {
  await requireLabAdmin(LAB_PATH);
  const manifest = loadManifest();
  if (!manifest) notFound();
  const t = await getTranslations('Lab');

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <p className="text-xs text-muted-foreground">{t('built', { date: manifest.built.replace('T', ' ') })}</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {COUNT_KEYS.filter((key) => key in manifest.counts).map((key) => (
          <div key={key} className="rounded-md border px-4 py-3">
            <dt className="text-xs text-muted-foreground">{t(`counts.${key}`)}</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {manifest.counts[key].toLocaleString('pl-PL')}
            </dd>
          </div>
        ))}
      </dl>
      <LabSources sources={manifest.sources} />
    </div>
  );
}
