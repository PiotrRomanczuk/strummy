import Link from 'next/link';
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
} from '@/lib/services/lesson-detail-queries';

import { RevisionHistoryModal } from '@/components/history/RevisionHistoryModal';

import { LessonHero } from './detail/LessonDetail.Hero';
import { LessonSongsCard } from './detail/LessonDetail.Songs';
import { LessonNotesCard } from './detail/LessonDetail.Notes';
import { LessonInfoCard } from './detail/LessonDetail.Info';
import { LessonAssignmentsCard } from './detail/LessonDetail.Assignments';
import { LessonContinuityCard } from './detail/LessonDetail.Continuity';

const navLink = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textDecoration: 'none',
  textTransform: 'uppercase',
  letterSpacing: '.14em',
} as const;

export const LessonDetail = async ({
  lesson,
  canEdit = false,
  assignments = [],
  continuity = [],
  viewerIsStudent = false,
  history = [],
}: {
  lesson: LessonDetailRow;
  canEdit?: boolean;
  assignments?: LessonAssignment[];
  continuity?: ContinuityLesson[];
  /** The signed-in user is the lesson's student, so "with X" means the teacher. */
  viewerIsStudent?: boolean;
  history?: LessonHistoryEntry[];
}) => {
  const t = await getTranslations('Lessons');
  const studentDisplay = lesson.studentName ?? lesson.studentEmail ?? t('studentFallback');
  // "with X" / "With X" name the *other* party in the lesson. Hardcoding the
  // student made a student read "with Emma Wright" about their own lesson.
  const counterpartDisplay = viewerIsStudent
    ? (lesson.teacherName ?? t('yourTeacher'))
    : studentDisplay;
  const counterpartId = viewerIsStudent ? lesson.teacherId : lesson.studentId;
  const counterpartFirstName = counterpartDisplay.split(' ')[0];

  return (
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '28px 32px 64px',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/dashboard/lessons" style={{ ...navLink, color: 'var(--ink-4)' }}>
            {t('backLink')}
          </Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {canEdit && history && history.length > 0 && (
              <RevisionHistoryModal
                history={history}
                triggerButton={
                  <button style={{ ...navLink, color: 'var(--ink-3)', letterSpacing: '.1em', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    VIEW HISTORY
                  </button>
                }
              />
            )}
            {canEdit && (
              <Link
                href={`/dashboard/lessons/${lesson.id}/edit`}
                style={{ ...navLink, color: 'var(--ink-3)', letterSpacing: '.1em' }}
              >
                {t('editLesson')}
              </Link>
            )}
          </div>
        </div>

        <LessonHero
          lesson={lesson}
          counterpartDisplay={counterpartDisplay}
          counterpartId={counterpartId}
        />

        <div className="ui-grid-hero">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <LessonSongsCard lesson={lesson} canEdit={canEdit} />
            <LessonNotesCard notes={lesson.notes} />
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
