'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { acceptDraftHomeworkAction } from '@/app/actions/transcript-draft-accept';
import type { DraftHomework } from '@/lib/ai/schemas/transcript-draft';
import { DRAFT_BUTTON } from './transcript-draft.styles';

type Props = {
  lessonId: string;
  studentId: string;
  index: number;
  item: DraftHomework;
  isAccepted: boolean;
  isPending: boolean;
  run: (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => void;
};

/** One proposed assignment → `createAssignmentAction`, due at the next lesson. */
export function TranscriptDraftHomework({
  lessonId,
  studentId,
  index,
  item,
  isAccepted,
  isPending,
  run,
}: Props) {
  const t = useTranslations('Lessons');
  return (
    <li className="flex flex-col gap-1.5 border-t border-[var(--rule)] py-3 first:border-t-0">
      <span className="text-[13px] font-medium text-[var(--ink)]">{item.title}</span>
      {item.description && (
        <p className="m-0 text-[12px] leading-[1.5] text-[var(--ink-2)]">{item.description}</p>
      )}
      {isAccepted ? (
        <span className="inline-flex items-center gap-1 text-[12px] text-[var(--success)]">
          <Check size={12} aria-hidden /> {t('draftAccepted')}
        </span>
      ) : (
        <div>
          <button
            type="button"
            className={DRAFT_BUTTON}
            disabled={isPending}
            onClick={() =>
              run(() =>
                acceptDraftHomeworkAction(lessonId, studentId, {
                  index,
                  title: item.title,
                  description: item.description || undefined,
                })
              )
            }
          >
            {t('draftCreateAssignment')}
          </button>
        </div>
      )}
    </li>
  );
}
