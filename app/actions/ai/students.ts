'use server';

import { requireAIAuth } from '@/lib/ai/auth';
import {
  analyzeStudentProgressAgent,
  extractAgentResult,
  formatAgentError,
  isAgentSuccess,
} from '@/lib/ai/agent-execution';
import { logger } from '@/lib/logger';
import { executeAgentStream, enforceRateLimit, saveAIGeneration } from './shared';

/**
 * Analyze student progress with streaming
 */
export async function* analyzeStudentProgressStream(params: {
  studentId: string;
  timePeriod?: string;
}) {
  const input = {
    student_ids: [params.studentId],
    time_period: params.timePeriod,
    analysis_focus: 'individual_progress',
  };
  yield* executeAgentStream(
    'student-progress-insights',
    input,
    { entityId: params.studentId, entityType: 'student' },
    undefined,
    'student_progress'
  );
}

export async function analyzeStudentProgress(params: {
  studentId: string;
  timePeriod: string;
}): Promise<{ success: boolean; insights: string; error?: string }> {
  try {
    const user = await requireAIAuth();
    await enforceRateLimit(user, 'student-progress-insights');

    const response = await analyzeStudentProgressAgent({
      student_ids: [params.studentId],
      time_period: params.timePeriod,
      analysis_focus: 'individual_progress',
    });

    if (!isAgentSuccess(response)) {
      const err = formatAgentError(response);
      saveAIGeneration({
        generationType: 'student_progress',
        agentId: 'student-progress-insights',
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
      generationType: 'student_progress',
      agentId: 'student-progress-insights',
      inputParams: params,
      outputContent: insights,
    });

    return { success: true, insights };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to analyze student progress';
    logger.error('[AI] analyzeStudentProgress error:', error);
    saveAIGeneration({
      generationType: 'student_progress',
      agentId: 'student-progress-insights',
      inputParams: params,
      outputContent: '',
      isSuccessful: false,
      errorMessage: errorMsg,
    });
    return { success: false, insights: '', error: errorMsg };
  }
}
