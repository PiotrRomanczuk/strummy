'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';
import { ChecklistEditor } from '@/components/assignments/checklist/ChecklistEditor';
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

// eslint-disable-next-line max-lines-per-function -- template form (inline styles)
export const TemplateEdit = ({ mode, teacherId, initial }: Props) => {
  const router = useRouter();
  const t = useTranslations('Assignments');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initial?.checklist ?? []);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    if (!title.trim()) {
      setError(t('templateEditTitleRequiredError'));
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
      setError(err instanceof Error ? err.message : t('templateEditSaveFailedFallback'));
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
      setError(err instanceof Error ? err.message : t('templateEditDeleteFailedFallback'));
      setIsSaving(false);
    }
  };

  return (
    <div style={s.page}>
      <form style={s.shell} onSubmit={handleSubmit}>
        <div style={s.eyebrow}>
          {mode === 'edit' ? t('templateEditEyebrowEdit') : t('templateEditEyebrowNew')}
        </div>
        <h1 style={s.title}>
          {mode === 'edit' ? t('templateEditEyebrowEdit') : t('templateEditEyebrowNew')}
        </h1>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.field}>
          <label style={s.label} htmlFor="template-title">
            {t('createFormTitleLabel')}
          </label>
          <input
            id="template-title"
            style={s.input}
            value={title}
            placeholder={t('templateEditTitlePlaceholder')}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div style={s.field}>
          <label style={s.label} htmlFor="template-brief">
            {t('createFormBriefLabel')}
          </label>
          <textarea
            id="template-brief"
            style={s.textarea}
            value={description}
            placeholder={t('templateEditBriefPlaceholder')}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <ChecklistEditor items={checklist} onChange={setChecklist} disabled={isSaving} />

        <div style={s.actions}>
          <button type="submit" style={s.primary} disabled={isSaving}>
            {isSaving
              ? t('createFormSavingButton')
              : mode === 'edit'
                ? t('createFormSaveChangesButton')
                : t('templateEditCreateButton')}
          </button>
          <Link href="/dashboard/assignments/templates" style={s.cancel}>
            {t('createFormCancelLink')}
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
                  {t('templateEditDeleteButton')}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('templateEditDeleteDialogTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('templateEditDeleteDialogDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('templateEditKeepButton')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    {t('templateEditDeleteButton')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </form>
    </div>
  );
};
