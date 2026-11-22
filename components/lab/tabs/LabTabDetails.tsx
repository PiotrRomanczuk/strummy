import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { TabDetail, TabRow } from '@/lib/private-data/tabs.types';

import { LAB_PATH } from '../lab.helpers';
import { LabTabCopies } from './LabTabDetails.Copies';
import { LabTabFacts } from './LabTabDetails.Facts';
import { LabTabTexts } from './LabTabDetails.Texts';
import { LabTabTracks } from './LabTabTracks';

type Props = { tab: TabRow; detail: TabDetail | null };

/** What the file says about itself: header fields, parts with their bars, tracks, texts, origin. */
export async function LabTabDetails({ tab, detail }: Props) {
  const t = await getTranslations('Lab.tabs');
  return (
    <div className="space-y-6">
      <LabTabFacts tab={tab} detail={detail} />
      {tab.entity && (
        <Link href={`${LAB_PATH}/songs/${tab.entity}`} className="text-sm underline underline-offset-2">
          {t('openSong', { count: tab.versions })}
        </Link>
      )}
      {detail?.markers && detail.markers.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">{t('parts')}</h2>
          <ol className="flex flex-wrap gap-1.5 text-xs">
            {detail.markers.map((marker) => (
              <li key={`${marker.bar}-${marker.title}`} className="rounded border px-1.5 py-0.5 dark:border-input">
                <span className="mr-1 text-muted-foreground">{marker.bar}</span>
                {marker.title}
              </li>
            ))}
          </ol>
        </section>
      )}
      {detail?.tracks && detail.tracks.length > 0 && <LabTabTracks tracks={detail.tracks} />}
      {detail && <LabTabTexts detail={detail} />}
      {detail?.sources && <LabTabCopies sources={detail.sources} />}
    </div>
  );
}
