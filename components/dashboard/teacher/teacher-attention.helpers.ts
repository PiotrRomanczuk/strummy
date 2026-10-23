import type {
  AtRiskStudent,
  OverdueAssignmentRow,
} from '@/lib/services/teacher-dashboard-backfill-queries';
import type { StudentToInvite } from '@/lib/services/teacher-invite-queries';

/**
 * Why a student is flagged, as data. The sentence is rendered by the card in
 * the viewer's language (`attentionReasonText`); building English strings
 * here is how "Assignment overdue 2 days" reached the Polish dashboard.
 */
export type AttentionReason =
  | { kind: 'inviteAfterFirstLesson' }
  | { kind: 'noPracticeYet' }
  | { kind: 'noPracticeDays'; days: number }
  | { kind: 'overdue'; days: number };

export type AttentionFlag = {
  key: string;
  name: string | null;
  email: string | null;
  reason: AttentionReason;
  /** The student's profile for a practice gap, the assignment for overdue work. */
  href: string;
};

const daysOverdue = (dueDate: string | null, now: Date): number =>
  dueDate ? Math.max(1, Math.floor((now.getTime() - Date.parse(dueDate)) / 86_400_000)) : 1;

/** New students to invite first (they have no account yet), then practice gaps, then overdue homework. */
export const buildAttentionFlags = (
  atRisk: AtRiskStudent[],
  overdue: OverdueAssignmentRow[],
  now: Date,
  limit = 5,
  toInvite: StudentToInvite[] = []
): AttentionFlag[] =>
  [
    ...toInvite.map((s): AttentionFlag => ({
      key: `i-${s.studentId}`,
      name: s.name,
      email: s.email,
      // The student page carries the Invite button.
      href: `/dashboard/users/${s.studentId}`,
      reason: { kind: 'inviteAfterFirstLesson' },
    })),
    ...atRisk.map((s): AttentionFlag => ({
      key: `p-${s.studentId}`,
      name: s.name,
      email: s.email,
      href: `/dashboard/users/${s.studentId}`,
      reason:
        s.daysSincePractice == null
          ? { kind: 'noPracticeYet' }
          : { kind: 'noPracticeDays', days: s.daysSincePractice },
    })),
    ...overdue.map((a): AttentionFlag => ({
      key: `a-${a.id}`,
      name: a.studentName,
      email: a.studentEmail,
      href: `/dashboard/assignments/${a.id}`,
      reason: { kind: 'overdue', days: daysOverdue(a.dueDate, now) },
    })),
  ].slice(0, limit);

type Translate = (key: string, values?: Record<string, number>) => string;

/** The flag's sentence in the `TeacherHome` namespace. */
export const attentionReasonText = (t: Translate, reason: AttentionReason): string => {
  if (reason.kind === 'inviteAfterFirstLesson') return t('reasonInviteAfterFirstLesson');
  if (reason.kind === 'noPracticeYet') return t('reasonNoPracticeYet');
  if (reason.kind === 'noPracticeDays') return t('reasonNoPracticeDays', { days: reason.days });
  return t('reasonOverdue', { days: reason.days });
};
