import { getTranslations } from 'next-intl/server';

import { SHOW_AI_FEATURES } from '@/lib/config/features';
import type {
  ContinuityLesson,
  LessonAssignment,
  // Aliased: the query-layer row type and this component now share the plain
  // name, and the component owns the file.
  LessonDetail as LessonDetailRow,
  LessonHistoryEntry,
  SongHistoryEntry,
} from '@/lib/services/lesson-detail-queries';
import type { SongOption } from '@/lib/services/lesson-form-data';
import type { LessonTranscript } from '@/lib/services/lesson-transcript-queries';

import { LessonActionBar } from './detail/LessonDetail.ActionBar';
import { LessonSummaryCard } from './detail/LessonDetail.Summary';
import { LessonHero } from './detail/LessonDetail.Hero';
import { LessonDetailMobile } from './detail/LessonDetail.Mobile';
import { LessonSongsCard } from './detail/LessonDetail.Songs';
import { LessonNotesCard } from './detail/LessonDetail.Notes';
import { LessonInfoCard } from './detail/LessonDetail.Info';
import { LessonAssignmentsCard } from './detail/LessonDetail.Assignments';
import { LessonContinuityCard } from './detail/LessonDetail.Continuity';
import { LessonTranscriptCard } from './detail/LessonDetail.Transcript';
import { LessonTranscriptDraftCard } from './detail/LessonDetail.TranscriptDraft';

export const LessonDetail = async ({
  lesson,
  canEdit = false,
  assignments = [],
  continuity = [],
  viewerIsStudent = false,
  history = [],
  songHistory = {},
  library = [],
  transcript = null,
}: {
  lesson: LessonDetailRow;
  canEdit?: boolean;
  assignments?: LessonAssignment[];
  continuity?: ContinuityLesson[];
  /** The signed-in user is the lesson's student, so "with X" means the teacher. */
  viewerIsStudent?: boolean;
  history?: LessonHistoryEntry[];
  songHistory?: Record<string, SongHistoryEntry[]>;
  library?: SongOption[];
  /** Teacher/admin only — the page passes `null` for everyone else. */
  transcript?: LessonTranscript | null;
}) => {
  const showTranscript = canEdit && transcript !== null;
  // Teacher: once the lesson happened (a summary of a future lesson would be
  // fiction). Student: only when there is a message to read.
  const showSummary = canEdit
    ? SHOW_AI_FEATURES && lesson.status?.toLowerCase() === 'completed'
    : Boolean(lesson.summary);
  const summaryProps = { lessonId: lesson.id, summary: lesson.summary, sentAt: lesson.summarySentAt, canEdit };
  const t = await getTranslations('Lessons');
  const studentDisplay = lesson.studentName ?? lesson.studentEmail ?? t('studentFallback');
  // "with X" / "With X" name the *other* party in the lesson. Hardcoding the
  // student made a student read "with Emma Wright" about their own lesson.
  const counterpartDisplay = viewerIsStudent
    ? (lesson.teacherName ?? t('yourTeacher'))
    : studentDisplay;
  const counterpartFirstName = counterpartDisplay.split(' ')[0];

  return (
    <div
      className="ui-dash-page"
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
      }}
    >
      <div className="md:hidden">
        <LessonDetailMobile
          lesson={lesson}
          canEdit={canEdit}
          assignments={assignments}
          counterpartDisplay={counterpartDisplay}
          library={library}
          transcript={showTranscript ? transcript : null}
        />
        {showSummary && (
          <div className="mt-4 px-4">
            <LessonSummaryCard {...summaryProps} />
          </div>
        )}
      </div>
      <div className="hidden md:block">
        <LessonActionBar
          lesson={lesson}
          canEdit={canEdit}
          history={history}
          counterpartDisplay={counterpartDisplay}
        />
        <LessonHero lesson={lesson} counterpartDisplay={counterpartDisplay} />

        <div className="ui-grid-hero">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <LessonSongsCard
              lesson={lesson}
              canEdit={canEdit}
              songHistory={songHistory}
              library={library}
            />
            <LessonNotesCard notes={lesson.notes} lessonId={lesson.id} canEdit={canEdit} />
            {showSummary && <LessonSummaryCard {...summaryProps} />}
            {showTranscript && (
              <LessonTranscriptDraftCard lessonId={lesson.id} draft={transcript.draft} />
            )}
            {showTranscript && <LessonTranscriptCard transcript={transcript} />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <LessonInfoCard
              lesson={lesson}
              studentDisplay={studentDisplay}
              counterpartFirstName={counterpartFirstName}
            />
            <LessonAssignmentsCard
              assignments={assignments}
              canEdit={canEdit}
              studentId={lesson.studentId}
              lessonId={lesson.id}
              songs={lesson.songs.map((s) => ({ id: s.songId, title: s.title }))}
            />
            <LessonContinuityCard
              lessons={continuity}
              counterpartFirstName={counterpartFirstName}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
