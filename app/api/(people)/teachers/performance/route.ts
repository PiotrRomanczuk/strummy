import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  formatTeacherMetrics,
  generate12MonthTrends,
  type TeacherPerformanceMetrics,
  type TeacherLessonTrend,
} from '@/lib/services/teacher-performance';
import { logger } from '@/lib/logger';

/**
 * GET /api/teachers/performance
 * Returns teacher performance metrics and trends
 * - Teachers: see own performance data
 * - Admins: see all teachers or specific teacher (query param: teacherId)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isAdmin = profile.role === 'admin';
    const isTeacher = profile.role === 'teacher';

    if (!isAdmin && !isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get teacherId from query params (admins can view any teacher)
    const { searchParams } = new URL(request.url);
    const requestedTeacherId = searchParams.get('teacherId');

    let targetTeacherId: string;

    if (requestedTeacherId) {
      // Admin can view any teacher, teachers can only view themselves
      if (!isAdmin && requestedTeacherId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      targetTeacherId = requestedTeacherId;
    } else {
      // No teacherId specified - return current user's data
      targetTeacherId = user.id;
    }

    // Query materialized view for performance metrics
    const { data: metricsData, error: metricsError } = await supabase
      .from('mv_teacher_performance')
      .select('*')
      .eq('teacher_id', targetTeacherId)
      .single();

    if (metricsError) {
      logger.error('[API /api/teachers/performance] Metrics error:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch performance metrics' },
        { status: 500 }
      );
    }

    // Query trends view for 12-month trends
    const { data: trendsData, error: trendsError } = await supabase
      .from('v_teacher_lesson_trends')
      .select('*')
      .eq('teacher_id', targetTeacherId)
      .order('month', { ascending: true });

    if (trendsError) {
      logger.error('[API /api/teachers/performance] Trends error:', trendsError);
      return NextResponse.json({ error: 'Failed to fetch lesson trends' }, { status: 500 });
    }

    // Format metrics (handle null values)
    const metrics: TeacherPerformanceMetrics = formatTeacherMetrics(
      metricsData as Partial<TeacherPerformanceMetrics>
    );

    // Generate 12-month trends (fill missing months with zeros)
    const trends: TeacherLessonTrend[] = generate12MonthTrends(
      trendsData as TeacherLessonTrend[]
    );

    return NextResponse.json({
      metrics,
      trends,
    });
  } catch (error) {
    logger.error('[API /api/teachers/performance] ERROR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
