import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { LessonRow } from '@/lib/services/lessons-queries';
import {
  lessonStatusColour,
  lessonStatusLabel,
  songStatusColour,
} from '@/lib/services/lessons-queries';

import { formatLessonClockShort } from './lesson-format.helpers';
import { LessonStatusPill, StudentInitials } from './LessonPrimitives';
import { buildHref, type LessonsListFilters } from './lessons-list.helpers';

type Props = {
  lessons: LessonRow[];
  count: number;
  canCreate: boolean;
  showStudent: boolean;
  filters: LessonsListFilters;
};

const PILLS = [
  ['all', 'filterAll'],
  ['scheduled', 'statusScheduled'],
  ['completed', 'statusCompleted'],
  ['cancelled', 'statusCancelled'],
] as const;

const localDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA');

const groupHeading = (iso: string) => {
  const d = new Date(iso);
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const wday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  return { day: `${mon} ${d.getDate()}`, rest: `${wday}, ${d.getFullYear()}` };
};

/** Lessons grouped by calendar day, in list order. */
const groupByDay = (lessons: LessonRow[]): [string, LessonRow[]][] => {
  const groups = new Map<string, LessonRow[]>();
  for (const l of lessons)
    groups.set(localDay(l.scheduledAt), [...(groups.get(localDay(l.scheduledAt)) ?? []), l]);
  return [...groups.entries()];
};

/** Claude Design mobile lesson list: title + round add button, pill filters, day-grouped cards. */
export async function LessonsListMobile({
  lessons,
  count,
  canCreate,
  showStudent,
  filters,
}: Props) {
  const t = await getTranslations('Lessons');
  const active = filters.statuses.length === 1 ? filters.statuses[0] : 'all';

  return (
    <div>
      <div style={{ padding: '4px 4px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              fontSize: 26,
              letterSpacing: '-0.02em',
            }}
          >
            {t('title')}
          </h1>
          {canCreate && (
            <Link
              href="/dashboard/lessons/new"
              aria-label={t('newLesson')}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--ink)',
                color: 'var(--paper)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Plus size={14} />
            </Link>
          )}
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
          {count} {count === 1 ? t('summaryLesson') : t('summaryLessons')}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '0 4px 12px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {PILLS.map(([key, label]) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={buildHref({ statuses: key === 'all' ? [] : [key] }, filters)}
              aria-current={isActive ? 'true' : undefined}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: `1px solid ${isActive ? 'var(--ink)' : 'var(--rule)'}`,
                background: isActive ? 'var(--ink)' : 'var(--card)',
                color: isActive ? 'var(--paper)' : 'var(--ink-3)',
                fontSize: 12,
                fontWeight: isActive ? 500 : 400,
                flex: '0 0 auto',
                textDecoration: 'none',
              }}
            >
              {t(label)}
            </Link>
          );
        })}
      </div>

      {groupByDay(lessons).map(([day, items]) => {
        const h = groupHeading(items[0].scheduledAt);
        return (
          <div key={day} style={{ marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 4px',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '.14em',
              }}
            >
              <span style={{ color: 'var(--gold-2)', fontWeight: 500 }}>{h.day}</span>
              <span>·</span>
              <span>{h.rest}</span>
              <span style={{ flex: 1, height: 1, background: 'var(--rule)', marginLeft: 6 }} />
            </div>
            {items.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/lessons/${l.id}`}
                style={{
                  display: 'block',
                  background: 'var(--card)',
                  border: '1px solid var(--rule)',
                  borderRadius: 10,
                  padding: '14px 14px 12px',
                  marginBottom: 8,
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        color: 'var(--ink-4)',
                        padding: '2px 6px',
                        background: 'var(--rule-2)',
                        borderRadius: 4,
                      }}
                    >
                      #{l.lessonNumber}
                    </span>
                    <span
                      style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}
                    >
                      {formatLessonClockShort(l.scheduledAt)}
                    </span>
                  </div>
                  <LessonStatusPill
                    label={lessonStatusLabel(l.status, t, l.scheduledAt)}
                    colour={lessonStatusColour(l.status, l.scheduledAt)}
                  />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 17,
                    fontWeight: 500,
                    fontStyle: l.title ? 'normal' : 'italic',
                    color: l.title ? 'var(--ink)' : 'var(--ink-4)',
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                    marginBottom: showStudent ? 10 : 0,
                  }}
                >
                  {l.title ?? t('untitledLesson')}
                </div>
                {showStudent && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <StudentInitials
                      name={l.studentName}
                      email={l.studentEmail}
                      color={l.studentColor}
                      size={22}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {l.studentName ?? l.studentEmail ?? t('studentFallback')}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>·</span>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        color: 'var(--ink-3)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {l.songCount} {l.songCount === 1 ? t('song') : t('songs')}
                    </span>
                    {l.songStatuses.length > 0 && (
                      <span
                        style={{ display: 'inline-flex', gap: 3, marginLeft: 'auto' }}
                        aria-hidden="true"
                      >
                        {l.songStatuses.slice(0, 5).map((s, i) => (
                          <span
                            key={i}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: songStatusColour(s),
                            }}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
