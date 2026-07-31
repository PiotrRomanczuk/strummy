'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';

import { saveAssignmentAsTemplate } from '@/app/actions/assignment-templates';

const buttonStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textDecoration: 'none',
};

/** Teacher/admin action on assignment detail — copies this assignment into a reusable template. */
export const SaveAsTemplateButton = ({ assignmentId }: { assignmentId: string }) => {
  const t = useTranslations('Assignments');
  const [isPending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  if (templateId) {
    return (
      <Link
        href={`/dashboard/assignments/templates/${templateId}`}
        style={{ ...buttonStyle, color: 'var(--gold-2)' }}
      >
        {t('detailSavedViewTemplateLink')}
      </Link>
    );
  }

  const handleClick = () => {
    if (isPending) return;
    setHasError(false);
    startTransition(async () => {
      try {
        const { templateId: id } = await saveAssignmentAsTemplate(assignmentId);
        setTemplateId(id);
      } catch {
        setHasError(true);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      style={{ ...buttonStyle, color: hasError ? 'var(--danger)' : buttonStyle.color }}
    >
      {isPending
        ? t('createFormSavingButton')
        : hasError
          ? t('detailRetrySaveButton')
          : t('detailSaveAsTemplateButton')}
    </button>
  );
};
