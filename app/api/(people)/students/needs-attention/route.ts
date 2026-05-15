import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTeacherStudentIds } from '@/lib/queries/teacher-students';
import { logger } from '@/lib/logger';

interface AttentionItem {
  id: string;
  studentId: string;
  studentName: string;
  reason: 'no_recent_lesson' | 'overdue_assignment' | 'inactive';
  daysAgo: number;
  actionUrl: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attentionItems: AttentionItem[] = [];
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Get only students taught by this teacher
    const studentIds = await getTeacherStudentIds(supabase, user.id);
    const { data: studentProfiles } = studentIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, email').in('id', studentIds)
      : { data: [] };

    if (!studentProfiles || studentProfiles.length === 0) {
      return NextResponse.json([]);
    }

    // Check each student for issues
    for (const profile of studentProfiles) {
      const studentName = profile.full_name || profile.email || 'Unknown Student';

      // Check for recent lessons
      const { data: recentLessons } = await supabase
        .from('lessons')
        .select('created_at')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!recentLessons || recentLessons.length === 0) {
        // No lessons at all - inactive student
        attentionItems.push({
          id: `inactive-${profile.id}`,
          studentId: profile.id,
          studentName,
          reason: 'inactive',
          daysAgo: 999, // Arbitrary large number
          actionUrl: `/dashboard/lessons?student=${profile.id}`,
        });
      } else {
        const lastLessonDate = new Date(recentLessons[0].created_at);
        if (lastLessonDate < fourteenDaysAgo) {
          const daysAgo = Math.floor(
            (new Date().getTime() - lastLessonDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          attentionItems.push({
            id: `no-lesson-${profile.id}`,
            studentId: profile.id,
            studentName,
            reason: 'no_recent_lesson',
            daysAgo,
            actionUrl: `/dashboard/lessons?student=${profile.id}`,
          });
        }
      }

      // Check for overdue assignments
      const { data: overdueAssignments } = await supabase
        .from('assignments')
        .select('due_date')
        .eq('student_id', profile.id)
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(1);

      if (overdueAssignments && overdueAssignments.length > 0) {
        const dueDate = new Date(overdueAssignments[0].due_date);
        const daysAgo = Math.floor(
          (new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        attentionItems.push({
          id: `overdue-${profile.id}`,
          studentId: profile.id,
          studentName,
          reason: 'overdue_assignment',
          daysAgo,
          actionUrl: `/dashboard/assignments?student=${profile.id}`,
        });
      }
    }

    // Sort by severity (overdue > no_recent_lesson > inactive) and then by days
    const severityOrder = { overdue_assignment: 1, no_recent_lesson: 2, inactive: 3 };
    attentionItems.sort((a, b) => {
      if (severityOrder[a.reason] !== severityOrder[b.reason]) {
        return severityOrder[a.reason] - severityOrder[b.reason];
      }
      return b.daysAgo - a.daysAgo;
    });

    return NextResponse.json(attentionItems);
  } catch (error) {
    logger.error('Error fetching needs attention:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
