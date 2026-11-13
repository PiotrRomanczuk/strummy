import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import type { HubSource } from '@/lib/private-data/private-data.types';

import { formatBytes, LAB_PATH, SOURCE_GROUPS } from './lab.helpers';

type Props = { sources: HubSource[] };

/** Every source of the hub, grouped: what it is, how big, how fresh, under which licence. */
export async function LabSources({ sources }: Props) {
  const t = await getTranslations('Lab');
  return (
    <div className="space-y-8">
      {SOURCE_GROUPS.map((group) => {
        const inGroup = sources.filter((source) => source.group === group);
        if (inGroup.length === 0) return null;
        return (
          <section key={group} className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">{t(`groups.${group}`)}</h2>
            <ul className="divide-y rounded-md border">
              {inGroup.map((source) => (
                <li key={source.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`${LAB_PATH}/sources/${source.id}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {source.label}
                    </Link>
                    <p className="text-sm text-muted-foreground">{source.description}</p>
                  </div>
                  <dl className="grid shrink-0 grid-cols-3 gap-x-4 text-xs text-muted-foreground sm:w-80">
                    <dt className="sr-only">{t('columns.rows')}</dt>
                    <dd>{t('results', { count: source.rows })}</dd>
                    <dt className="sr-only">{t('columns.size')}</dt>
                    <dd>{formatBytes(source.bytes)}</dd>
                    <dt className="sr-only">{t('columns.modified')}</dt>
                    <dd>{source.modified.slice(0, 10)}</dd>
                  </dl>
                  <Badge variant="outline" className="w-fit shrink-0 text-[11px]">
                    {source.license}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
