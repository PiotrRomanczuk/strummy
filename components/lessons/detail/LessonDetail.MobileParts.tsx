import type { ReactNode } from 'react';
import Link from 'next/link';

import { StudentInitials } from '@/components/lessons/LessonPrimitives';
import type { LessonDetail } from '@/lib/services/lesson-detail-queries';

/** Building blocks of the phone lesson detail (LessonDetail.Mobile.tsx). */

export const mono = { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' } as const;
export const rowRule = (i: number) => ({
  borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
  borderBottom: '1px solid var(--rule)',
});

const personCard = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 10,
  padding: '12px 14px',
  marginBottom: 14,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  color: 'inherit',
  textDecoration: 'none',
} as const;

export const MobileSection = ({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) => (
  <section style={{ marginBottom: 14 }}>
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '6px 2px',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        marginBottom: 4,
      }}
    >
      <span>{title}</span>
      {count != null && <span style={{ color: 'var(--ink-3)' }}>· {count}</span>}
    </div>
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 10,
        padding: '4px 14px 10px',
      }}
    >
      {children}
    </div>
  </section>
);

/** The counterpart card — a link to the student for staff, plain text for the student. */
export const CounterpartCard = ({
  lesson,
  canEdit,
  counterpartDisplay,
}: {
  lesson: LessonDetail;
  canEdit: boolean;
  counterpartDisplay: string;
}) => {
  const body = (
    <>
      <StudentInitials
        name={counterpartDisplay}
        email={canEdit ? lesson.studentEmail : null}
        color={canEdit ? lesson.studentColor : lesson.teacherColor}
        size={36}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {counterpartDisplay}
        </div>
        {canEdit && lesson.studentLevel && (
          <div style={{ ...mono, fontSize: 12, textTransform: 'capitalize' }}>
            {lesson.studentLevel}
          </div>
        )}
      </div>
    </>
  );
  return canEdit ? (
    <Link href={`/dashboard/users/${lesson.studentId}`} style={personCard}>
      {body}
    </Link>
  ) : (
    <div style={personCard}>{body}</div>
  );
};
