'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import {
  applyLessonDraftAction,
  dismissLessonDraftAction,
} from '@/app/dashboard/lessons/transcript-draft-actions';
import { Checkbox } from '@/components/ui/checkbox';
import type { ResolvedLessonDraft } from '@/lib/ai/schemas/lesson-transcript-draft';

import {
  TranscriptDraftHomework,
  TranscriptDraftInfo,
  TranscriptDraftSkills,
} from './LessonDetail.TranscriptDraftExtras';
import { TranscriptDraftSongs } from './LessonDetail.TranscriptDraftSongs';
import {
  DRAFT_BUTTON_GHOST,
  DRAFT_BUTTON_PRIMARY,
  DRAFT_FIELD,
  DRAFT_SECTION_LABEL,
} from './transcript-draft.styles';
import { useTranscriptDraftSelection } from './useTranscriptDraftSelection';

type Props = { lessonId: string; draft: ResolvedLessonDraft; today: string };

/** The review form: everything pre-filled from the draft, written only on "Zapisz do lekcji". */
export function TranscriptDraftReview({ lessonId, draft, today }: Props) {
  const t = useTranslations('Lessons');
  const s = useTranscriptDraftSelection(draft, today);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ success: true } | { success: false; error: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.success) setError(result.error);
    });

  return (
    <div data-testid="transcript-draft-review">
      {!draft.isGuitarLesson && (
        <p className="mb-4 rounded-lg border border-[var(--danger)] px-3 py-2 text-[13px] text-[var(--danger)]">
          {t('draftNotGuitar')}
        </p>
      )}

      <section className="mb-5">
        <h4 className={DRAFT_SECTION_LABEL}>{t('draftLessonTitle')}</h4>
        <input
          aria-label={t('draftLessonTitle')}
          value={s.lessonTitle}
          onChange={(e) => s.setLessonTitle(e.target.value)}
          className={DRAFT_FIELD}
        />
      </section>

      <TranscriptDraftSongs rows={s.rows.songs} onChange={s.updateSong} />
      <TranscriptDraftHomework
        assignment={s.assignment}
        include={s.includeAssignment}
        onInclude={s.setIncludeAssignment}
        onChange={s.setAssignment}
      />
      <TranscriptDraftSkills rows={s.rows.skills} onChange={s.updateSkill} />
      <TranscriptDraftInfo draft={draft} />

      <section className="mb-5">
        <h4 className={DRAFT_SECTION_LABEL}>{t('draftNotes')}</h4>
        <textarea
          aria-label={t('draftNotes')}
          value={s.notes}
          onChange={(e) => s.setNotes(e.target.value)}
          rows={10}
          className={`${DRAFT_FIELD} resize-y font-[family-name:var(--mono)] text-[12px]`}
        />
      </section>

      <label className="mb-4 flex items-start gap-2 text-[13px] text-[var(--ink-2)]">
        <Checkbox
          checked={s.markCompleted}
          onCheckedChange={(c) => s.setMarkCompleted(c === true)}
          className="mt-0.5"
        />
        {t('draftMarkCompleted')}
      </label>

      {error && (
        <p role="alert" className="mb-3 font-[family-name:var(--mono)] text-[12px] text-[var(--danger)]">
          {t('draftApplyFailed', { error })}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => applyLessonDraftAction(lessonId, s.selection))}
          className={DRAFT_BUTTON_PRIMARY}
        >
          {isPending ? t('draftApplying') : t('draftApply')}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => dismissLessonDraftAction(lessonId))}
          className={DRAFT_BUTTON_GHOST}
        >
          {t('draftDismiss')}
        </button>
      </div>
    </div>
  );
}
