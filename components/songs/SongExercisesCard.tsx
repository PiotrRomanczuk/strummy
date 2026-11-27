import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { exerciseLink } from '@/components/songs/song-card/song-card-link.helpers';
import { listExercisesOfSong } from '@/lib/services/song-exercises';
import { exerciseListHref } from '@/schemas/ExerciseListParamsSchema';

import { Card, CardHeader } from './SongPrimitives';

/**
 * "Exercises from this song" (#1213): the parts of this song saved as exercises, each opening the card on its part
 * in a loop at its tempo. Staff only, like the library (RLS returns students nothing). Gone when the song has none.
 */
export const SongExercisesCard = async ({ songId }: { songId: string }) => {
  const exercises = await listExercisesOfSong(songId);
  if (exercises.length === 0) return null;

  const t = await getTranslations('Exercises');
  const cardPath = `/dashboard/songs/${songId}/card`;

  return (
    <Card>
      <CardHeader
        eyebrow={t('eyebrow')}
        title={t('fromThisSong')}
        action={
          <Link
            href={exerciseListHref({ song: songId })}
            className="text-[12px] text-[var(--ink-3)] underline underline-offset-2"
          >
            {t('seeInLibrary')}
          </Link>
        }
      />
      <ul className="flex flex-col px-6 pb-5">
        {exercises.map((exercise) => (
          <li
            key={exercise.id}
            className="flex items-center gap-3 border-b border-[var(--rule)] py-2.5 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-[var(--ink)]">{exercise.name}</div>
              <div className="font-mono text-[11px] text-[var(--ink-4)]">
                {t(`kinds.${exercise.kind}`)} ·{' '}
                {t('details', {
                  part: exercise.partN,
                  tempo: exercise.tempoPercent,
                  source: t(`sources.${exercise.source}`),
                })}
              </div>
            </div>
            <Link
              href={exerciseLink(cardPath, exercise)}
              aria-label={t('openNamed', { name: exercise.name })}
              className="shrink-0 rounded-md border border-[var(--rule)] px-2.5 py-1.5 text-[12.5px] text-[var(--ink-2)] no-underline hover:bg-[var(--rule-2)]"
            >
              {t('openShort')}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
};
