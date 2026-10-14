import Link from 'next/link';
import { format } from 'date-fns';

import type { LessonRow } from '@/lib/services/lessons-queries';
import { cn } from '@/lib/utils';

// Standard-theme dot colours (the calendar page doesn't load tokens).
export const STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-muted-foreground',
};

/** One lesson inside a month-grid cell (md and up). */
export const EventChip = ({
  lesson,
  showStudent,
  lessonFallback,
}: {
  lesson: LessonRow;
  showStudent: boolean;
  lessonFallback: string;
}) => {
  const label = showStudent
    ? (lesson.studentName ?? lesson.studentEmail ?? lessonFallback)
    : (lesson.title ?? lessonFallback);
  return (
    <Link
      href={`/dashboard/lessons/${lesson.id}`}
      title={`${format(new Date(lesson.scheduledAt), 'HH:mm')} · ${label}`}
      className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] leading-tight hover:bg-muted"
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          STATUS_DOT[lesson.status.toLowerCase()] ?? 'bg-muted-foreground'
        )}
      />
      <span className="tabular-nums text-muted-foreground">
        {format(new Date(lesson.scheduledAt), 'HH:mm')}
      </span>
      <span className="truncate text-foreground">{label}</span>
    </Link>
  );
};
