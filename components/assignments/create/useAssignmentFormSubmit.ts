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
  /** Create sends one assignment per student; edit carries exactly one. */
  studentIds: string[];
  title: string;
  /** Used for the title when none is typed — the song's title. */
  fallbackTitle: string;
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
  studentIds,
  title,
  fallbackTitle,
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
  // The mockup has no title field up front: fall back to the song, then the brief.
  const resolvedTitle = (title.trim() || fallbackTitle || description.trim().split('\n')[0] || '')
    .slice(0, 120)
    .trim();
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
      if (mode === 'create' && studentIds.length === 0) errs.student = 'Choose a student.';
      if (!resolvedTitle) errs.title = 'Pick a song or describe the task.';
      setFieldErrors(errs);
      if (errs.student || errs.title) {
        const firstInvalid = errs.student ? 'assignment-student' : 'assignment-song';
        document.getElementById(firstInvalid)?.focus();
        return;
      }

      const base: Omit<AssignmentFormValues, 'studentId'> = {
        title: resolvedTitle,
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        songId: songId || null,
        checklist: sanitizeChecklist(checklist),
        chordDrillChordIds: chordIds,
        dailyTargetMinutes,
        submissionType,
      };

      setIsSaving(true);
      if (mode === 'edit' && initialAssignmentId) {
        const updated = await updateAssignmentAction(initialAssignmentId, {
          ...base,
          studentId: studentIds[0] ?? '',
        });
        setIsSaving(false);
        if ('error' in updated) return setError(updated.error);
        router.push(`/dashboard/assignments/${updated.assignmentId}`);
        router.refresh();
        return;
      }

      // One row per student, sequentially so a failure stops the batch and is
      // reported against the student it hit.
      const createdIds: string[] = [];
      for (const studentId of studentIds) {
        const created = await createAssignmentAction({ ...base, studentId });
        if ('error' in created) {
          setIsSaving(false);
          setError(created.error);
          return;
        }
        createdIds.push(created.assignmentId);
      }
      setIsSaving(false);
      const result = { assignmentId: createdIds[0] };

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

      router.push(
        createdIds.length === 1
          ? `/dashboard/assignments/${result.assignmentId}`
          : '/dashboard/assignments'
      );
      router.refresh();
    },
    [
      isSaving,
      mode,
      studentIds,
      resolvedTitle,
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
