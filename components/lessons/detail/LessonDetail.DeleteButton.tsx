'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { lessonGhostButton } from './lesson-detail.styles';

/** Red trash ghost button from the mockup's action bar — confirms, then deletes. */
export const LessonDeleteButton = ({ lessonId }: { lessonId: string }) => {
  const t = useTranslations('Lessons');
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setIsBusy(true);
    setError(null);
    const res = await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE' });
    setIsBusy(false);
    if (!res.ok) return setError(t('deleteFailed'));
    router.push('/dashboard/lessons');
    router.refresh();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={t('deleteLesson')}
          title={error ?? t('deleteLesson')}
          disabled={isBusy}
          style={{ ...lessonGhostButton, color: 'var(--danger)' }}
        >
          <Trash2 size={12} strokeWidth={1.6} />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteLessonTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteLessonDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={remove}>{t('deleteLesson')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
