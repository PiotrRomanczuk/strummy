import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { startOfDay, endOfDay } from 'date-fns';
import { logger } from '@/lib/logger';

export interface DashboardNotification {
  id: string;
  type: 'info' | 'warning' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  action?: {
    label: string;
    href: string;
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications: DashboardNotification[] = [];
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();

    // 1. Fetch today's scheduled lessons
    const { data: todayLessons } = await supabase
      .from('lessons')
      .select('id, scheduled_at, status, profile:profiles!lessons_student_id_fkey(full_name)')
      .gte('scheduled_at', todayStart)
      .lte('scheduled_at', todayEnd)
      .eq('status', 'SCHEDULED');

    if (todayLessons && todayLessons.length > 0) {
      const studentNames = todayLessons
        .map((l) => {
          const profiles = l.profile as unknown as { full_name: string | null }[] | null;
          return profiles?.[0]?.full_name || 'a student';
        })
        .slice(0, 3);

      const nameList =
        todayLessons.length <= 3
          ? studentNames.join(', ')
          : `${studentNames.join(', ')} and ${todayLessons.length - 3} more`;

      notifications.push({
        id: 'today-lessons',
        type: 'info',
        title: `${todayLessons.length} lesson${todayLessons.length === 1 ? '' : 's'} scheduled today`,
        message: `Upcoming with ${nameList}`,
        timestamp: now.toISOString(),
        action: {
          label: 'View Schedule',
          href: '/dashboard/lessons',
        },
      });
    }

    // 2. Fetch students needing attention (no lesson in 14+ days)
    const { data: studentProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_student', true);

    if (studentProfiles && studentProfiles.length > 0) {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const inactiveStudents: string[] = [];

      for (const profile of studentProfiles) {
        const { data: recentLessons } = await supabase
          .from('lessons')
          .select('created_at')
          .eq('student_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const hasRecentLesson =
          recentLessons &&
          recentLessons.length > 0 &&
          new Date(recentLessons[0].created_at) >= fourteenDaysAgo;

        if (!hasRecentLesson) {
          inactiveStudents.push(profile.full_name || 'Unknown');
        }
      }

      if (inactiveStudents.length > 0) {
        const namePreview = inactiveStudents.slice(0, 2).join(', ');
        const suffix =
          inactiveStudents.length > 2
            ? ` and ${inactiveStudents.length - 2} more`
            : '';

        notifications.push({
          id: 'needs-attention',
          type: 'warning',
          title: `${inactiveStudents.length} student${inactiveStudents.length === 1 ? '' : 's'} need${inactiveStudents.length === 1 ? 's' : ''} attention`,
          message: `${namePreview}${suffix} ${inactiveStudents.length === 1 ? 'has' : 'have'} not had a lesson in over 2 weeks`,
          timestamp: now.toISOString(),
          action: {
            label: 'Review Students',
            href: '/dashboard/users?filter=needs-attention',
          },
        });
      }
    }

    // 3. Fetch overdue assignments
    const { data: overdueAssignments } = await supabase
      .from('assignments')
      .select('id, student_id, due_date, profile:profiles!assignments_student_id_fkey(full_name)')
      .eq('status', 'pending')
      .lt('due_date', now.toISOString());

    if (overdueAssignments && overdueAssignments.length > 0) {
      const studentNames = [
        ...new Set(
          overdueAssignments.map((a) => {
            const profiles = a.profile as unknown as { full_name: string | null }[] | null;
            return profiles?.[0]?.full_name || 'a student';
          })
        ),
      ];
      const namePreview = studentNames.slice(0, 2).join(', ');
      const suffix =
        studentNames.length > 2
          ? ` and ${studentNames.length - 2} more`
          : '';

      notifications.push({
        id: 'overdue-assignments',
        type: 'alert',
        title: `${overdueAssignments.length} overdue assignment${overdueAssignments.length === 1 ? '' : 's'}`,
        message: `${namePreview}${suffix} ${overdueAssignments.length === 1 ? 'has' : 'have'} overdue work`,
        timestamp: now.toISOString(),
        action: {
          label: 'Review Assignments',
          href: '/dashboard/assignments',
        },
      });
    }

    return NextResponse.json(notifications);
  } catch (error) {
    logger.error('Error fetching dashboard notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
