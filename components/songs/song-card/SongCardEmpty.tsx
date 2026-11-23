import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { cardSection, hint } from './song-card.styles';

type Props = { songId: string; isTeacher: boolean };

/** No card to show: the song's recording has no analysis yet, or (for a student) it is not in their repertoire. */
export const SongCardEmpty = async ({ songId, isTeacher }: Props) => {
  const t = await getTranslations('SongCard');
  return (
    <section className={cardSection} data-testid="song-card-empty">
      <p className="font-serif text-xl text-[var(--ink)]">
        {t(isTeacher ? 'noAnalysisTitle' : 'noCardTitle')}
      </p>
      <p className={hint}>{t(isTeacher ? 'noAnalysisBody' : 'noCardBody')}</p>
      <Link
        href={`/dashboard/songs/${songId}`}
        className="self-start text-sm font-medium text-[var(--ink)] underline underline-offset-2"
      >
        {t('backToSong')}
      </Link>
    </section>
  );
};
