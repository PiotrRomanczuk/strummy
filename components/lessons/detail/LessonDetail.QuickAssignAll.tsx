'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { bulkAssignSongsFromLesson } from '@/app/dashboard/lessons/actions';

/** Dashed "Quick-assign from all N songs" — homework for every song in the lesson. */
export const LessonQuickAssignAll = ({
  lessonId,
  studentId,
  songs,
  hasRows,
}: {
  lessonId: string;
  studentId: string;
  songs: { id: string; title: string }[];
  hasRows: boolean;
}) => {
  const t = useTranslations('Lessons');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await bulkAssignSongsFromLesson(lessonId, songs, studentId);
          router.refresh();
        })
      }
      style={{
        width: '100%',
        marginBottom: hasRows ? 14 : 0,
        padding: '10px 12px',
        border: '1px dashed var(--rule)',
        borderRadius: 8,
        background: 'transparent',
        color: 'var(--gold-2)',
        fontSize: 12,
        cursor: isPending ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'var(--sans)',
      }}
    >
      <Copy size={12} strokeWidth={1.6} aria-hidden="true" />
      {t('quickAssignAll', { count: songs.length })}
    </button>
  );
};
