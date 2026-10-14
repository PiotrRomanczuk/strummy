'use client';

import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import {
  discardTranscriptDraftAction,
  generateTranscriptDraftAction,
} from '@/app/actions/transcript-draft';
import type { TranscriptDraftRecord } from '@/lib/services/transcript-draft.helpers';
import { formatLessonDate } from '@/components/lessons/lesson-format.helpers';
import { TranscriptDraftHomework } from './LessonDetail.TranscriptDraft.Homework';
import { DraftNextLessonSection, DraftNotesSection } from './LessonDetail.TranscriptDraft.Sections';
import { TranscriptDraftSong } from './LessonDetail.TranscriptDraft.Song';
import { DRAFT_BUTTON, DRAFT_PRIMARY_BUTTON, DRAFT_SECTION_LABEL } from './transcript-draft.styles';
import { useTranscriptDraft } from './useTranscriptDraft';

type Props = { lessonId: string; studentId: string; draft: TranscriptDraftRecord | null };

/**
 * "Szkic z nagrania" — teacher/admin only, rendered only when the lesson has
 * a transcript. No draft → one button. Draft → each proposal with its own
 * accept button; nothing is written until clicked (doc 08 contract).
 */
export function LessonTranscriptDraftCard({ lessonId, studentId, draft }: Props) {
  const t = useTranslations('Lessons');
  const locale = useLocale();
  const { isPending, run } = useTranscriptDraft(t);

  return (
    <section
      data-testid="lesson-transcript-draft"
      className="min-w-0 overflow-hidden rounded-[10px] border border-[var(--rule)] bg-[var(--card)]"
    >
      <DraftHeader
        hasDraft={draft !== null}
        isPending={isPending}
        onDiscard={() => run(() => discardTranscriptDraftAction(lessonId), t('draftDiscarded'))}
      />

      <div className="flex flex-col gap-5 px-6 pb-[22px]">
        {!draft ? (
          <DraftEmptyState
            isPending={isPending}
            onGenerate={() => run(() => generateTranscriptDraftAction(lessonId), t('draftReady'))}
          />
        ) : (
          <>
            <p className="m-0 font-[family-name:var(--mono)] text-[11px] text-[var(--ink-4)]">
              {t('draftMeta', {
                date: formatLessonDate(draft.generatedAt, locale),
                model: draft.model,
              })}
            </p>
            <DraftNotesSection
              lessonId={lessonId}
              notes={draft.draft.notes_pl}
              isAccepted={draft.accepted.notes}
              isPending={isPending}
              run={run}
            />
            <DraftList heading={t('draftSongsHeading')} count={draft.draft.songs.length}>
              {draft.draft.songs.map((song, i) => (
                <TranscriptDraftSong
                  key={`${song.title}-${i}`}
                  lessonId={lessonId}
                  index={i}
                  song={song}
                  resolution={draft.resolvedSongs[i] ?? { match: 'new' }}
                  isAccepted={draft.accepted.songs.includes(i)}
                  isPending={isPending}
                  run={run}
                />
              ))}
            </DraftList>
            <DraftList heading={t('draftHomeworkHeading')} count={draft.draft.homework.length}>
              {draft.draft.homework.map((item, i) => (
                <TranscriptDraftHomework
                  key={`${item.title}-${i}`}
                  lessonId={lessonId}
                  studentId={studentId}
                  index={i}
                  item={item}
                  isAccepted={draft.accepted.homework.includes(i)}
                  isPending={isPending}
                  run={run}
                />
              ))}
            </DraftList>
            <DraftNextLessonSection
              lessonId={lessonId}
              items={draft.draft.next_lesson}
              accepted={draft.accepted.nextLesson}
              isPending={isPending}
              run={run}
            />
          </>
        )}
      </div>
    </section>
  );
}

const DraftList = ({
  heading,
  count,
  children,
}: {
  heading: string;
  count: number;
  children: React.ReactNode;
}) =>
  count === 0 ? null : (
    <section>
      <h4 className={DRAFT_SECTION_LABEL}>{heading}</h4>
      <ul className="m-0 list-none p-0">{children}</ul>
    </section>
  );

const DraftHeader = ({
  hasDraft,
  isPending,
  onDiscard,
}: {
  hasDraft: boolean;
  isPending: boolean;
  onDiscard: () => void;
}) => {
  const t = useTranslations('Lessons');
  return (
    <div className="flex items-end justify-between gap-3 px-6 pt-5 pb-3">
      <div>
        <div className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[.14em] text-[var(--ink-4)]">
          {t('draftEyebrow')}
        </div>
        <div className="mt-0.5 font-[family-name:var(--serif)] text-[20px] font-normal tracking-[-0.01em] text-[var(--ink)]">
          {t('draftTitle')}
        </div>
      </div>
      {hasDraft && (
        <button type="button" className={DRAFT_BUTTON} disabled={isPending} onClick={onDiscard}>
          <Trash2 size={12} aria-hidden /> {t('draftDiscard')}
        </button>
      )}
    </div>
  );
};

const DraftEmptyState = ({
  isPending,
  onGenerate,
}: {
  isPending: boolean;
  onGenerate: () => void;
}) => {
  const t = useTranslations('Lessons');
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="m-0 text-[13px] leading-[1.5] text-[var(--ink-2)]">{t('draftIntro')}</p>
      <button
        type="button"
        className={DRAFT_PRIMARY_BUTTON}
        disabled={isPending}
        onClick={onGenerate}
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin" aria-hidden />
        ) : (
          <Sparkles size={13} aria-hidden />
        )}
        {isPending ? t('draftGenerating') : t('draftGenerate')}
      </button>
    </div>
  );
};
