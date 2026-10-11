import type { AssignmentRow } from '@/lib/services/assignment-list-params';

/** Bar fill: checklist completion when there is one, else a status stand-in. */
export const assignmentProgressPct = (row: AssignmentRow): number => {
  if (row.progress.total > 0) return Math.round((row.progress.done / row.progress.total) * 100);
  if (row.effectiveStatus === 'completed') return 100;
  if (row.effectiveStatus === 'in_progress') return 50;
  return 0;
};

/** "today", "1d ago", "12d ago" — how long since the row last changed. */
export const relativeDays = (iso: string, now: Date = new Date()): string => {
  const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(days) || days <= 0) return 'today';
  return `${days}d ago`;
};

/** "Due 04/30" — mono month/day as in the mockup. */
export const dueShort = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};
