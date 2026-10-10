import type {
  AtRiskStudent,
  OverdueAssignmentRow,
} from '@/lib/services/teacher-dashboard-backfill-queries';

export type AttentionFlag = {
  key: string;
  name: string | null;
  email: string | null;
  reason: string;
};

const daysOverdue = (dueDate: string | null, now: Date): string =>
  dueDate
    ? String(Math.max(1, Math.floor((now.getTime() - Date.parse(dueDate)) / 86_400_000)))
    : '';

/** Practice gaps first, then overdue homework — the "Needs attention" rows. */
export const buildAttentionFlags = (
  atRisk: AtRiskStudent[],
  overdue: OverdueAssignmentRow[],
  now: Date,
  limit = 5
): AttentionFlag[] =>
  [
    ...atRisk.map((s) => ({
      key: `p-${s.studentId}`,
      name: s.name,
      email: s.email,
      reason:
        s.daysSincePractice == null
          ? 'No practice logged yet'
          : `No practice logged in ${s.daysSincePractice} days`,
    })),
    ...overdue.map((a) => ({
      key: `a-${a.id}`,
      name: a.studentName,
      email: a.studentEmail,
      reason: `Assignment overdue ${daysOverdue(a.dueDate, now)} days`,
    })),
  ].slice(0, limit);
