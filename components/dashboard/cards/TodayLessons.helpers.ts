export interface TodayLessonRow {
  id: string;
  scheduled_at: string;
  status: string;
  title: string | null;
  student: { id: string; full_name: string | null; email: string };
}

export function getTodayBounds(now: Date = new Date()): { start: string; end: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function formatLessonTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
