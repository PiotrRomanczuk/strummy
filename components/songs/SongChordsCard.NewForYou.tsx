import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { ChordShape } from '@/lib/music-theory/chord-shape';

type Props = { shapes: ChordShape[] };

/**
 * For a student with the chord map on: the shapes of this song they have not
 * played in any other song, or that they know them all (#1140).
 */
export const SongChordsCardNewForYou = async ({ shapes }: Props) => {
  const t = await getTranslations('Songs');

  return (
    <div className="mx-6 mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-[var(--gold-dim)] bg-[var(--gold-tint)] px-3 py-2 text-sm text-[var(--ink-2)]">
      <span>
        {shapes.length > 0
          ? t('chordsNewForYou', { shapes: shapes.join(', ') })
          : t('chordsAllKnown')}
      </span>
      <Link
        href="/dashboard/chord-map"
        className="text-xs font-medium text-[var(--gold-2)] no-underline hover:underline"
      >
        {t('chordsMapLink')}
      </Link>
    </div>
  );
};
