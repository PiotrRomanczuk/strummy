import { getTranslations } from 'next-intl/server';

import type { TabDetail } from '@/lib/private-data/tabs.types';

type Props = { sources: NonNullable<TabDetail['sources']> };

/** Where each copy of the file came from: collection, path, archive member. */
export async function LabTabCopies({ sources }: Props) {
  const t = await getTranslations('Lab.tabs');
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground">{t('copies', { count: sources.length })}</summary>
      <ul className="mt-2 space-y-0.5 break-all font-mono text-xs">
        {sources.map(([collection, path, member]) => (
          <li key={`${collection}/${path}/${member ?? ''}`}>
            {collection}/{path}
            {member ? ` → ${member}` : ''}
          </li>
        ))}
      </ul>
    </details>
  );
}
