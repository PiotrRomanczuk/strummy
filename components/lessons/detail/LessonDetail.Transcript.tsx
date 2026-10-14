import { ChevronDown, ExternalLink } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import {
  formatLessonClockShort,
  formatLessonDate,
} from '@/components/lessons/lesson-format.helpers';
import type { LessonTranscript } from '@/lib/services/lesson-transcript-queries';

const SOURCE_KEYS: Record<LessonTranscript['source'], string> = {
  wispr: 'transcriptSourceWispr',
  paste: 'transcriptSourcePaste',
  upload: 'transcriptSourceUpload',
};

const META_LABEL = 'uppercase tracking-[.12em] text-[var(--ink-4)]';
const SECTION_LABEL =
  'mb-1.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[.14em] text-[var(--ink-4)]';

/**
 * Read-only "Transkrypcja" card, teacher/admin only. Collapsed by default:
 * a transcript is long and names third parties — it is reference material,
 * not the first thing a teacher opening the lesson should scroll past.
 */
export async function LessonTranscriptCard({ transcript }: { transcript: LessonTranscript }) {
  const [t, locale] = await Promise.all([getTranslations('Lessons'), getLocale()]);
  const recorded = transcript.recordedAt
    ? `${formatLessonDate(transcript.recordedAt, locale)} · ${formatLessonClockShort(transcript.recordedAt, locale)}`
    : null;

  return (
    <details
      data-testid="lesson-transcript"
      className="group min-w-0 overflow-hidden rounded-[10px] border border-[var(--rule)] bg-[var(--card)]"
    >
      <summary className="flex cursor-pointer list-none items-end justify-between gap-3 px-6 pt-5 pb-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[.14em] text-[var(--ink-4)]">
            {t('transcriptEyebrow')}
          </div>
          <div className="mt-0.5 font-[family-name:var(--serif)] text-[20px] font-normal tracking-[-0.01em] text-[var(--ink)]">
            {t('transcriptTitle')}
          </div>
        </div>
        <ChevronDown
          size={16}
          aria-hidden
          className="mb-1 shrink-0 text-[var(--ink-4)] transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="px-6 pb-[22px]">
        <dl className="mb-4 flex flex-wrap gap-x-5 gap-y-1 font-[family-name:var(--mono)] text-[11px] text-[var(--ink-2)]">
          {recorded && (
            <div>
              <dt className={`inline ${META_LABEL}`}>{t('transcriptRecordedAt')} </dt>
              <dd className="inline">{recorded}</dd>
            </div>
          )}
          <div>
            <dt className={`inline ${META_LABEL}`}>{t('transcriptSource')} </dt>
            <dd className="inline">{t(SOURCE_KEYS[transcript.source])}</dd>
          </div>
          {transcript.shareLink && (
            <a
              href={transcript.shareLink}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[var(--ink-2)] underline underline-offset-2 hover:text-[var(--ink)]"
            >
              {t('transcriptOpenLink')}
              <ExternalLink size={11} aria-hidden />
            </a>
          )}
        </dl>

        {transcript.summary && (
          <section className="mb-4">
            <h4 className={SECTION_LABEL}>{t('transcriptSummary')}</h4>
            <p className="m-0 whitespace-pre-wrap text-[13px] leading-[1.55] text-[var(--ink-2)]">
              {transcript.summary}
            </p>
          </section>
        )}

        <h4 className={SECTION_LABEL}>{t('transcriptBody')}</h4>
        <pre className="m-0 max-h-[420px] overflow-auto rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-3 font-[family-name:var(--mono)] text-[12px] leading-[1.5] whitespace-pre-wrap text-[var(--ink-2)]">
          {transcript.body}
        </pre>
      </div>
    </details>
  );
}
