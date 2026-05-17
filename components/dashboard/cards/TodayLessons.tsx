import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/dashboard/states';
import { createClient } from '@/lib/supabase/server';
import { formatLessonTime, getTodayBounds, type TodayLessonRow } from './TodayLessons.helpers';

interface TodayLessonsProps {
  teacherId: string;
}

async function fetchTodayLessons(teacherId: string): Promise<TodayLessonRow[]> {
  const supabase = await createClient();
  const { start, end } = getTodayBounds();
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
  return data as unknown as TodayLessonRow[];
}

export async function TodayLessons({ teacherId }: TodayLessonsProps) {
  const lessons = await fetchTodayLessons(teacherId);

  return (
    <Card data-testid="today-lessons-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Today&apos;s lessons
          <Badge variant="secondary" className="ml-auto">
            {lessons.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {lessons.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState icon={Calendar} title="No lessons today" />
          </div>
        ) : (
          <ul className="divide-y" data-testid="today-lessons-list">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/dashboard/lessons/${l.id}`}
                  className="hover:bg-muted/50 flex items-center gap-3 px-6 py-3 text-sm"
                  data-testid="today-lessons-row"
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
        )}
      </CardContent>
    </Card>
  );
}
