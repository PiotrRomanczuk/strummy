'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { StudentInitials } from '@/components/lessons/LessonPrimitives';
import type { StudioHealth, StudioStudent } from '@/lib/services/teacher-dashboard-studio-queries';

import { eyebrow } from './teacher-dashboard.styles';
import { formatClock, levelLabel } from './teacher-format.helpers';

type Sort = 'health' | 'recent' | 'az';

const HEALTH_COLOR: Record<StudioHealth, string> = {
  good: 'var(--success)',
  needs_attention: 'var(--warn)',
  at_risk: 'var(--danger)',
};

const nextLabel = (
  iso: string | null,
  now: Date,
  locale: string
): { text: string; isToday: boolean } => {
  if (!iso) return { text: '—', isToday: false };
  const d = new Date(iso);
  const isToday = d.toDateString() === now.toDateString();
  const dateLocale = locale.startsWith('en') ? 'en-US' : locale;
  return {
    text: isToday
      ? formatClock(iso, locale)
      : d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }),
    isToday,
  };
};

const sorters: Record<Sort, (a: StudioStudent, b: StudioStudent) => number> = {
  health: () => 0,
  recent: (a, b) => (a.daysSincePractice ?? 1e9) - (b.daysSincePractice ?? 1e9),
  az: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
};

/** "Studio · N active students" — health-sorted roster with songs, mastery and next lesson. */
export const StudioRosterCard = ({
  total,
  rows,
  now,
}: {
  total: number;
  rows: StudioStudent[];
  /** Server render time — a client `new Date()` would drift from the SSR'd labels. */
  now: Date;
}) => {
  const t = useTranslations('TeacherHome');
  const locale = useLocale();
  const [sort, setSort] = useState<Sort>('health');
  const sorted = [...rows].sort(sorters[sort]);
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: 'var(--shadow-sm)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div>
          <div style={eyebrow}>{t('studio')}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 }}>
            {t('activeStudents', { count: total })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(
            [
              ['health', t('sortHealth')],
              ['recent', t('sortRecent')],
              ['az', t('sortAz')],
            ] as [Sort, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: sort === k ? 'var(--ink)' : 'transparent',
                color: sort === k ? 'var(--paper)' : 'var(--ink-3)',
                border: sort === k ? 'none' : '1px solid var(--rule)',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {sorted.map((s, i) => {
        const next = nextLabel(s.nextLessonAt, now, locale);
        return (
          <Link
            prefetch={false}
            key={s.studentId}
            href={`/dashboard/users/${s.studentId}`}
            className="ui-row ui-roster-row"
            style={{
              alignItems: 'center',
              padding: '10px 0',
              borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: '1px solid var(--rule)',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <StudentInitials name={s.name} email={s.email} color={s.color} size={26} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.name ?? s.email}
                </span>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: HEALTH_COLOR[s.health],
                    boxShadow: `0 0 0 3px color-mix(in srgb, ${HEALTH_COLOR[s.health]} 15%, transparent)`,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ink-4)',
                  fontFamily: 'var(--mono)',
                  textTransform: 'uppercase',
                }}
              >
                {s.level ? levelLabel(t, s.level) : '—'}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
              <div>{t('songCount', { count: s.songs })}</div>
              <div>
                {s.daysSincePractice == null
                  ? t('noPractice')
                  : t('daysAgo', { days: s.daysSincePractice })}
              </div>
            </div>
            <div
              style={{
                height: 4,
                background: 'var(--rule-2)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${s.masteredPct}%`,
                  height: '100%',
                  background:
                    s.health === 'at_risk'
                      ? 'var(--danger)'
                      : s.health === 'needs_attention'
                        ? 'var(--warn)'
                        : 'var(--gold-2)',
                }}
              />
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: next.isToday ? 'var(--gold-2)' : 'var(--ink-3)',
                fontWeight: next.isToday ? 500 : 400,
                textAlign: 'right',
              }}
            >
              {next.text}
            </div>
          </Link>
        );
      })}
    </div>
  );
};
