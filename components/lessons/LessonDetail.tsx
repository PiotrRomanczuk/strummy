import Link from 'next/link';

import { PostLessonSummaryAI } from '@/components/lessons/PostLessonSummaryAI';
import { SHOW_AI_FEATURES } from '@/lib/config/features';
import type {
  ContinuityLesson,
  LessonAssignment,
  // Aliased: the query-layer row type and this component now share the plain
  // name, and the component owns the file.
  LessonDetail as LessonDetailRow,
} from '@/lib/services/lesson-detail-queries';

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

export const LessonDetail = ({
  lesson,
  canEdit = false,
  assignments = [],
  continuity = [],
}: {
  lesson: LessonDetailRow;
  canEdit?: boolean;
  assignments?: LessonAssignment[];
  continuity?: ContinuityLesson[];
}) => {
  const studentDisplay = lesson.studentName ?? lesson.studentEmail ?? 'Student';
  const studentFirstName = studentDisplay.split(' ')[0];

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
            ← Lessons
          </Link>
          {canEdit && (
            <Link
              href={`/dashboard/lessons/${lesson.id}/edit`}
              style={{ ...navLink, color: 'var(--ink-3)', letterSpacing: '.1em' }}
            >
              Edit lesson
            </Link>
          )}
        </div>

        <LessonHero lesson={lesson} studentDisplay={studentDisplay} />

        <div className="ui-grid-hero">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <LessonSongsCard lesson={lesson} canEdit={canEdit} />
            <LessonNotesCard notes={lesson.notes} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <LessonInfoCard
              lesson={lesson}
              studentDisplay={studentDisplay}
              studentFirstName={studentFirstName}
            />
            <LessonAssignmentsCard assignments={assignments} canEdit={canEdit} />
            <LessonContinuityCard lessons={continuity} studentFirstName={studentFirstName} />
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
