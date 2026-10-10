'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';
import { FormSection } from '@/components/shared/FormSection';
import { FormPageHeader, FormTitleAccent } from '@/components/shared/FormPageHeader';
import { FormPreviewPanel } from '@/components/shared/FormPreviewPanel';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';
import { AssignmentAI } from '@/components/assignments/form/AssignmentAI';
import { AssignmentCreateExtras } from './AssignmentCreate.Extras';
import { AssignmentCreateFields } from './AssignmentCreate.Fields';
import { AssignmentCreatePreview } from './AssignmentCreate.Preview';
import { AssignmentSubmissionTypeToggle } from './AssignmentCreate.SubmissionType';
import { useAssignmentFormSubmit } from './useAssignmentFormSubmit';
import type { ChecklistItem, SubmissionType } from '@/schemas/AssignmentSchema';
import type { AssignmentTemplateRow } from '@/lib/services/assignment-template-queries';
import { SHOW_AI_FEATURES } from '@/lib/config/features';

const FORM_ID = 'assignment-form';
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

/** Claude Design "New *assignment*." — four sections plus a collapsed extras one. */
export const AssignmentCreate = ({
  mode,
  students,
  songs,
  templates,
  defaultStudentId,
  initial,
}: Props) => {
  const t = useTranslations('Assignments');
  const firstStudent = initial?.studentId ?? defaultStudentId;
  const [studentIds, setStudentIds] = useState<string[]>(firstStudent ? [firstStudent] : []);
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
  const selectedSong = songs.find((song) => song.id === songId);

  const { error, fieldErrors, isSaving, handleSubmit, clearFieldError } = useAssignmentFormSubmit({
    mode,
    initialAssignmentId: initial?.assignmentId,
    studentIds,
    title,
    fallbackTitle: selectedSong?.title ?? '',
    description,
    dueDate,
    songId,
    checklist,
    chordIds,
    dailyTargetMinutes,
    submissionType,
    alsoSaveAsTemplate,
  });

  const toggleStudent = (id: string) => {
    setStudentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    if (fieldErrors.student) clearFieldError('student');
  };
  const firstName = students.find((stu) => stu.id === studentIds[0])?.name ?? '';

  return (
    <div style={s.page}>
      <FormPageHeader
        crumbLabel={t('createFormCrumb')}
        crumbHref="/dashboard/assignments"
        current={mode === 'edit' ? t('createFormEyebrowEdit') : t('createFormEyebrowNew')}
        title={
          <>
            {mode === 'edit' ? t('createFormTitleEditLead') : t('createFormTitleNewLead')}{' '}
            <FormTitleAccent>{t('createFormTitleNoun')}</FormTitleAccent>.
          </>
        }
        sub={t('createFormSubtitle')}
        cancelHref={
          initial ? `/dashboard/assignments/${initial.assignmentId}` : '/dashboard/assignments'
        }
        cancelLabel={t('createFormCancelLink')}
        submitLabel={
          isSaving
            ? t('createFormSavingButton')
            : mode === 'edit'
              ? t('createFormSaveChangesButton')
              : t('createFormSendButton')
        }
        formId={FORM_ID}
        isSaving={isSaving}
      />

      {error && <div style={s.error}>{error}</div>}

      <form id={FORM_ID} onSubmit={handleSubmit} className="ui-grid-form">
        <div>
          <AssignmentCreateFields
            mode={mode}
            students={students}
            songs={songs}
            studentIds={studentIds}
            dueDate={dueDate}
            songId={songId}
            description={description}
            dailyTargetMinutes={dailyTargetMinutes}
            fieldErrors={fieldErrors}
            onToggleStudent={toggleStudent}
            onDueDate={setDueDate}
            onSongId={(v) => {
              setSongId(v);
              if (fieldErrors.title) clearFieldError('title');
            }}
            onDescription={setDescription}
            onDailyTargetMinutes={setDailyTargetMinutes}
            descriptionExtra={
              SHOW_AI_FEATURES ? (
                <div data-testid="assignment-notes-ai" style={{ marginTop: 10 }}>
                  <AssignmentAI
                    studentName={firstName}
                    studentId={studentIds[0]}
                    studentLevel="beginner"
                    recentSongs={selectedSong ? [selectedSong.title] : []}
                    focusArea={title || selectedSong?.title || ''}
                    duration="1 week"
                    onAssignmentGenerated={setDescription}
                    disabled={isSaving}
                  />
                </div>
              ) : null
            }
          />

          <FormSection
            numeral={t('createFormNumeralProof')}
            title={t('createFormSectionSubmissionTitle')}
            count={1}
            populated={1}
          >
            <AssignmentSubmissionTypeToggle
              value={submissionType}
              onChange={setSubmissionType}
              disabled={isSaving}
            />
          </FormSection>

          <AssignmentCreateExtras
            mode={mode}
            title={title}
            titlePlaceholder={selectedSong?.title ?? t('createFormTitlePlaceholder')}
            checklist={checklist}
            chordIds={chordIds}
            templates={templates}
            alsoSaveAsTemplate={alsoSaveAsTemplate}
            disabled={isSaving}
            onTitle={setTitle}
            onChecklist={setChecklist}
            onChordIds={setChordIds}
            onApplyTemplate={(tpl) => {
              setTitle(tpl.title);
              setDescription(tpl.description ?? '');
              setChecklist(tpl.checklist);
            }}
            onAlsoSaveAsTemplate={setAlsoSaveAsTemplate}
          />
        </div>

        <FormPreviewPanel>
          <AssignmentCreatePreview
            students={students.filter((stu) => studentIds.includes(stu.id))}
            song={selectedSong}
            title={title}
            dueDate={dueDate}
            dailyTargetMinutes={dailyTargetMinutes}
          />
        </FormPreviewPanel>
      </form>
    </div>
  );
};
