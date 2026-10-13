import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { PracticeLogForm, type RepertoireSongOption } from './PracticeLogForm';
import { PracticeHistoryList } from './PracticeHistoryList';
import type { PracticeSessionWithSong } from '@/app/actions/practice';

interface PracticeProps {
  sessions: PracticeSessionWithSong[];
  songs: RepertoireSongOption[];
  /** Students log + undo; staff viewing a student see read-only history. */
  isOwnPractice: boolean;
}

/** Editorial card: mono gold eyebrow over a rule, then the body. */
const PracticeCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="overflow-hidden rounded-[10px] border border-[var(--rule)] bg-[var(--card)]">
    <h2 className="m-0 border-b border-[var(--rule)] px-5 pt-4 pb-3 font-[family-name:var(--mono)] text-[10px] font-normal uppercase tracking-[.14em] text-[var(--gold-2)]">
      {title}
    </h2>
    <div className="px-5 pt-4 pb-5">{children}</div>
  </section>
);

/**
 * Practice surface (spec 05). Log form + session history with
 * same-day undo. Server component — interactivity lives in the leaf
 * client components.
 */
export async function Practice({ sessions, songs, isOwnPractice }: PracticeProps) {
  const t = await getTranslations('Practice');
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <div className="space-y-5">
      <header>
        <p className="m-0 font-[family-name:var(--mono)] text-[11px] uppercase tracking-[.16em] text-[var(--ink-4)]">
          {t('eyebrow')}
        </p>
        <h1 className="mt-1.5 mb-0 font-[family-name:var(--serif)] text-[30px] font-normal italic tracking-[-0.02em]">
          {t('pageTitle')}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-3)]">
          {t(sessions.length === 1 ? 'summarySingular' : 'summaryPlural', {
            count: sessions.length,
            minutes: totalMinutes,
          })}
        </p>
      </header>

      {isOwnPractice && (
        <PracticeCard title={t('logSessionTitle')}>
          <PracticeLogForm songs={songs} />
        </PracticeCard>
      )}

      <PracticeCard title={t('historyTitle')}>
        <PracticeHistoryList sessions={sessions} canUndo={isOwnPractice} />
      </PracticeCard>
    </div>
  );
}
