import { getTranslations } from 'next-intl/server';

import type { TabDetail } from '@/lib/private-data/tabs.types';

type Props = { detail: TabDetail };

/** The transcriber's notes and instructions, and the lyrics folded away. */
export async function LabTabTexts({ detail }: Props) {
  const t = await getTranslations('Lab.tabs');
  const texts = [detail.instructions, ...(detail.notice ?? [])].filter((text) => text && text.trim());
  return (
    <>
      {texts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">{t('texts')}</h2>
          <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-xs dark:bg-muted/50">{texts.join('\n\n')}</pre>
        </section>
      )}
      {detail.lyrics && detail.lyrics.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{t('lyrics')}</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{detail.lyrics.join('\n\n')}</pre>
        </details>
      )}
    </>
  );
}
