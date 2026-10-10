'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Card, CardHeader } from './SongPrimitives';
import { assignSongToStudentsAction } from '@/app/actions/repertoire';
import type { StudentPickerOption } from '@/components/users/student-picker/StudentPicker';
import { QaStudents } from '@/components/assignments/list/QuickAssign.Fields';

type Props = {
  songId: string;
  students: StudentPickerOption[];
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  fontSize: 13,
  background: 'var(--card)',
  color: 'var(--ink)',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  marginBottom: 4,
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
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 8,
            }}
          >
            <div style={{ ...labelStyle, fontSize: 12, marginBottom: 8 }}>
              {t('quickAssignToStudents')}
            </div>
            <QaStudents
              students={students}
              selectedIds={selectedIds}
              addLabel={t('quickAssignAddStudent')}
              onAdd={(id) => setSelectedIds((ids) => [...ids, id])}
              onRemove={(id) => setSelectedIds((ids) => ids.filter((x) => x !== id))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label htmlFor="quick-assign-due-date" style={labelStyle}>
                {t('quickAssignDueDate')}
              </label>
              <input
                id="quick-assign-due-date"
                type="date"
                data-testid="quick-assign-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'var(--mono)' }}
              />
            </div>
            <div>
              <label htmlFor="quick-assign-goal" style={labelStyle}>
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
          </div>

          <button
            type="button"
            data-testid="quick-assign-submit"
            onClick={handleSubmit}
            disabled={selectedIds.length === 0 || isSubmitting}
            style={{
              width: '100%',
              padding: 12,
              background: 'var(--ink)',
              color: 'var(--paper)',
              border: 'none',
              borderRadius: 8,
              cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedIds.length === 0 ? 0.5 : 1,
              fontFamily: 'var(--sans)',
              fontSize: 13,
              fontWeight: 500,
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
