'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { generateLessonDraftAction } from '@/app/dashboard/lessons/transcript-draft-actions';
import type { LessonTranscriptDraftState } from '@/lib/services/lesson-transcript-queries';

import { TranscriptDraftReview } from './LessonDetail.TranscriptDraftReview';
import { DRAFT_BUTTON_GHOST, DRAFT_BUTTON_PRIMARY } from './transcript-draft.styles';

type Props = { lessonId: string; draft: LessonTranscriptDraftState };

/**
 * "Szkic z nagrania" card (CNT-8), teacher/admin only, mounted next to the
 * transcript card. States: no draft → generate · failed → retry · ready →
 * review form · applied → one line. Open unless the teacher dismissed the
 * draft — the generate button is the call to action.
 */
export function LessonTranscriptDraftCard({ lessonId, draft }: Props) {
  const t = useTranslations('Lessons');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isReady = draft.status === 'ready' && draft.content !== null;
  const today = new Date().toISOString().slice(0, 10);

  const generate = () =>
    startTransition(async () => {
      setError(null);
      const result = await generateLessonDraftAction(lessonId);
      if (!result.success) setError(result.error);
    });

  if (draft.status === 'applied') {
    return (
      <p
        data-testid="transcript-draft-applied"
        className="m-0 font-[family-name:var(--mono)] text-[11px] text-[var(--ink-3)]"
      >
        {t('draftApplied', { date: (draft.appliedAt ?? '').slice(0, 10) })}
      </p>
    );
  }

  const failure = error ?? (draft.status === 'failed' ? draft.error : null);
  const buttonLabel = isPending
    ? t('draftGenerating')
    : isReady || failure
      ? t('draftRegenerate')
      : t('draftGenerate');

  return (
    <details
      open={draft.status !== 'dismissed' || isPending}
      data-testid="lesson-transcript-draft"
      className="group min-w-0 overflow-hidden rounded-[10px] border border-[var(--rule)] bg-[var(--card)]"
    >
      <summary className="flex cursor-pointer list-none items-end justify-between gap-3 px-6 pt-5 pb-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[.14em] text-[var(--ink-4)]">
            {t('draftEyebrow')}
          </div>
          <div className="mt-0.5 flex items-center gap-2 font-[family-name:var(--serif)] text-[20px] font-normal tracking-[-0.01em] text-[var(--ink)]">
            <Sparkles size={16} aria-hidden className="text-[var(--ink-3)]" />
            {t('draftTitle')}
          </div>
        </div>
        <ChevronDown
          size={16}
          aria-hidden
          className="mb-1 shrink-0 text-[var(--ink-4)] transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="px-6 pb-[22px]">
        {isReady && draft.content ? (
          <TranscriptDraftReview
            key={draft.generatedAt ?? ''}
            lessonId={lessonId}
            draft={draft.content}
            today={today}
          />
        ) : (
          <p className="mt-0 mb-4 text-[13px] leading-[1.55] text-[var(--ink-2)]">{t('draftIntro')}</p>
        )}

        {failure && (
          <p role="alert" className="mb-3 font-[family-name:var(--mono)] text-[12px] text-[var(--danger)]">
            {t('draftFailed', { error: failure })}
          </p>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={generate}
          className={isReady ? `${DRAFT_BUTTON_GHOST} mt-3` : DRAFT_BUTTON_PRIMARY}
        >
          {buttonLabel}
        </button>
      </div>
    </details>
  );
}
