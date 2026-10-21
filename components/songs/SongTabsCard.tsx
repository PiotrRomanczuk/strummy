import { getTranslations } from 'next-intl/server';

import { Card, CardHeader } from './SongPrimitives';

type Props = { tabs: string | null | undefined };

const isSectionHeader = (line: string): boolean => /^\s*\[.+\]\s*$/.test(line);

/**
 * Renders `songs.tab_notation` (riffs and solos imported from Ultimate Guitar
 * "tabs" pages) verbatim in monospace, so every string of the staff lines up.
 * `[Section]` headers become gold labels, as in the lyrics card. Returns null
 * when the song has no tablature.
 */
export const SongTabsCard = async ({ tabs }: Props) => {
  const text = tabs?.trim();
  if (!text) return null;

  const t = await getTranslations('Songs');

  return (
    <Card>
      <CardHeader eyebrow={t('tabsEyebrow')} title={t('tabsTitle')} />
      <div className="overflow-x-auto px-6 pb-6 font-mono text-[13px] leading-[1.6]">
        {text.split('\n').map((line, i) =>
          isSectionHeader(line) ? (
            <div
              key={i}
              className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--gold-2)] first:mt-0"
            >
              {line.replace(/[[\]]/g, '').trim()}
            </div>
          ) : (
            <div key={i} className="min-h-[1.6em] whitespace-pre text-[var(--ink-2)]">
              {line}
            </div>
          )
        )}
      </div>
    </Card>
  );
};
