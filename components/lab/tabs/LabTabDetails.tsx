import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { TabDetail, TabRow } from '@/lib/private-data/private-data.types';

import { LAB_PATH } from '../lab.helpers';
import { LabTabTracks } from './LabTabTracks';

type Props = { tab: TabRow; detail: TabDetail | null };

/** What the file says about itself: header fields, parts with their bars, tracks, texts, origin. */
export async function LabTabDetails({ tab, detail }: Props) {
  const t = await getTranslations('Lab.tabs');
  const facts: [string, string | number | null | undefined][] = [
    [t('format'), `${tab.format}${detail?.version ? ` (${detail.version})` : ''}`],
    [t('columnTempo'), tab.tempo],
    [t('columnBars'), tab.measures],
    [t('metre'), detail?.time_signatures?.join(', ')],
    [t('album'), detail?.album],
    [t('transcriber'), detail?.tab],
    [t('exercise'), tab.exercise && `${tab.exercise.category} · ${tab.exercise.topic}`],
  ];
  const texts = [detail?.instructions, ...(detail?.notice ?? [])].filter((text) => text && text.trim());
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        {facts
          .filter(([, value]) => value !== null && value !== undefined && value !== '')
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
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
      {texts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">{t('texts')}</h2>
          <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-xs dark:bg-muted/50">{texts.join('\n\n')}</pre>
        </section>
      )}
      {detail?.lyrics && detail.lyrics.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{t('lyrics')}</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{detail.lyrics.join('\n\n')}</pre>
        </details>
      )}
      {detail?.sources && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{t('copies', { count: detail.sources.length })}</summary>
          <ul className="mt-2 space-y-0.5 break-all font-mono text-xs">
            {detail.sources.map(([collection, path, member]) => (
              <li key={`${collection}/${path}/${member ?? ''}`}>
                {collection}/{path}
                {member ? ` → ${member}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
