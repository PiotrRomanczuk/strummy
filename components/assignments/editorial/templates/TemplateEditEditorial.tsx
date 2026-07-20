'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { formStyles as s } from '@/components/_editorial/form-styles';
import { ChecklistEditor } from '@/components/assignments/editorial/checklist/ChecklistEditor';
import {
  createAssignmentTemplate,
  deleteAssignmentTemplate,
  updateAssignmentTemplate,
} from '@/app/actions/assignment-templates';
import { sanitizeChecklist, type ChecklistItem } from '@/schemas/AssignmentSchema';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Props = {
  mode: 'create' | 'edit';
  teacherId: string;
  initial?: { id: string; title: string; description: string | null; checklist: ChecklistItem[] };
};

// eslint-disable-next-line max-lines-per-function -- editorial template form (inline styles)
export const TemplateEditEditorial = ({ mode, teacherId, initial }: Props) => {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initial?.checklist ?? []);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    if (!title.trim()) {
      setError('Give the template a title.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      if (mode === 'edit' && initial) {
        await updateAssignmentTemplate({
          id: initial.id,
          title: title.trim(),
          description: description.trim() || null,
          checklist: sanitizeChecklist(checklist),
        });
      } else {
        await createAssignmentTemplate({
          title: title.trim(),
          description: description.trim() || null,
          teacher_id: teacherId,
          checklist: sanitizeChecklist(checklist),
        });
      }
      router.push('/dashboard/assignments/templates');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    setIsSaving(true);
    setError('');
    try {
      await deleteAssignmentTemplate(initial.id);
      router.push('/dashboard/assignments/templates');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      setIsSaving(false);
    }
  };

  return (
    <div style={s.page}>
      <form style={s.shell} onSubmit={handleSubmit}>
        <div style={s.eyebrow}>{mode === 'edit' ? 'Edit template' : 'New template'}</div>
        <h1 style={s.title}>{mode === 'edit' ? 'Edit template' : 'New template'}</h1>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.field}>
          <label style={s.label} htmlFor="template-title">
            Title
          </label>
          <input
            id="template-title"
            style={s.input}
            value={title}
            placeholder="e.g. Weekly scale practice"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div style={s.field}>
          <label style={s.label} htmlFor="template-brief">
            Brief
          </label>
          <textarea
            id="template-brief"
            style={s.textarea}
            value={description}
            placeholder="Default text applied to assignments from this template…"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <ChecklistEditor items={checklist} onChange={setChecklist} disabled={isSaving} />

        <div style={s.actions}>
          <button type="submit" style={s.primary} disabled={isSaving}>
            {isSaving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create template'}
          </button>
          <Link href="/dashboard/assignments/templates" style={s.cancel}>
            Cancel
          </Link>
          {mode === 'edit' && initial && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={isSaving}
                  style={{
                    ...s.cancel,
                    marginLeft: 'auto',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                  }}
                >
                  Delete
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this template?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the template. Assignments already created from it are unaffected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </form>
    </div>
  );
};
