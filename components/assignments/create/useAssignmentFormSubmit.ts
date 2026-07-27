'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createAssignmentAction,
  updateAssignmentAction,
  type AssignmentFormValues,
} from '@/app/actions/assignment-edit';
import { saveAssignmentAsTemplate } from '@/app/actions/assignment-templates';
import {
  sanitizeChecklist,
  type ChecklistItem,
  type SubmissionType,
} from '@/schemas/AssignmentSchema';

type SubmitArgs = {
  mode: 'create' | 'edit';
  initialAssignmentId?: string;
  studentId: string;
  title: string;
  description: string;
  dueDate: string;
  songId: string;
  checklist: ChecklistItem[];
  chordIds: string[];
  dailyTargetMinutes: number | null;
  submissionType: SubmissionType;
  alsoSaveAsTemplate?: boolean;
};

export function useAssignmentFormSubmit({
  mode,
  initialAssignmentId,
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
}: SubmitArgs) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ student?: string; title?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const clearFieldError = useCallback((field: 'student' | 'title') => {
    setFieldErrors((f) => ({ ...f, [field]: undefined }));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (isSaving) return;
      setError('');

      // Validate every field at once, attach errors to the fields themselves,
      // and move focus to the first invalid one.
      const errs: { student?: string; title?: string } = {};
      if (mode === 'create' && !studentId) errs.student = 'Choose a student.';
      if (!title.trim()) errs.title = 'Give the assignment a title.';
      setFieldErrors(errs);
      if (errs.student || errs.title) {
        const firstInvalid = errs.student ? 'assignment-student' : 'assignment-title';
        document.getElementById(firstInvalid)?.focus();
        return;
      }

      const values: AssignmentFormValues = {
        studentId,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        songId: songId || null,
        checklist: sanitizeChecklist(checklist),
        chordDrillChordIds: chordIds,
        dailyTargetMinutes,
        submissionType,
      };

      setIsSaving(true);
      const result =
        mode === 'edit' && initialAssignmentId
          ? await updateAssignmentAction(initialAssignmentId, values)
          : await createAssignmentAction(values);
      setIsSaving(false);

      if ('error' in result) {
        setError(result.error);
        return;
      }

      // Best-effort: copy the just-created assignment into a reusable template.
      // A template-save failure must not block navigation — the assignment is
      // the primary artifact (mirrors the notification-on-create policy).
      if (mode === 'create' && alsoSaveAsTemplate) {
        try {
          await saveAssignmentAsTemplate(result.assignmentId);
        } catch {
          // swallow: assignment created; template copy is a bonus
        }
      }

      router.push(`/dashboard/assignments/${result.assignmentId}`);
      router.refresh();
    },
    [
      isSaving,
      mode,
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
      initialAssignmentId,
      router,
    ]
  );

  return { error, fieldErrors, isSaving, handleSubmit, clearFieldError };
}
