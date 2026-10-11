'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { NextLesson } from '@/lib/services/student-health-queries';

const formatWhen = (iso: string): string => {
  const d = new Date(iso);
  const day = d
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .replace(',', ' ·');
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
};

/** Claude Design "Next lesson" card: gold wash when booked, red when nothing is. */
export const NextLessonCard = ({
  lesson,
  studentId,
  isAtRisk,
}: {
  lesson: NextLesson;
  studentId: string;
  isAtRisk: boolean;
}) => {
  const t = useTranslations('Users');
  const isEmpty = !lesson;
  const danger = isEmpty && isAtRisk;
  return (
    <div
      style={{
        background: danger
          ? 'color-mix(in srgb, var(--danger) 10%, var(--card))'
          : 'var(--gold-tint)',
        border: `1px solid ${danger ? 'color-mix(in srgb, var(--danger) 25%, var(--card))' : 'color-mix(in srgb, var(--gold) 25%, var(--gold-tint))'}`,
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          color: danger ? 'var(--danger)' : 'var(--gold-2)',
        }}
      >
        <Calendar size={16} strokeWidth={2} aria-hidden="true" />
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          {t('detailNextLessonTitle')}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 20,
          fontWeight: 500,
          color: danger ? 'var(--danger)' : 'var(--ink)',
        }}
      >
        {lesson ? formatWhen(lesson.scheduledAt) : t('detailNotScheduled')}
      </div>
      {lesson ? (
        <div
          style={{
            fontSize: 13,
            color: 'var(--ink-3)',
            marginTop: 6,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {lesson.title && <span>{lesson.title}</span>}
          <Link
            href={`/dashboard/lessons/${lesson.id}`}
            style={{ color: 'var(--gold-2)', fontWeight: 500, textDecoration: 'none' }}
          >
            {t('detailNextLessonViewLink')}
          </Link>
        </div>
      ) : (
        <Link
          href={`/dashboard/lessons/new?studentId=${encodeURIComponent(studentId)}`}
          style={{
            marginTop: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 8,
            background: danger ? 'var(--danger)' : 'var(--ink)',
            color: 'var(--on-accent)',
            textDecoration: 'none',
          }}
        >
          <Calendar size={15} strokeWidth={2} aria-hidden="true" />{' '}
          {danger ? t('detailRescheduleNow') : t('detailNextLessonScheduleLink')}
        </Link>
      )}
    </div>
  );
};
