import Link from 'next/link';
import { Check, Play } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { StudentInitials } from '@/components/lessons/LessonPrimitives';
import type { PracticeSetItem, StudentHomeLesson } from '@/lib/services/student-home-queries';

import { eyebrow } from './StudentHomePrimitives';

type Props = {
  items: PracticeSetItem[];
  minutesToday: number;
  /** The next lesson carries the teacher and their plan note. */
  lesson: StudentHomeLesson | null;
};

const PracticeRow = ({
  item,
  keyLabel,
  openLabel,
}: {
  item: PracticeSetItem;
  keyLabel: string;
  openLabel: string;
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '28px 38px minmax(0,1fr) auto auto',
      gap: 14,
      alignItems: 'center',
      padding: '12px 0',
      borderTop: '1px solid var(--rule)',
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        border: `1.5px solid ${item.isDoneToday ? 'var(--gold-2)' : 'var(--ink-5)'}`,
        background: item.isDoneToday ? 'var(--gold-2)' : 'transparent',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {item.isDoneToday && <Check size={11} color="#fff" strokeWidth={2.6} />}
    </span>
    <div
      style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', textAlign: 'right' }}
    >
      <span
        style={{ display: 'block', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase' }}
      >
        {keyLabel}
      </span>
      <span
        style={{
          display: 'block',
          color: item.musicalKey ? 'var(--gold-2)' : 'var(--ink-5)',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        {item.musicalKey ?? '—'}
      </span>
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 17,
          fontStyle: item.isSong ? 'italic' : 'normal',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          textDecoration: item.isDoneToday ? 'line-through' : 'none',
          color: item.isDoneToday ? 'var(--ink-4)' : 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.title}
      </div>
      {item.sub && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-3)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.sub}
        </div>
      )}
    </div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
      {item.minutes}m
    </div>
    <Link
      href={`/dashboard/assignments/${item.assignmentId}`}
      aria-label={openLabel}
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: 'var(--rule-2)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--ink-2)',
      }}
    >
      <Play size={11} fill="currentColor" strokeWidth={0} />
    </Link>
  </div>
);

/** Hero, right half: today's set list from open assignments, plus the teacher's note. */
export async function StudentPracticeSet({ items, minutesToday, lesson }: Props) {
  const t = await getTranslations('StudentHome');
  const goal = items.reduce((sum, i) => sum + i.minutes, 0);
  const note = lesson?.notes
    ?.split('\n')
    .find((l) => l.trim())
    ?.trim();
  const teacherFirst = (lesson?.teacher.name ?? '').split(' ')[0] || t('teacherFallback');

  return (
    <div className="ui-student-hero-right">
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={eyebrow}>{t('todaysPractice')}</div>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 22,
              letterSpacing: '-0.01em',
              marginTop: 2,
            }}
          >
            {t('setSummary', { minutes: goal, count: items.length })}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          {t('todayProgress', { done: minutesToday, goal })}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {items.length === 0 ? (
          <div
            style={{
              borderTop: '1px solid var(--rule)',
              padding: '18px 0',
              color: 'var(--ink-4)',
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 14,
            }}
          >
            {t('emptySet')}
          </div>
        ) : (
          items.map((item) => (
            <PracticeRow
              key={item.assignmentId}
              item={item}
              keyLabel={t('key')}
              openLabel={t('openPiece', { title: item.title })}
            />
          ))
        )}
      </div>

      {note && lesson && (
        <div
          style={{
            background: 'var(--rule-2)',
            border: '1px dashed var(--gold-dim)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            color: 'var(--ink-3)',
            lineHeight: 1.45,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <StudentInitials
            name={lesson.teacher.name}
            email={lesson.teacher.email}
            color={lesson.teacher.color}
            size={22}
          />
          <div>
            <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>
              {t('teacherNote', { name: teacherFirst })}
            </span>{' '}
            <em>&ldquo;{note}&rdquo;</em>
          </div>
        </div>
      )}
    </div>
  );
}
