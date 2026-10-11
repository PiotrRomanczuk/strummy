'use client';

import { useTranslations } from 'next-intl';

import { FormAvatar } from '@/components/shared/FormAvatar';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';

type Props = {
  students: StudentOption[];
  song?: SongOption;
  title: string;
  dueDate: string;
  dailyTargetMinutes: number | null;
};

const formatDue = (iso: string, noDueDateLabel: string): string => {
  if (!iso) return noDueDateLabel;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return noDueDateLabel;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Claude Design preview: song in italic, student chips, "Due Apr 30 · 10 min/day". */
export const AssignmentCreatePreview = ({
  students,
  song,
  title,
  dueDate,
  dailyTargetMinutes,
}: Props) => {
  const t = useTranslations('Assignments');
  const heading = title || song?.title || '—';

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
        {heading}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>
        {song?.author ?? ''}
      </div>

      {students.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {students.map((stu) => (
            <span
              key={stu.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px 3px 4px',
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 999,
                fontSize: 11,
              }}
            >
              <FormAvatar name={stu.name} email={stu.email} color={stu.color} size={16} />
              {(stu.name ?? stu.email ?? '').split(' ')[0]}
            </span>
          ))}
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
        {dailyTargetMinutes
          ? ` · ${t('createFormMinPerDay', { minutes: dailyTargetMinutes })}`
          : ''}
      </div>
    </>
  );
};
