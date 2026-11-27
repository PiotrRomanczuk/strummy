import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import type { ExerciseSongOption } from '@/lib/services/song-exercises';
import type { ExerciseListParams } from '@/schemas/ExerciseListParamsSchema';
import { EXERCISE_KINDS, EXERCISE_NAME_MAX } from '@/schemas/SongExerciseSchema';

const field = 'flex min-w-0 flex-col gap-1 text-[12px] text-[var(--ink-3)]';
const select =
  'h-9 w-full min-w-0 rounded-md border border-[var(--rule)] bg-[var(--card)] px-2 text-[13px] text-[var(--ink)]';

/**
 * Narrows the library by name, kind and song. A plain GET form: the filter lives in the address, the server reads
 * it and pages in the query, so the list works without JavaScript and a filtered view can be bookmarked.
 */
export const ExerciseFilters = ({
  params,
  songs,
}: {
  params: ExerciseListParams;
  songs: ExerciseSongOption[];
}) => {
  const t = useTranslations('Exercises');
  const isFiltered = Boolean(params.kind || params.song || params.q);

  return (
    <form
      method="get"
      action="/dashboard/exercises"
      role="search"
      aria-label={t('filtersLabel')}
      className="grid gap-3 sm:grid-cols-[1fr_180px_220px_auto] sm:items-end"
    >
      <div className={field}>
        <label htmlFor="exercise-filter-q">{t('searchLabel')}</label>
        <Input
          id="exercise-filter-q"
          type="search"
          name="q"
          defaultValue={params.q ?? ''}
          maxLength={EXERCISE_NAME_MAX}
          placeholder={t('searchPlaceholder')}
          className="bg-[var(--card)] text-[13px]"
        />
      </div>
      <div className={field}>
        <label htmlFor="exercise-filter-kind">{t('kindLabel')}</label>
        <select
          name="kind"
          id="exercise-filter-kind"
          defaultValue={params.kind ?? ''}
          className={select}
        >
          <option value="">{t('allKinds')}</option>
          {EXERCISE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`kinds.${kind}`)}
            </option>
          ))}
        </select>
      </div>
      <div className={field}>
        <label htmlFor="exercise-filter-song">{t('songLabel')}</label>
        <select
          name="song"
          id="exercise-filter-song"
          defaultValue={params.song ?? ''}
          className={select}
        >
          <option value="">{t('allSongs')}</option>
          {songs.map((song) => (
            <option key={song.id} value={song.id}>
              {song.title || t('untitledSong')}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-lg bg-[var(--ink)] px-3.5 text-[13px] font-medium text-[var(--paper)]"
        >
          {t('filter')}
        </button>
        {isFiltered && (
          <Link
            href="/dashboard/exercises"
            className="text-[12.5px] text-[var(--ink-3)] underline underline-offset-2"
          >
            {t('clearFilters')}
          </Link>
        )}
      </div>
    </form>
  );
};
