'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  acceptDraftNextLessonAction,
  acceptDraftNotesAction,
} from '@/app/actions/transcript-draft';
import { DRAFT_BUTTON, DRAFT_SECTION_LABEL } from './transcript-draft.styles';

type Run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => void;

export const DraftAcceptedMark = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-1 text-[12px] text-[var(--success)]">
    <Check size={12} aria-hidden /> {label}
  </span>
);

/** The proposed notes block + "Zapisz do notatek" (appends, never overwrites). */
export function DraftNotesSection({
  lessonId,
  notes,
  isAccepted,
  isPending,
  run,
}: {
  lessonId: string;
  notes: string;
  isAccepted: boolean;
  isPending: boolean;
  run: Run;
}) {
  const t = useTranslations('Lessons');
  return (
    <section>
      <h4 className={DRAFT_SECTION_LABEL}>{t('draftNotesHeading')}</h4>
      <pre className="m-0 mb-2 rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-3 font-[family-name:var(--sans)] text-[13px] leading-[1.55] whitespace-pre-wrap text-[var(--ink-2)]">
        {notes}
      </pre>
      {isAccepted ? (
        <DraftAcceptedMark label={t('draftAccepted')} />
      ) : (
        <button
          type="button"
          className={DRAFT_BUTTON}
          disabled={isPending}
          onClick={() => run(() => acceptDraftNotesAction(lessonId, notes))}
        >
          {t('draftSaveNotes')}
        </button>
      )}
    </section>
  );
}

/** "Na następną lekcję" bullets, each appendable to the next scheduled lesson's notes. */
export function DraftNextLessonSection({
  lessonId,
  items,
  accepted,
  isPending,
  run,
}: {
  lessonId: string;
  items: string[];
  accepted: number[];
  isPending: boolean;
  run: Run;
}) {
  const t = useTranslations('Lessons');
  if (items.length === 0) return null;
  return (
    <section>
      <h4 className={DRAFT_SECTION_LABEL}>{t('draftNextHeading')}</h4>
      <ul className="m-0 list-none p-0">
        {items.map((text, i) => (
          <li
            key={`${text}-${i}`}
            className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--rule)] py-2 text-[13px] text-[var(--ink-2)] first:border-t-0"
          >
            <span>{text}</span>
            {accepted.includes(i) ? (
              <DraftAcceptedMark label={t('draftAccepted')} />
            ) : (
              <button
                type="button"
                className={DRAFT_BUTTON}
                disabled={isPending}
                onClick={() => run(() => acceptDraftNextLessonAction(lessonId, { index: i, text }))}
              >
                {t('draftToNextPlan')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
