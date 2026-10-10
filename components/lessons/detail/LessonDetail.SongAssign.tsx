'use client';

import { useState, useTransition } from 'react';
import { Check, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { quickAssignSongFromLesson } from '@/app/dashboard/lessons/actions';

/** The row's "+" — assign this song to the student as homework, in one click. */
export const LessonSongAssign = ({
  lessonId,
  songId,
  songTitle,
  studentId,
}: {
  lessonId: string;
  songId: string;
  songTitle: string;
  studentId: string;
}) => {
  const t = useTranslations('Lessons');
  const [isDone, setIsDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      title={isDone ? t('assignedAsHomework') : t('assignAsHomework')}
      aria-label={isDone ? t('assignedAsHomework') : t('assignAsHomework')}
      disabled={isPending || isDone}
      onClick={() =>
        startTransition(async () => {
          const res = await quickAssignSongFromLesson(lessonId, songId, songTitle, studentId);
          if ('success' in res || 'alreadyExists' in res) setIsDone(true);
        })
      }
      style={{
        padding: '6px 8px',
        background: 'transparent',
        border: 'none',
        color: isDone ? 'var(--success)' : 'var(--ink-4)',
        cursor: isPending ? 'wait' : 'pointer',
        borderRadius: 6,
      }}
    >
      {isDone ? <Check size={14} /> : <Plus size={14} />}
    </button>
  );
};
