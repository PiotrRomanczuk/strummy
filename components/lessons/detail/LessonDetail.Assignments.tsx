import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { LessonAssignment } from '@/lib/services/lesson-detail-queries';

import { Plus } from 'lucide-react';

import { Card, CardHeader, formatShortDate } from './LessonDetailPrimitives';
import { LessonQuickAssignAll } from './LessonDetail.QuickAssignAll';
import { lessonGhostButton } from './lesson-detail.styles';

const AddLink = async ({ studentId }: { studentId?: string }) => {
  const t = await getTranslations('Lessons');
  return (
    <Link
      // Carry the lesson's student through so the teacher isn't asked to re-pick
      // the person whose lesson they're already looking at.
      href={
        studentId
          ? `/dashboard/assignments/new?studentId=${encodeURIComponent(studentId)}`
          : '/dashboard/assignments/new'
      }
      style={lessonGhostButton}
    >
      <Plus size={11} strokeWidth={1.8} aria-hidden="true" /> {t('addShort')}
    </Link>
  );
};

const AssignmentEntry = async ({ item, isFirst }: { item: LessonAssignment; isFirst: boolean }) => {
  const t = await getTranslations('Lessons');
  const isDone = item.status === 'completed';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 0',
        borderTop: isFirst ? '1px solid var(--rule)' : 'none',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          marginTop: 2,
          borderRadius: 4,
          border: '1.5px solid var(--rule)',
          background: isDone ? 'var(--success)' : 'var(--card)',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 10,
          flex: '0 0 16px',
        }}
        aria-hidden
      >
        {isDone ? '✓' : ''}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/dashboard/assignments/${item.id}`}
          style={{
            fontSize: 13,
            lineHeight: 1.4,
            textDecoration: isDone ? 'line-through' : 'none',
            color: isDone ? 'var(--ink-4)' : 'var(--ink-2)',
            display: 'block',
          }}
        >
          {item.title}
        </Link>
        {item.dueDate && (
          <div
            style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}
          >
            {t('dueDate', { date: formatShortDate(item.dueDate) })}
          </div>
        )}
      </div>
    </div>
  );
};

export const LessonAssignmentsCard = async ({
  assignments,
  canEdit,
  studentId,
  lessonId,
  songs = [],
}: {
  assignments: LessonAssignment[];
  canEdit: boolean;
  studentId?: string;
  lessonId?: string;
  /** This lesson's songs — the quick-assign button turns them into homework. */
  songs?: { id: string; title: string }[];
}) => {
  const t = await getTranslations('Lessons');
  return (
    <Card>
      <CardHeader
        eyebrow={t('homeworkEyebrow')}
        title={
          <>
            {t('assignmentsHeading')}{' '}
            <span style={{ color: 'var(--ink-4)', fontSize: 14, fontWeight: 400 }}>
              · {assignments.length}
            </span>
          </>
        }
        action={canEdit ? <AddLink studentId={studentId} /> : undefined}
      />
      <div style={{ padding: '0 24px 22px' }}>
        {canEdit && lessonId && studentId && songs.length > 0 && (
          <LessonQuickAssignAll
            lessonId={lessonId}
            studentId={studentId}
            songs={songs}
            hasRows={assignments.length > 0}
          />
        )}
        {assignments.length === 0 ? (
          <div
            style={{
              padding: '14px 0',
              color: 'var(--ink-4)',
              fontSize: 13,
              fontStyle: 'italic',
              fontFamily: 'var(--serif)',
            }}
          >
            {t('noHomework')}
          </div>
        ) : (
          assignments.map((item, i) => (
            <AssignmentEntry key={item.id} item={item} isFirst={i === 0} />
          ))
        )}
      </div>
    </Card>
  );
};
