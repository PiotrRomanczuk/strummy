'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui/alert-dialog';

type Props = {
  userId: string;
  isArchived: boolean;
};

const linkClass =
  'inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[var(--ink-3)] hover:text-[var(--ink)] disabled:cursor-wait';

/**
 * Archive / restore a student from their card (#1178). Archiving keeps the
 * history and the account; it only moves the student out of the active list.
 * The PUT goes through `teacher_update_student` for a teacher.
 */
export const ArchiveStudentButton = ({ userId, isArchived }: Props) => {
  const t = useTranslations('Users');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const save = useCallback(
    (studentStatus: 'active' | 'archived') => {
      setError('');
      startTransition(async () => {
        const res = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentStatus }),
        });
        if (!res.ok) {
          setError(t('archiveStudentError'));
          return;
        }
        setIsOpen(false);
        router.refresh();
      });
    },
    [userId, router, t]
  );

  if (isArchived) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          className={linkClass}
          disabled={isPending}
          onClick={() => save('active')}
        >
          {t('restoreStudentButton')}
        </button>
        {error && <span className="text-[var(--danger)]">{error}</span>}
      </span>
    );
  }

  return (
    <>
      <button type="button" className={linkClass} onClick={() => setIsOpen(true)}>
        {t('archiveStudentButton')}
      </button>
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('archiveStudentDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('archiveStudentDialogDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                // Keep the dialog open until the save answers.
                e.preventDefault();
                save('archived');
              }}
            >
              {t('archiveStudentButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
