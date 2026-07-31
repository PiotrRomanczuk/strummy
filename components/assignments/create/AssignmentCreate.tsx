'use client';

import Link from 'next/link';
import { useState } from 'react';

import { formStyles as s } from '@/components/shared/form-styles';
import { FormSection } from '@/components/shared/FormSection';
import { FormPreviewPanel } from '@/components/shared/FormPreviewPanel';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';
import { AssignmentAI } from '@/components/assignments/form/AssignmentAI';
import { ChecklistEditor } from '@/components/assignments/checklist/ChecklistEditor';
import { ChordDrillEditor } from '@/components/assignments/chord-drill/ChordDrillEditor';
import { TemplatePicker } from '@/components/assignments/create/TemplatePicker';
import { AssignmentCreateFields } from './AssignmentCreate.Fields';
import { AssignmentCreatePreview } from './AssignmentCreate.Preview';
import { AssignmentSubmissionTypeToggle } from './AssignmentCreate.SubmissionType';
import { useAssignmentFormSubmit } from './useAssignmentFormSubmit';
import type { ChecklistItem, SubmissionType } from '@/schemas/AssignmentSchema';
import type { AssignmentTemplateRow } from '@/lib/services/assignment-template-queries';
import { SHOW_AI_FEATURES } from '@/lib/config/features';

const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

type Props = {
  mode: 'create' | 'edit';
  students: StudentOption[];
  songs: SongOption[];
  templates?: AssignmentTemplateRow[];
  /** Create-mode prefill, e.g. arriving from a lesson's "add homework" action. */
  defaultStudentId?: string;
  initial?: {
    assignmentId: string;
    studentId: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    songId: string | null;
    checklist?: ChecklistItem[];
    chordIds?: string[];
    dailyTargetMinutes?: number | null;
    submissionType?: SubmissionType;
  };
};

export const AssignmentCreate = ({
  mode,
  students,
  songs,
  templates,
  defaultStudentId,
  initial,
}: Props) => {
  const [studentId, setStudentId] = useState(initial?.studentId ?? defaultStudentId ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueDate, setDueDate] = useState(toDateInput(initial?.dueDate ?? null));
  const [songId, setSongId] = useState(initial?.songId ?? '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initial?.checklist ?? []);
  const [chordIds, setChordIds] = useState<string[]>(initial?.chordIds ?? []);
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState<number | null>(
    initial?.dailyTargetMinutes ?? null
  );
  const [submissionType, setSubmissionType] = useState<SubmissionType>(
    initial?.submissionType ?? 'self_report'
  );
  const [alsoSaveAsTemplate, setAlsoSaveAsTemplate] = useState(false);

  const applyTemplate = (t: AssignmentTemplateRow) => {
    setTitle(t.title);
    setDescription(t.description ?? '');
    setChecklist(t.checklist);
  };

  const { error, fieldErrors, isSaving, handleSubmit, clearFieldError } = useAssignmentFormSubmit({
    mode,
    initialAssignmentId: initial?.assignmentId,
    studentId,
    title,
    description,
    dueDate,
    songId,
    checklist,
    chordIds,
    dailyTargetMinutes,
    submissionType,
    alsoSaveAsTemplate,
  });

  const selectedStudent = students.find((stu) => stu.id === studentId);
  const selectedSong = songs.find((song) => song.id === songId);

  return (
    <div style={s.page}>
      <form style={{ maxWidth: 1040, margin: '0 auto' }} onSubmit={handleSubmit}>
        <div style={s.eyebrow}>{mode === 'edit' ? 'Edit assignment' : 'New assignment'}</div>
        <h1 style={s.title}>{mode === 'edit' ? 'Edit assignment' : 'Set an assignment'}</h1>

        {error && <div style={s.error}>{error}</div>}

        {mode === 'create' && templates && (
          <TemplatePicker templates={templates} disabled={isSaving} onApply={applyTemplate} />
        )}

        <div className="ui-grid-form">
          <div>
            <AssignmentCreateFields
              mode={mode}
              students={students}
              songs={songs}
              studentId={studentId}
              title={title}
              dueDate={dueDate}
              songId={songId}
              description={description}
              dailyTargetMinutes={dailyTargetMinutes}
              fieldErrors={fieldErrors}
              onStudentId={(v) => {
                setStudentId(v);
                if (fieldErrors.student) clearFieldError('student');
              }}
              onTitle={(v) => {
                setTitle(v);
                if (fieldErrors.title) clearFieldError('title');
              }}
              onDueDate={setDueDate}
              onSongId={setSongId}
              onDescription={setDescription}
              onDailyTargetMinutes={setDailyTargetMinutes}
            />

            <FormSection
              numeral="III · PROOF"
              title="Submission & checklist"
              count={3}
              populated={[true, checklist.length > 0, chordIds.length > 0].filter(Boolean).length}
            >
              <AssignmentSubmissionTypeToggle
                value={submissionType}
                onChange={setSubmissionType}
                disabled={isSaving}
              />
              <div style={{ marginTop: 16 }}>
                <ChecklistEditor items={checklist} onChange={setChecklist} disabled={isSaving} />
              </div>
              <ChordDrillEditor selected={chordIds} onChange={setChordIds} disabled={isSaving} />
            </FormSection>

            {SHOW_AI_FEATURES && (
              <div data-testid="assignment-notes-ai">
                <AssignmentAI
                  studentName={students.find((stu) => stu.id === studentId)?.name ?? ''}
                  studentId={studentId || undefined}
                  studentLevel="beginner"
                  recentSongs={[songs.find((song) => song.id === songId)?.title].filter(
                    (t): t is string => Boolean(t)
                  )}
                  focusArea={title}
                  duration="1 week"
                  onAssignmentGenerated={setDescription}
                  disabled={isSaving}
                />
              </div>
            )}

            {mode === 'create' && (
              <label
                htmlFor="assignment-save-template"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: '4px 0 16px',
                  cursor: isSaving ? 'default' : 'pointer',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  color: 'var(--ink-3)',
                }}
              >
                <input
                  id="assignment-save-template"
                  type="checkbox"
                  checked={alsoSaveAsTemplate}
                  onChange={(e) => setAlsoSaveAsTemplate(e.target.checked)}
                  disabled={isSaving}
                />
                Also save this as a reusable template
              </label>
            )}

            <div style={s.actions}>
              <button type="submit" style={s.primary} disabled={isSaving}>
                {isSaving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create assignment'}
              </button>
              <Link
                href={
                  initial
                    ? `/dashboard/assignments/${initial.assignmentId}`
                    : '/dashboard/assignments'
                }
                style={s.cancel}
              >
                Cancel
              </Link>
            </div>
          </div>

          <FormPreviewPanel>
            <AssignmentCreatePreview
              student={selectedStudent}
              song={selectedSong}
              dueDate={dueDate}
            />
          </FormPreviewPanel>
        </div>
      </form>
    </div>
  );
};
