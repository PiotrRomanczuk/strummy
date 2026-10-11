import Link from 'next/link';

import { StudentInitials } from '@/components/lessons/LessonPrimitives';
import type { AdminAtRiskStudent } from '@/lib/services/admin-platform-queries';

import { eyebrow } from '../teacher/teacher-dashboard.styles';
import { adminHero, rowRule } from './admin-dashboard.styles';

const tone = (days: number) =>
  days > 21 ? 'var(--danger)' : days > 14 ? 'var(--warn)' : 'var(--ink-4)';

/** "Trending churn": students whose practice went quiet 8–90 days ago, longest first. */
export const AdminAtRiskCard = ({
  students,
  total,
}: {
  students: AdminAtRiskStudent[];
  total: number;
}) => (
  <section style={{ ...adminHero, padding: '24px 26px' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--danger)',
              boxShadow: '0 0 0 3px rgba(184,74,58,.18)',
            }}
          />
          <span style={{ ...eyebrow, color: 'var(--danger)' }}>Trending churn · 90d</span>
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 28,
            letterSpacing: '-0.02em',
            marginTop: 6,
          }}
        >
          {total} {total === 1 ? 'student' : 'students'} at risk
        </div>
      </div>
      <Link
        href="/dashboard/users"
        style={{ color: 'var(--ink-4)', fontSize: 12, textDecoration: 'none' }}
      >
        Open students →
      </Link>
    </div>

    {students.length === 0 ? (
      <div
        style={{
          color: 'var(--ink-4)',
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
          marginTop: 12,
        }}
      >
        Nobody has gone quiet. Lovely.
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        {students.map((s, i) => {
          const days = s.daysQuiet ?? 0;
          return (
            <div
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '30px minmax(0,1fr) 80px auto',
                gap: 10,
                alignItems: 'center',
                padding: '10px 0',
                ...rowRule(i),
              }}
            >
              <StudentInitials name={s.name} email={s.email} color={s.color} size={26} />
              <Link
                href={`/dashboard/users/${s.id}`}
                style={{ minWidth: 0, color: 'inherit', textDecoration: 'none' }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.name ?? s.email}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {s.teacher && <span style={{ color: 'var(--ink-4)' }}>{s.teacher} · </span>}No
                  practice · {days} days
                </div>
              </Link>
              <div>
                <div
                  style={{
                    textAlign: 'right',
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    color: tone(days),
                  }}
                >
                  {days}d
                </div>
                <div
                  style={{
                    height: 3,
                    background: 'var(--rule-2)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, (days / 30) * 100)}%`,
                      height: '100%',
                      background: tone(days),
                    }}
                  />
                </div>
              </div>
              {s.email ? (
                <a
                  href={`mailto:${s.email}`}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--rule)',
                    background: 'var(--card)',
                    color: 'var(--ink-2)',
                    fontSize: 10,
                    textDecoration: 'none',
                  }}
                >
                  Draft email
                </a>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>
    )}
  </section>
);
