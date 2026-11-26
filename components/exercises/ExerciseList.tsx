import { useTranslations } from 'next-intl';

import { cardSection, eyebrow, hint } from '@/components/songs/song-card/song-card.styles';
import type { SongExercise } from '@/schemas/SongExerciseSchema';

import { ExerciseRow } from './ExerciseList.Row';

/** The exercise library: every saved part of a song, newest first, with an empty state that says how to add one. */
export const ExerciseList = ({ exercises }: { exercises: SongExercise[] }) => {
  const t = useTranslations('Exercises');
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-5 px-4 pb-16 pt-6 sm:px-6">
      <header>
        <div className={eyebrow}>{t('eyebrow')}</div>
        <h1 className="mt-1 font-serif text-[40px] font-normal italic tracking-[-0.02em] text-[var(--ink)]">
          {t('title')}
        </h1>
        <p className={`${hint} mt-1.5`}>{t('count', { count: exercises.length })}</p>
      </header>
      {exercises.length === 0 ? (
        <div className={`${cardSection} items-center py-12 text-center`}>
          <p className="font-serif text-lg italic text-[var(--ink-3)]">{t('emptyTitle')}</p>
          <p className={`${hint} max-w-md`}>{t('emptyBody')}</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border border-[var(--rule)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          {exercises.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} />
          ))}
        </ul>
      )}
    </div>
  );
};
