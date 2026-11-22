import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { LabEntityHeader } from '@/components/lab/entity/LabEntityHeader';
import { LabEntitySection } from '@/components/lab/entity/LabEntitySection';
import { LAB_PATH } from '@/components/lab/lab.helpers';
import { requireLabAdmin } from '@/lib/private-data/access';
import { loadManifest, sourceLabels } from '@/lib/private-data/manifest';
import { getEntity } from '@/lib/private-data/songs';

export const metadata = { title: 'Lab · song' };

type PageProps = { params: Promise<{ id: string }> };

/** One song with every source's rows side by side, in manifest order. */
export default async function LabSongPage({ params }: PageProps) {
  const { id } = await params;
  await requireLabAdmin(`${LAB_PATH}/songs/${encodeURIComponent(id)}`);
  const [doc, manifest] = [getEntity(id), loadManifest()];
  if (!doc || !manifest) notFound();

  const t = await getTranslations('Lab.entity');
  const labels = sourceLabels(manifest);
  const order = [...labels.keys()];
  const sections = Object.entries(doc.sections).sort(
    ([a], [b]) => (order.indexOf(a) + 1 || order.length + 1) - (order.indexOf(b) + 1 || order.length + 1)
  );

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <LabEntityHeader entity={doc.entity} />
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map(([sourceId, value]) => (
          <LabEntitySection
            key={sourceId}
            sourceId={sourceId}
            label={labels.get(sourceId) ?? t(`extra.${sourceId === 'artist' ? 'artist' : 'other'}`)}
            value={value}
          />
        ))}
      </div>
    </div>
  );
}
