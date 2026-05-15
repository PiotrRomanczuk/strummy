import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calculateHealthScore, HealthFactors, HealthStatus } from '@/lib/utils/studentHealth';
import { getTeacherStudentIds } from '@/lib/queries/teacher-students';
import { logger } from '@/lib/logger';

export interface StudentHealth {
  id: string;
  name: string;
  email: string;
  healthScore: number;
  healthStatus: HealthStatus;
  lastLesson: Date | null;
  lessonsThisMonth: number;
  overdueAssignments: number;
  recommendedAction: string;
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

    // Verify user is admin or teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_teacher')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_teacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get only students taught by this teacher
    const studentIds = await getTeacherStudentIds(supabase, user.id);
    const { data: studentProfiles } = studentIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, email').in('id', studentIds)
      : { data: [] };

    if (!studentProfiles || studentProfiles.length === 0) {
      return NextResponse.json([]);
    }

    const studentHealthData: StudentHealth[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const profile of studentProfiles) {
      // Get all lessons for this student
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('created_at, status')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

      // Get lessons from last 30 days
      const { data: recentLessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('student_id', profile.id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get assignments
      const { data: allAssignments } = await supabase
        .from('assignments')
        .select('status, due_date')
        .eq('student_id', profile.id);

      // Calculate factors
      const totalLessons = allLessons?.length || 0;
      const lessonsThisMonth = recentLessons?.length || 0;
      const lastLessonDate = allLessons?.[0] ? new Date(allLessons[0].created_at) : null;
      const daysSinceLastLesson = lastLessonDate
        ? Math.floor((now.getTime() - lastLessonDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const completedAssignments =
        allAssignments?.filter((a) => a.status === 'completed').length || 0;
      const totalAssignments = allAssignments?.length || 0;
      const assignmentCompletionRate =
        totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 50; // Default to 50 if no assignments

      const overdueAssignments =
        allAssignments?.filter((a) => a.status === 'pending' && new Date(a.due_date) < now)
          .length || 0;

      // For now, use daysSinceLastLesson as proxy for last contact
      // In future, track actual communications
      const daysSinceLastContact = daysSinceLastLesson;

      const factors: HealthFactors = {
        daysSinceLastLesson,
        lessonsPerMonth: lessonsThisMonth,
        assignmentCompletionRate,
        daysSinceLastContact,
        totalLessonsCompleted: totalLessons,
      };

      const healthData = calculateHealthScore(factors);

      studentHealthData.push({
        id: profile.id,
        name: profile.full_name || profile.email || 'Unknown Student',
        email: profile.email || '',
        healthScore: healthData.score,
        healthStatus: healthData.status,
        lastLesson: lastLessonDate,
        lessonsThisMonth,
        overdueAssignments,
        recommendedAction: healthData.recommendedAction,
      });
    }

    // Sort by health score (worst first)
    studentHealthData.sort((a, b) => a.healthScore - b.healthScore);

    return NextResponse.json(studentHealthData);
  } catch (error) {
    logger.error('Error fetching student health:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
