'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Card, CardHeader } from './SongPrimitives';
import { assignSongToStudentsAction } from '@/app/actions/repertoire';
import {
  StudentPicker,
  type StudentPickerOption,
} from '@/components/users/student-picker/StudentPicker';

type Props = {
  songId: string;
  students: StudentPickerOption[];
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  fontSize: 13,
};

/**
 * Teacher/admin-only "assign this song to N students as homework" widget.
 * Lives in the sidebar with an anchor (`#quick-assign`) so the header's
 * "+ Assign to student" button can scroll straight to it.
 */
export const QuickAssignCard = ({ songId, students }: Props) => {
  const t = useTranslations('Songs');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (students.length === 0) return null;

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    const result = await assignSongToStudentsAction({
      song_id: songId,
      student_ids: selectedIds,
      due_date: dueDate || null,
      goal_text: goal || null,
    });
    setIsSubmitting(false);

    if ('error' in result) {
      toast.error(result.error);
      return;
    }

    toast.success(t('quickAssignSuccess', { count: result.assignedCount }));
    setSelectedIds([]);
    setDueDate('');
    setGoal('');
  };

  return (
    <Card>
      <div id="quick-assign">
        <CardHeader eyebrow={t('quickAssignEyebrow')} title={t('quickAssignTitle')} />
        <div style={{ padding: '0 24px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StudentPicker students={students} selectedIds={selectedIds} onChange={setSelectedIds} />

          <div>
            <label
              htmlFor="quick-assign-due-date"
              style={{
                display: 'block',
                fontSize: 11,
                color: 'var(--ink-4)',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
              }}
            >
              {t('quickAssignDueDate')}
            </label>
            <input
              id="quick-assign-due-date"
              type="date"
              data-testid="quick-assign-due-date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="quick-assign-goal"
              style={{
                display: 'block',
                fontSize: 11,
                color: 'var(--ink-4)',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
              }}
            >
              {t('quickAssignGoal')}
            </label>
            <input
              id="quick-assign-goal"
              type="text"
              data-testid="quick-assign-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t('quickAssignGoalPlaceholder')}
              style={inputStyle}
            />
          </div>

          <button
            type="button"
            data-testid="quick-assign-submit"
            onClick={handleSubmit}
            disabled={selectedIds.length === 0 || isSubmitting}
            style={{
              padding: '8px 14px',
              background: selectedIds.length === 0 ? 'var(--rule)' : 'var(--ink)',
              color: 'var(--ivory)',
              border: 'none',
              borderRadius: 6,
              cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 12,
            }}
          >
            {selectedIds.length === 0
              ? t('quickAssignSubmitEmpty')
              : t('quickAssignSubmit', { count: selectedIds.length })}
          </button>
        </div>
      </div>
    </Card>
  );
};
