import { getTranslations } from 'next-intl/server';

import { PostLessonSummaryAI } from '@/components/lessons/PostLessonSummaryAI';
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

import { LessonActionBar } from './detail/LessonDetail.ActionBar';
import { LessonHero } from './detail/LessonDetail.Hero';
import { LessonDetailMobile } from './detail/LessonDetail.Mobile';
import { LessonSongsCard } from './detail/LessonDetail.Songs';
import { LessonNotesCard } from './detail/LessonDetail.Notes';
import { LessonInfoCard } from './detail/LessonDetail.Info';
import { LessonAssignmentsCard } from './detail/LessonDetail.Assignments';
import { LessonContinuityCard } from './detail/LessonDetail.Continuity';

export const LessonDetail = async ({
  lesson,
  canEdit = false,
  assignments = [],
  continuity = [],
  viewerIsStudent = false,
  history = [],
  songHistory = {},
  library = [],
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
}) => {
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
        />
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

        {/* A post-lesson summary only makes sense once the lesson happened —
            offering it on a scheduled lesson invites generating fiction. */}
        {SHOW_AI_FEATURES && canEdit && lesson.status?.toLowerCase() === 'completed' && (
          <div style={{ marginTop: 20 }}>
            <PostLessonSummaryAI
              studentName={studentDisplay}
              studentId={lesson.studentId}
              songsPracticed={lesson.songs.map((s) => s.title)}
              teacherNotes={lesson.notes ?? undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
};
