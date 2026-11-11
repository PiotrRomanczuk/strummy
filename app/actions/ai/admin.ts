'use server';

import { requireAIAuth } from '@/lib/ai/auth';
import {
  generateAdminInsightsAgent,
  extractAgentResult,
  formatAgentError,
  isAgentSuccess,
} from '@/lib/ai/agent-execution';
import { logger } from '@/lib/logger';
import { executeAgentStream, enforceRateLimit, saveAIGeneration } from './shared';

/**
 * Generate admin insights with streaming
 */
export async function* generateAdminInsightsStream(params: {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalLessons: number;
  recentUsers?: number;
  timeframe?: string;
}) {
  const input = {
    total_users: params.totalUsers,
    total_students: params.totalStudents,
    total_teachers: params.totalTeachers,
    total_lessons: params.totalLessons,
    recent_users: params.recentUsers,
    analysis_period: params.timeframe,
  };
  yield* executeAgentStream('admin-dashboard-insights', input, {}, undefined, 'admin_insights');
}

export async function generateAdminInsights(params: {
  totalStudents: number;
  newStudents: number;
  retentionRate: number;
  avgLessons: number;
  popularSongs: string[];
  revenueData?: string;
  teacherStats?: string;
}): Promise<{ success: boolean; insights: string; error?: string }> {
  try {
    const user = await requireAIAuth();
    await enforceRateLimit(user, 'admin-dashboard-insights');

    const response = await generateAdminInsightsAgent({
      total_users: params.totalStudents + params.newStudents,
      total_students: params.totalStudents,
      total_teachers: 1, // Default for single teacher system
      total_lessons: Math.round(params.avgLessons * params.totalStudents),
      analysis_period: 'last_30_days',
    });

    if (!isAgentSuccess(response)) {
      const err = formatAgentError(response);
      saveAIGeneration({
        generationType: 'admin_insights',
        agentId: 'admin-dashboard-insights',
        inputParams: params,
        outputContent: '',
        isSuccessful: false,
        errorMessage: err,
      });
      return { success: false, insights: '', error: err };
    }

    const result = extractAgentResult(response) as Record<string, unknown>;
    const insights = String(result.content || result);

    saveAIGeneration({
      generationType: 'admin_insights',
      agentId: 'admin-dashboard-insights',
      inputParams: params,
      outputContent: insights,
    });

    return { success: true, insights };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to generate admin insights';
    logger.error('[AI] generateAdminInsights error:', error);
    saveAIGeneration({
      generationType: 'admin_insights',
      agentId: 'admin-dashboard-insights',
      inputParams: params,
      outputContent: '',
      isSuccessful: false,
      errorMessage: errorMsg,
    });
    return { success: false, insights: '', error: errorMsg };
  }
}
