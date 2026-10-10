'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { updateLessonSongs } from '@/app/dashboard/lessons/actions';
import type { SongOption } from '@/lib/services/lesson-form-data';
import { lessonGhostButton } from './lesson-detail.styles';

/** "+ Add song" ghost button; a transparent select on top picks from the library. */
export const LessonAddSong = ({
  lessonId,
  currentIds,
  library,
}: {
  lessonId: string;
  currentIds: string[];
  library: SongOption[];
}) => {
  const t = useTranslations('Lessons');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <label style={{ ...lessonGhostButton, position: 'relative', opacity: isPending ? 0.6 : 1 }}>
      <Plus size={11} strokeWidth={1.8} aria-hidden="true" /> {t('addSong')}
      <select
        aria-label={t('addSong')}
        value=""
        disabled={isPending}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return;
          startTransition(async () => {
            await updateLessonSongs(lessonId, [...currentIds, id]);
            router.refresh();
          });
        }}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
      >
        <option value="" />
        {library
          .filter((s) => !currentIds.includes(s.id))
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
              {s.author ? ` — ${s.author}` : ''}
            </option>
          ))}
      </select>
    </label>
  );
};
