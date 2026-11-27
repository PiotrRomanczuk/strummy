import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { exerciseLink } from '@/components/songs/song-card/song-card-link.helpers';
import { eyebrow } from '@/components/songs/song-card/song-card.styles';
import type { SongExercise } from '@/schemas/SongExerciseSchema';

import { ExerciseDeleteButton } from './ExerciseList.DeleteButton';

/** One saved exercise: its name and kind, where it comes from, how to play it, and the way into the card. */
export const ExerciseRow = ({ exercise }: { exercise: SongExercise }) => {
  const t = useTranslations('Exercises');
  const href = exerciseLink(`/dashboard/songs/${exercise.songId}/card`, exercise);
  const song = [exercise.songTitle || t('untitledSong'), exercise.songAuthor]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex flex-col gap-2 border-b border-[var(--rule)] px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[15px] font-medium text-[var(--ink)]">{exercise.name}</span>
          <span className={eyebrow}>{t(`kinds.${exercise.kind}`)}</span>
        </div>
        <div className="truncate text-[13px] text-[var(--ink-3)]">{song}</div>
        <div className="font-mono text-[11.5px] text-[var(--ink-4)]">
          {t('details', {
            part: exercise.partN,
            tempo: exercise.tempoPercent,
            source: t(`sources.${exercise.source}`),
          })}
        </div>
        {exercise.note && (
          <p className="mt-1 text-[13px] leading-snug text-[var(--ink-2)]">{exercise.note}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={href}
          className="inline-flex h-9 items-center rounded-lg bg-[var(--ink)] px-3.5 text-[13px] font-medium text-[var(--paper)] no-underline"
        >
          {t('open')}
        </Link>
        <ExerciseDeleteButton exerciseId={exercise.id} name={exercise.name} />
      </div>
    </li>
  );
};
