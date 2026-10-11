import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { TeacherDayStats } from '@/lib/services/teacher-dashboard-queries';
import { getIsoWeek } from '@/components/dashboard/topbar/topbar.helpers';

import { greetingName } from '../greeting.helpers';

import { greetingFor, totalMinutesLabel } from './teacher-format.helpers';

type Props = {
  fullName: string | null;
  email: string;
  now: Date;
  stats: TeacherDayStats;
  /** The most pressing student flag, phrased as one sentence (or null). */
  insight?: { name: string; text: string } | null;
};

/** Claude Design greeting: dated eyebrow, "Good afternoon, *Sarah*.", one insight, two actions. */
export const TeacherGreeting = ({ fullName, email, now, stats, insight }: Props) => {
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
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
          {day} · {date}, {now.getFullYear()} · Week {getIsoWeek(now)}
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
          {greetingFor(now)},{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>{first}</em>.
        </h1>
        <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 8, maxWidth: 560 }}>
          {insight ? (
            <>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{insight.name}</span>{' '}
              {insight.text}
            </>
          ) : stats.count === 0 ? (
            <>No lessons on your books today. A good day to refine the library.</>
          ) : (
            <>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {stats.count} lesson{stats.count === 1 ? '' : 's'}
              </span>{' '}
              today · {totalMinutesLabel(stats.totalMinutes)} of teaching.
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link
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
          Assignments
        </Link>
        <Link
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
          <Plus size={12} strokeWidth={1.8} aria-hidden="true" /> New lesson
        </Link>
      </div>
    </div>
  );
};
