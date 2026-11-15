import { getTranslations } from 'next-intl/server';

import type { TabDetail, TabRow } from '@/lib/private-data/tabs.types';

type Props = { tab: TabRow; detail: TabDetail | null };

/** The header fields of the file as a label/value list; empty values are left out. */
export async function LabTabFacts({ tab, detail }: Props) {
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
  return (
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
  );
}
