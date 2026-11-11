import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import type { TeacherDayStats } from '@/lib/services/teacher-dashboard-queries';
import { getIsoWeek } from '@/components/dashboard/topbar/topbar.helpers';

import { greetingName } from '../greeting.helpers';

import { greetingKeyFor, totalMinutesLabel } from './teacher-format.helpers';

type Props = {
  fullName: string | null;
  email: string;
  now: Date;
  stats: TeacherDayStats;
  /** The most pressing practice gap (or null); phrased here, in the viewer's language. */
  insight?: { name: string; daysSincePractice: number | null } | null;
};

/** Claude Design greeting: dated eyebrow, "Good afternoon, *Sarah*.", one insight, two actions. */
export const TeacherGreeting = async ({ fullName, email, now, stats, insight }: Props) => {
  const [t, locale] = await Promise.all([getTranslations('TeacherHome'), getLocale()]);
  const dateLocale = locale.startsWith('en') ? 'en-US' : locale;
  const day = now.toLocaleDateString(dateLocale, { weekday: 'long' });
  const date = now.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' });
  const first = greetingName(fullName, email);

  return (
    <div className="ui-page-head" style={{ alignItems: 'flex-end', marginBottom: 20 }}>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: 'var(--ink-4)',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '.16em',
            marginBottom: 6,
          }}
        >
          {t('eyebrowDate', { day, date, year: now.getFullYear(), week: getIsoWeek(now) })}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 38,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            overflowWrap: 'anywhere',
          }}
        >
          {t(greetingKeyFor(now))},{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>{first}</em>.
        </h1>
        <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 8, maxWidth: 560 }}>
          {insight ? (
            <>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{insight.name}</span>{' '}
              {insight.daysSincePractice == null
                ? t('insightNoPracticeYet')
                : t('insightNoPracticeDays', { days: insight.daysSincePractice })}
            </>
          ) : stats.count === 0 ? (
            <>{t('noLessonsToday')}</>
          ) : (
            <>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {t('lessonCount', { count: stats.count })}
              </span>{' '}
              {t('todayTeaching', { total: totalMinutesLabel(stats.totalMinutes) })}
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link
          prefetch={false}
          href="/dashboard/assignments"
          style={{
            padding: '9px 14px',
            borderRadius: 8,
            border: '1px solid var(--rule)',
            background: 'var(--card)',
            color: 'var(--ink-2)',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          {t('assignments')}
        </Link>
        <Link
          prefetch={false}
          href="/dashboard/lessons/new"
          style={{
            padding: '9px 14px',
            borderRadius: 8,
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontSize: 13,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
          }}
        >
          <Plus size={12} strokeWidth={1.8} aria-hidden="true" /> {t('newLesson')}
        </Link>
      </div>
    </div>
  );
};
