import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { songGhostButton } from './song-hero.styles';

type Props = { songId: string };

/** Ghost "Edit" button of the song hero's action row. */
export const SongHeroEditLink = async ({ songId }: Props) => {
  const t = await getTranslations('Songs');
  return (
    <Link
      href={`/dashboard/songs/${songId}/edit`}
      aria-label={t('editSongLink')}
      style={songGhostButton}
    >
      <Pencil size={12} strokeWidth={1.6} aria-hidden="true" /> {t('editShort')}
    </Link>
  );
};
