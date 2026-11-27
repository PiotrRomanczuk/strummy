'use client';

import { useTranslations } from 'next-intl';

import type { CardPart } from '@/lib/music-theory/song-card';
import type {
  SongProgressMark,
  SongProgressStatus,
} from '@/lib/services/song-part-progress.helpers';

import { progressRows, progressStatus } from './song-card-progress.helpers';
import { cardSection, eyebrow, hint } from './song-card.styles';
import { SongCardProgressRow } from './SongCardProgress.Row';
import {
  SongCardProgressStudentSelect,
  type ProgressStudent,
} from './SongCardProgress.StudentSelect';
import { useSongPartProgress } from './useSongPartProgress';

type Props = {
  songId: string;
  /** The song's parts from the card; empty when the song has none (it is marked as a whole). */
  parts: CardPart[];
  students: ProgressStudent[];
  /** The student whose progress is shown, or null until the teacher picks one. */
  studentId: string | null;
  lessonId: string | null;
  initialMarks: SongProgressMark[];
};

const STATUS_CLASS: Record<SongProgressStatus, string> = {
  not_started: 'border-[var(--rule)] text-[var(--ink-3)]',
  started: 'border-[var(--gold-dim)] bg-[var(--gold-tint)] text-[var(--gold-2)]',
  mastered: 'border-[var(--success)] text-[var(--success)]',
};

/** The marks of one student; keyed by student so switching students starts from their stored history. */
const ProgressPanel = ({
  songId,
  parts,
  studentId,
  lessonId,
  initialMarks,
}: Omit<Props, 'students' | 'studentId'> & { studentId: string }) => {
  const t = useTranslations('SongProgress');
  const progress = useSongPartProgress({ studentId, songId, lessonId, initialMarks });
  const status = progressStatus(parts, progress.marks);

  return (
    <>
      <p className="flex items-center gap-2 text-xs text-[var(--ink-3)]">
        {t('statusLabel')}
        <span
          data-testid="progress-status"
          className={`rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[.08em] ${STATUS_CLASS[status]}`}
        >
          {t(`status.${status}`)}
        </span>
      </p>
      <ul className="flex flex-col gap-3">
        {progressRows(parts, progress.marks).map((row) => (
          <SongCardProgressRow
            key={row.label ?? 'whole'}
            row={row}
            state={progress.stateOf(row.label)}
            isBusy={progress.isBusy}
            onMark={progress.mark}
          />
        ))}
      </ul>
    </>
  );
};

/**
 * Staff only (#1136): what the picked student plays of this song, part by part, at what share of the original
 * tempo. One tap adds a mark; the song's status follows from the parts and is never set by hand.
 */
export const SongCardProgress = ({ students, studentId, ...rest }: Props) => {
  const t = useTranslations('SongProgress');
  return (
    <section className={cardSection} data-testid="song-card-progress">
      <div className="flex flex-col gap-1">
        <span className={eyebrow}>{t('eyebrow')}</span>
        <p className={hint}>{t(rest.parts.length > 0 ? 'hintParts' : 'hintWhole')}</p>
      </div>
      <SongCardProgressStudentSelect students={students} studentId={studentId} />
      {studentId ? (
        <ProgressPanel key={studentId} studentId={studentId} {...rest} />
      ) : (
        <p className={hint}>{t('noStudent')}</p>
      )}
    </section>
  );
};
