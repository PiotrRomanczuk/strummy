import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTeacherStudentIds } from '@/lib/queries/teacher-students';
import { logger } from '@/lib/logger';

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

    // For now, we'll simulate the pipeline data based on lesson activity
    // Once the migration is applied, we'll use the actual student_status column

    // Get only students taught by this teacher
    const studentIds = await getTeacherStudentIds(supabase, user.id);
    const studentProfiles = studentIds.map((id) => ({ id }));

    if (!studentProfiles || studentProfiles.length === 0) {
      return NextResponse.json({
        stages: [
          {
            id: 'lead',
            label: 'Leads',
            count: 0,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
            icon: 'UserPlus',
          },
          {
            id: 'trial',
            label: 'Trial',
            count: 0,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
            borderColor: 'border-purple-200 dark:border-purple-800',
            icon: 'UserCheck',
          },
          {
            id: 'active',
            label: 'Active',
            count: 0,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-200 dark:border-green-800',
            icon: 'Users',
          },
          {
            id: 'at_risk',
            label: 'At Risk',
            count: 0,
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            borderColor: 'border-orange-200 dark:border-orange-800',
            icon: 'AlertTriangle',
          },
        ],
        conversions: {
          leadToTrial: 0,
          trialToActive: 0,
        },
      });
    }

    // Categorize students based on lesson activity
    let leads = 0;
    let trial = 0;
    let active = 0;
    let atRisk = 0;

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const studentId of studentIds) {
      // Count lessons for this student
      const { count: lessonCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);

      // Get most recent lesson
      const { data: recentLessons } = await supabase
        .from('lessons')
        .select('created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!lessonCount || lessonCount === 0) {
        // No lessons = lead
        leads++;
      } else if (lessonCount === 1) {
        // Just one lesson = trial
        trial++;
      } else {
        // Multiple lessons
        const lastLessonDate = recentLessons?.[0]
          ? new Date(recentLessons[0].created_at)
          : new Date(0);

        if (lastLessonDate < thirtyDaysAgo) {
          // No lesson in 30 days = at risk
          atRisk++;
        } else {
          // Recent activity = active
          active++;
        }
      }
    }

    // Calculate conversion rates
    const leadToTrial = leads > 0 ? Math.round((trial / (leads + trial)) * 100) : 0;
    const trialToActive = trial > 0 ? Math.round((active / (trial + active)) * 100) : 0;

    return NextResponse.json({
      stages: [
        {
          id: 'lead',
          label: 'Leads',
          count: leads,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          icon: 'UserPlus',
        },
        {
          id: 'trial',
          label: 'Trial',
          count: trial,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          icon: 'UserCheck',
        },
        {
          id: 'active',
          label: 'Active',
          count: active,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          icon: 'Users',
        },
        {
          id: 'at_risk',
          label: 'At Risk',
          count: atRisk,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          icon: 'AlertTriangle',
        },
      ],
      conversions: {
        leadToTrial,
        trialToActive,
      },
    });
  } catch (error) {
    logger.error('Error fetching pipeline data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
