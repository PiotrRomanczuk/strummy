import Link from 'next/link';
import { Check } from 'lucide-react';

import type { LessonAssignment, LessonDetail } from '@/lib/services/lesson-detail-queries';

import { mono, rowRule } from './LessonDetail.MobileParts';
import { LessonSongStepper } from './LessonDetail.SongStepper';

/** One song: key tile, title / author, and the stage stepper (no labels on phones). */
export const MobileSongRow = ({
  s,
  i,
  lessonId,
  canEdit,
}: {
  s: LessonDetail['songs'][number];
  i: number;
  lessonId: string;
  canEdit: boolean;
}) => (
  <div style={{ padding: '12px 0', ...rowRule(i) }}>
    <Link
      href={`/dashboard/songs/${s.songId}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          flex: '0 0 32px',
          background: 'linear-gradient(135deg, var(--gold-dim), var(--gold-2))',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--serif)',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--on-accent)',
        }}
      >
        {s.key ?? '—'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 15,
            fontStyle: 'italic',
            fontWeight: 500,
          }}
        >
          {s.title}
        </div>
        {s.author && <div style={mono}>{s.author}</div>}
      </div>
    </Link>
    <LessonSongStepper
      lessonId={lessonId}
      songId={s.songId}
      initialStatus={s.status}
      readOnly={!canEdit}
      hideLabels
    />
  </div>
);

/** One assignment set at this lesson: tick box, title, due date. */
export const MobileAssignmentRow = ({
  a,
  i,
  dueLabel,
}: {
  a: LessonAssignment;
  i: number;
  dueLabel: (date: string) => string;
}) => {
  const isDone = a.status === 'completed';
  return (
    <Link
      href={`/dashboard/assignments/${a.id}`}
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 0',
        color: 'inherit',
        textDecoration: 'none',
        ...rowRule(i),
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          marginTop: 2,
          borderRadius: 4,
          border: `1.5px solid ${isDone ? 'var(--success)' : 'var(--rule)'}`,
          background: isDone ? 'var(--success)' : 'var(--card)',
          display: 'grid',
          placeItems: 'center',
          flex: '0 0 16px',
        }}
      >
        {isDone && <Check size={10} color="#fff" strokeWidth={2.6} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.4 }}>{a.title}</div>
        {a.dueDate && (
          <div style={{ ...mono, marginTop: 2 }}>
            {dueLabel(
              new Date(a.dueDate).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
              })
            )}
          </div>
        )}
      </div>
    </Link>
  );
};
