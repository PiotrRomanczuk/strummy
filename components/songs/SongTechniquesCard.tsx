import { getTranslations } from 'next-intl/server';

import type { Strength } from '@/lib/music-theory/song-techniques';
import { getSongTechniques } from '@/lib/services/song-techniques-queries';

import { Card, CardHeader } from './SongPrimitives';

type Props = { songId: string };

const STRENGTH_CLASS: Record<Strength, string> = {
  little: 'border-[var(--rule)] bg-[var(--card)]',
  regular: 'border-[var(--gold)] bg-[var(--card)]',
  lot: 'border-[var(--gold)] bg-[var(--gold-tint)]',
};

/**
 * Which playing techniques the song uses (#1206): a chip per technique with how much of the song it is. Counted
 * from a tablature, so it is a hint, not a transcription. Fetches its own data; for students too (the labels
 * are readable by anyone who can read the song). Gone when the song has no row or no technique worth showing.
 */
export const SongTechniquesCard = async ({ songId }: Props) => {
  const items = await getSongTechniques(songId);
  if (!items || items.length === 0) return null;

  const t = await getTranslations('Songs');

  return (
    <Card>
      <CardHeader eyebrow={t('techniquesEyebrow')} title={t('techniquesTitle')} />
      <div className="flex flex-col gap-3 px-6 pb-6">
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item.key}
              className={`flex items-baseline gap-1.5 rounded-md border px-2.5 py-1.5 ${STRENGTH_CLASS[item.strength]}`}
            >
              <span className="text-sm text-[var(--ink)]">{t(`techniqueName.${item.key}`)}</span>
              <span className="text-xs text-[var(--ink-3)]">
                {t(`techniqueStrength.${item.strength}`)}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--ink-3)]">{t('techniquesNote')}</p>
      </div>
    </Card>
  );
};
