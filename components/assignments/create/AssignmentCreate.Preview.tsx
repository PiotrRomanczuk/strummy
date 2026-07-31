'use client';

import { useTranslations } from 'next-intl';

import { FormAvatar } from '@/components/_ui/FormAvatar';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';

type Props = {
  student?: StudentOption;
  song?: SongOption;
  dueDate: string;
};

const formatDue = (iso: string, noDueDateLabel: string): string => {
  if (!iso) return noDueDateLabel;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return noDueDateLabel;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Live-preview sidebar content for the assignment form. */
export const AssignmentCreatePreview = ({ student, song, dueDate }: Props) => {
  const t = useTranslations('Assignments');

  return (
    <>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
          fontSize: 20,
          fontWeight: 500,
          marginBottom: 6,
        }}
      >
        {song ? song.title : '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>
        {song?.author ?? ''}
      </div>

      {student && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <FormAvatar name={student.name} email={student.email} size={22} />
          <span style={{ fontSize: 12 }}>{student.name ?? student.email}</span>
        </div>
      )}

      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--rule)',
          fontSize: 12,
          color: 'var(--ink-3)',
        }}
      >
        {t('previewDueLabel')}{' '}
        <strong style={{ color: 'var(--ink-2)' }}>
          {formatDue(dueDate, t('previewNoDueDate'))}
        </strong>
      </div>
    </>
  );
};
