import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  getCohortAnalytics,
  type CohortDimension,
  type CohortMetric,
} from '@/lib/services/cohort-analytics';
import { logger } from '@/lib/logger';

/**
 * GET /api/cohorts/analytics
 * Returns cohort comparison analytics
 *
 * Query params:
 * - dimension: enrollment_period | status | teacher | lesson_frequency
 * - metric: lessons_completed | mastery_rate | completion_rate | retention_rate | avg_time_to_master
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Access: Teachers see own students, admins see all
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const dimension = searchParams.get('dimension') as CohortDimension | null;
    const metric = searchParams.get('metric') as CohortMetric | null;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Validate required parameters
    if (!dimension || !metric) {
      return NextResponse.json(
        { error: 'Missing required parameters: dimension and metric' },
        { status: 400 }
      );
    }

    // Validate dimension
    const validDimensions: CohortDimension[] = [
      'enrollment_period',
      'status',
      'teacher',
      'lesson_frequency',
    ];
    if (!validDimensions.includes(dimension)) {
      return NextResponse.json(
        { error: `Invalid dimension. Must be one of: ${validDimensions.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate metric
    const validMetrics: CohortMetric[] = [
      'lessons_completed',
      'mastery_rate',
      'completion_rate',
      'retention_rate',
      'avg_time_to_master',
    ];
    if (!validMetrics.includes(metric)) {
      return NextResponse.json(
        { error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse date range
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: 'Invalid startDate format' }, { status: 400 });
      }
    }

    if (endDateParam) {
      endDate = new Date(endDateParam);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate format' }, { status: 400 });
      }
    }

    // Get cohort analytics
    const result = await getCohortAnalytics(dimension, metric, startDate, endDate);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('[API /api/cohorts/analytics] ERROR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
