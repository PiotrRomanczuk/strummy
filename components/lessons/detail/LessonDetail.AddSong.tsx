'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { updateLessonSongs } from '@/app/dashboard/lessons/actions';
import { SongSelect } from '@/components/songs/song-picker';
import type { SongOption } from '@/lib/services/lesson-form-data';
import { lessonGhostButton } from './lesson-detail.styles';

/** "+ Add song" ghost button; opens the searchable song picker over the library. */
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
    <SongSelect
      ariaLabel={t('addSong')}
      songs={library.filter((s) => !currentIds.includes(s.id))}
      value=""
      disabled={isPending}
      style={{ ...lessonGhostButton, opacity: isPending ? 0.6 : 1 }}
      onChange={(id) => {
        if (!id) return;
        startTransition(async () => {
          await updateLessonSongs(lessonId, [...currentIds, id]);
          router.refresh();
        });
      }}
    >
      <Plus size={11} strokeWidth={1.8} aria-hidden="true" /> {t('addSong')}
    </SongSelect>
  );
};
