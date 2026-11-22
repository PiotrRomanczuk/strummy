import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { LAB_PATH } from '@/components/lab/lab.helpers';
import { LabTabDetails } from '@/components/lab/tabs/LabTabDetails';
import { requireLabAdmin } from '@/lib/private-data/access';
import { getTab, getTabDetail } from '@/lib/private-data/tabs';

export const metadata = { title: 'Lab · tab' };

type PageProps = { params: Promise<{ sha1: string }> };

/** One tab: everything the file says about itself, and the file itself to download. */
export default async function LabTabPage({ params }: PageProps) {
  const { sha1 } = await params;
  await requireLabAdmin(`${LAB_PATH}/tabs/${encodeURIComponent(sha1)}`);
  const tab = getTab(sha1);
  if (!tab) notFound();

  const t = await getTranslations('Lab.tabs');
  const fileUrl = `/api/admin/lab/tabs/${tab.sha1}/file`;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header className="space-y-1">
        <Link href={`${LAB_PATH}/tabs`} className="text-sm text-muted-foreground underline-offset-2 hover:underline">
          ← {t('back')}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{tab.title || '—'}</h1>
        <p className="text-muted-foreground">{tab.artist}</p>
        <a href={fileUrl} download={tab.path.split('/').pop()} className="text-sm underline underline-offset-2">
          {t('download')}
        </a>
      </header>
      {tab.parse !== 'ok' && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">{t('oldFormat')}</p>
      )}
      <LabTabDetails tab={tab} detail={getTabDetail(tab.sha1)} />
    </div>
  );
}
