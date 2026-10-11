import Link from 'next/link';

import { StudentInitials } from '@/components/lessons/LessonPrimitives';
import type {
  AtRiskStudent,
  OverdueAssignmentRow,
} from '@/lib/services/teacher-dashboard-backfill-queries';

import { buildAttentionFlags } from './teacher-attention.helpers';
import { card, eyebrow } from './teacher-dashboard.styles';

/** "Needs attention · Before today's lessons" — practice gaps and overdue homework. */
export const NeedsAttentionCard = ({
  atRisk,
  overdue,
  now,
}: {
  atRisk: AtRiskStudent[];
  overdue: OverdueAssignmentRow[];
  now: Date;
}) => {
  const flags = buildAttentionFlags(atRisk, overdue, now);
  const students = new Set(flags.map((f) => f.email ?? f.name)).size;
  if (flags.length === 0) return null;
  return (
    <div style={card}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span style={{ ...eyebrow, color: 'var(--danger)' }}>Needs attention</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          {flags.length} flags · {students} students
        </span>
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 12 }}>
        Before today’s lessons
      </div>
      {flags.map((f, i) => (
        <div
          key={f.key}
          data-testid="attention-row"
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 10,
            alignItems: 'center',
            padding: '10px 0',
            borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <StudentInitials name={f.name} email={f.email} size={26} />
          <Link href={f.href} style={{ minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {f.name ?? f.email}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{f.reason}</div>
          </Link>
          {f.email && (
            <a
              href={`mailto:${f.email}`}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--rule)',
                background: 'var(--card)',
                fontSize: 10,
                color: 'var(--ink-2)',
                textDecoration: 'none',
              }}
            >
              Reach out
            </a>
          )}
        </div>
      ))}
    </div>
  );
};
