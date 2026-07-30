import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { LessonAssignment } from '@/lib/services/lesson-detail-queries';

import { Card, CardHeader, formatShortDate } from './primitives';

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
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 11,
        color: 'var(--gold-2)',
        textDecoration: 'none',
        textTransform: 'uppercase',
        letterSpacing: '.1em',
      }}
    >
      {t('addLink')}
    </Link>
  );
};

const AssignmentEntry = async ({ item, isLast }: { item: LessonAssignment; isLast: boolean }) => {
  const t = await getTranslations('Lessons');
  const isDone = item.status === 'completed';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '11px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--rule)',
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
}: {
  assignments: LessonAssignment[];
  canEdit: boolean;
  studentId?: string;
}) => {
  const t = await getTranslations('Lessons');
  return (
    <Card>
      <CardHeader
        eyebrow={t('homeworkEyebrow')}
        title={t('assignmentsTitle', { count: assignments.length })}
        action={canEdit ? <AddLink studentId={studentId} /> : undefined}
      />
      <div style={{ padding: '6px 24px 18px' }}>
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
            <AssignmentEntry key={item.id} item={item} isLast={i === assignments.length - 1} />
          ))
        )}
      </div>
    </Card>
  );
};
