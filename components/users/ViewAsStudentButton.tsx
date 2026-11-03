'use client';

import { useState, useTransition } from 'react';
import { Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { startViewAsStudent } from '@/app/dashboard/view-as-actions';

/** Admin only (the caller decides): open the student's own dashboard, read-only. */
export const ViewAsStudentButton = ({ studentId }: { studentId: string }) => {
  const t = useTranslations('ViewAs');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const open = () =>
    startTransition(async () => {
      setError(null);
      // On success the action redirects to /dashboard, so only errors return.
      const result = await startViewAsStudent(studentId);
      if (result?.error) setError(result.error);
    });

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        data-testid="view-as-student"
        onClick={open}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-3)] hover:text-[var(--ink)] disabled:opacity-50"
      >
        <Eye size={13} aria-hidden="true" /> {isPending ? t('working') : t('button')}
      </button>
      {error && <span className="text-[12px] text-[var(--danger)]">{error}</span>}
    </span>
  );
};
