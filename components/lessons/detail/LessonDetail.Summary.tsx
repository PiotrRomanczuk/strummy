'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import {
  generateLessonSummaryAction,
  saveLessonSummaryAction,
  sendLessonSummaryAction,
  type SummaryActionResult,
} from '@/app/dashboard/lessons/lesson-summary-actions';
import { DesignCard, DesignCardBody, DesignCardHeader } from '@/components/shared/DesignCard';

import { DRAFT_BUTTON_GHOST, DRAFT_BUTTON_PRIMARY, DRAFT_FIELD } from './transcript-draft.styles';

type Props = {
  lessonId: string;
  summary: string | null;
  sentAt: string | null;
  canEdit: boolean;
};

const MESSAGE = 'm-0 whitespace-pre-wrap font-[family-name:var(--serif)] text-[15px] leading-[1.7] text-[var(--ink)]';
const META = 'm-0 font-[family-name:var(--mono)] text-[11px] text-[var(--ink-3)]';

/**
 * "Podsumowanie lekcji": the teacher's message to the student after the
 * lesson. Teacher: generate with AI, edit, save, e-mail. Student: read only,
 * shown once a summary exists.
 */
export const LessonSummaryCard = ({ lessonId, summary, sentAt, canEdit }: Props) => {
  const t = useTranslations('Lessons');
  const [text, setText] = useState(summary ?? '');
  const [sent, setSent] = useState(sentAt);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canEdit) {
    if (!summary) return null;
    return (
      <DesignCard>
        <DesignCardHeader eyebrow={t('summaryEyebrow')} title={t('summaryTitle')} />
        <DesignCardBody>
          <p className={MESSAGE}>{summary}</p>
        </DesignCardBody>
      </DesignCard>
    );
  }

  const run = (action: () => Promise<SummaryActionResult>, markSent = false) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.success) return setError(result.error);
      setText(result.summary);
      if (markSent && result.sent) setSent(new Date().toISOString());
    });

  const dirty = text.trim() !== (summary ?? '').trim();
  return (
    <DesignCard>
      <DesignCardHeader
        eyebrow={t('summaryEyebrow')}
        title={t('summaryTitle')}
        action={
          <button type="button" className={DRAFT_BUTTON_GHOST} disabled={isPending} onClick={() => run(() => generateLessonSummaryAction(lessonId))}>
            {isPending ? t('summaryWorking') : text ? t('summaryRegenerate') : t('summaryGenerate')}
          </button>
        }
      />
      <DesignCardBody>
        <div className="flex flex-col gap-3">
          {text || isPending ? (
            <textarea
              aria-label={t('summaryTitle')}
              className={`${DRAFT_FIELD} min-h-[220px] font-[family-name:var(--serif)] text-[15px]`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isPending}
            />
          ) : (
            <p className={META}>{t('summaryEmpty')}</p>
          )}
          {error && <p className="m-0 text-[13px] text-[var(--danger)]">{error}</p>}
          {text && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={DRAFT_BUTTON_GHOST} disabled={isPending || !dirty} onClick={() => run(() => saveLessonSummaryAction(lessonId, text))}>
                {t('summarySave')}
              </button>
              <button type="button" className={DRAFT_BUTTON_PRIMARY} disabled={isPending} onClick={() => run(() => sendLessonSummaryAction(lessonId, text), true)}>
                {sent ? t('summaryResend') : t('summarySend')}
              </button>
              <span className={META}>{sent ? t('summarySentAt', { date: new Date(sent).toLocaleDateString('pl-PL') }) : t('summaryNotSent')}</span>
            </div>
          )}
        </div>
      </DesignCardBody>
    </DesignCard>
  );
};
