import Link from 'next/link';
import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { HomeworkItem, StudentLastLesson } from '@/lib/services/student-home-queries';

import { cardTitle, eyebrow, HomeCard } from './StudentHomePrimitives';

type Props = { lesson: StudentLastLesson | null; homework: HomeworkItem[] };

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${weekday} · ${date}`;
};

const HomeworkRow = ({
  item,
  isFirst,
  doneLabel,
  daysLabel,
}: {
  item: HomeworkItem;
  isFirst: boolean;
  doneLabel: string;
  daysLabel: string;
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '22px minmax(0,1fr) auto',
      gap: 12,
      alignItems: 'center',
      padding: '8px 0',
      borderTop: isFirst ? '1px solid var(--rule)' : 'none',
      borderBottom: '1px solid var(--rule)',
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: `1.5px solid ${item.isDone ? 'var(--success)' : 'var(--ink-5)'}`,
        background: item.isDone ? 'var(--success)' : 'transparent',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {item.isDone && <Check size={10} color="#fff" strokeWidth={2.8} />}
    </span>
    <div
      style={{
        fontSize: 13,
        color: item.isDone ? 'var(--ink-4)' : 'var(--ink-2)',
        textDecoration: item.isDone ? 'line-through' : 'none',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {item.task}
    </div>
    {item.isDone ? (
      <span style={{ ...eyebrow, color: 'var(--success)' }}>{doneLabel}</span>
    ) : (
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
        {daysLabel}
      </span>
    )}
  </div>
);

/** "Last lesson · recap": the teacher's notes as a pull-quote, then that lesson's homework. */
export async function StudentLastLessonCard({ lesson, homework }: Props) {
  const t = await getTranslations('StudentHome');
  return (
    <HomeCard>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 12,
        }}
      >
        <div>
          <div style={eyebrow}>{t('lastLessonRecap')}</div>
          {lesson && <div style={cardTitle}>{formatWhen(lesson.scheduledAt)}</div>}
        </div>
        {lesson && (
          <Link
            href={`/dashboard/lessons/${lesson.id}`}
            style={{
              color: 'var(--ink-4)',
              fontSize: 12,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {t('openLesson')}
          </Link>
        )}
      </div>

      {!lesson ? (
        <div
          style={{
            color: 'var(--ink-4)',
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 14,
          }}
        >
          {t('noLastLesson')}
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 14,
              color: lesson.notes ? 'var(--ink-2)' : 'var(--ink-4)',
              lineHeight: 1.55,
              paddingLeft: 14,
              borderLeft: '2px solid var(--gold-dim)',
              fontStyle: 'italic',
              fontFamily: 'var(--serif)',
              whiteSpace: 'pre-line',
            }}
          >
            {lesson.notes ? `“${lesson.notes.trim()}”` : t('noRecap')}
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ ...eyebrow, marginBottom: 8 }}>{t('homework')}</div>
            {homework.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{t('noHomework')}</div>
            ) : (
              homework.map((h, i) => (
                <HomeworkRow
                  key={h.id}
                  item={h}
                  isFirst={i === 0}
                  doneLabel={t('done')}
                  daysLabel={t('daysOf7', { days: h.daysPracticed })}
                />
              ))
            )}
          </div>
        </>
      )}
    </HomeCard>
  );
}
