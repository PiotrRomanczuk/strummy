import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { cardSection, eyebrow, hint } from '@/components/songs/song-card/song-card.styles';
import type { ExerciseSongOption } from '@/lib/services/song-exercises';
import type { ExerciseListParams } from '@/schemas/ExerciseListParamsSchema';
import type { SongExercise } from '@/schemas/SongExerciseSchema';

import { ExerciseFilters } from './ExerciseList.Filters';
import { ExercisePager } from './ExerciseList.Pager';
import { ExerciseRow } from './ExerciseList.Row';

interface Props {
  /** This page's exercises. */
  exercises: SongExercise[];
  /** Exercises matching the filter across every page. */
  total: number;
  params: ExerciseListParams;
  /** Songs that have exercises, for the song filter. */
  songs: ExerciseSongOption[];
}

/** The exercise library: saved parts of songs, newest first, filtered and paged on the server (#1213). */
export const ExerciseList = ({ exercises, total, params, songs }: Props) => {
  const t = useTranslations('Exercises');
  const isFiltered = Boolean(params.kind || params.song || params.q);
  const isLibraryEmpty = total === 0 && !isFiltered;

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-5 px-4 pb-16 pt-6 sm:px-6">
      <header>
        <div className={eyebrow}>{t('eyebrow')}</div>
        <h1 className="mt-1 font-serif text-[40px] font-normal italic tracking-[-0.02em] text-[var(--ink)]">
          {t('title')}
        </h1>
        <p className={`${hint} mt-1.5`}>{t('count', { count: total })}</p>
      </header>
      {!isLibraryEmpty && <ExerciseFilters params={params} songs={songs} />}
      {exercises.length === 0 ? (
        <div className={`${cardSection} items-center py-12 text-center`}>
          <p className="font-serif text-lg italic text-[var(--ink-3)]">
            {isLibraryEmpty ? t('emptyTitle') : t('noMatchTitle')}
          </p>
          {isLibraryEmpty ? (
            <p className={`${hint} max-w-md`}>{t('emptyBody')}</p>
          ) : (
            <Link href="/dashboard/exercises" className={`${hint} underline underline-offset-2`}>
              {t('clearFilters')}
            </Link>
          )}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border border-[var(--rule)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          {exercises.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} />
          ))}
        </ul>
      )}
      <ExercisePager params={params} total={total} />
    </div>
  );
};
