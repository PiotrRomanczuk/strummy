import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/dashboard/states';
import { createClient } from '@/lib/supabase/server';
import { formatLessonTime } from './TodayLessons.helpers';
import {
  getUpcomingBounds,
  groupLessonsByDay,
  type UpcomingLessonRow,
} from './UpcomingLessons.helpers';

interface UpcomingLessonsProps {
  teacherId: string;
}

async function fetchUpcomingLessons(teacherId: string): Promise<UpcomingLessonRow[]> {
  const supabase = await createClient();
  const { start, end } = getUpcomingBounds();
  const { data, error } = await supabase
    .from('lessons')
    .select(
      'id, scheduled_at, status, title, student:profiles!lessons_student_id_fkey(id, full_name, email)'
    )
    .eq('teacher_id', teacherId)
    .is('deleted_at', null)
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('scheduled_at', { ascending: true });
  if (error || !data) return [];
  return data as unknown as UpcomingLessonRow[];
}

export async function UpcomingLessons({ teacherId }: UpcomingLessonsProps) {
  const lessons = await fetchUpcomingLessons(teacherId);
  const groups = groupLessonsByDay(lessons);

  return (
    <Card data-testid="upcoming-lessons-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" />
          Upcoming this week
          <Badge variant="secondary" className="ml-auto">
            {lessons.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {groups.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState icon={CalendarClock} title="Nothing scheduled this week" />
          </div>
        ) : (
          <ul className="divide-y" data-testid="upcoming-lessons-list">
            {groups.map((group) => (
              <li key={group.dateKey} data-testid="upcoming-lessons-group">
                <p className="text-muted-foreground bg-muted/30 px-6 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em]">
                  {group.label}
                </p>
                <ul className="divide-y">
                  {group.lessons.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/dashboard/lessons/${l.id}`}
                        className="hover:bg-muted/50 flex items-center gap-3 px-6 py-3 text-sm"
                        data-testid="upcoming-lessons-row"
                      >
                        <span className="text-muted-foreground w-14 shrink-0 font-mono text-xs">
                          {formatLessonTime(l.scheduled_at)}
                        </span>
                        <span className="flex-1 truncate">
                          {l.student?.full_name || l.student?.email || 'Unknown student'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {l.status}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
