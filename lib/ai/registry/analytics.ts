/**
 * Agent Analytics and Logging
 *
 * Analytics collection and logging for agent executions
 */

import { createClient } from '@/lib/supabase/server';
import type { AgentSpecification, AgentRequest, AgentResponse } from './types';
import { logger } from '@/lib/logger';
import {
  AgentNotFoundError,
  RateLimitError,
  ValidationError,
  PermissionError,
  ProviderError,
  TimeoutError,
} from '../errors';
import { computeCostUsd } from '../pricing';

/**
 * Agent Analytics Data
 */
interface AgentAnalytics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  recentExecutions: AgentResponse[];
  errorDistribution: Record<string, number>;
}

/**
 * In-memory execution log (capped for serverless safety) [BMS-114]
 */
const MAX_IN_MEMORY_LOGS = 100;
let executionLog: AgentResponse[] = [];

/**
 * F-8: Track whether the first DB log failure has been escalated to ERROR.
 * Resets on process restart (which is fine — each cold start gets one alert).
 */
let dbLogFailureAlerted = false;

/**
 * Add execution to log (capped at MAX_IN_MEMORY_LOGS)
 */
export function addToExecutionLog(response: AgentResponse): void {
  executionLog.push(response);

  if (executionLog.length > MAX_IN_MEMORY_LOGS) {
    executionLog = executionLog.slice(-MAX_IN_MEMORY_LOGS);
  }
}

/**
 * Get analytics for agent(s)
 */
export function getAnalytics(agentId?: string): AgentAnalytics {
  const logs = agentId
    ? executionLog.filter((log) => log.metadata.agentId === agentId)
    : executionLog;

  if (logs.length === 0) {
    return {
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      recentExecutions: [],
      errorDistribution: {},
    };
  }

  const successfulLogs = logs.filter((log) => log.success);
  const errorDistribution: Record<string, number> = {};

  logs
    .filter((log) => !log.success && log.error)
    .forEach((log) => {
      const errorCode = log.error!.code;
      errorDistribution[errorCode] = (errorDistribution[errorCode] || 0) + 1;
    });

  return {
    totalExecutions: logs.length,
    successRate: successfulLogs.length / logs.length,
    averageExecutionTime:
      logs.reduce((sum, log) => sum + log.metadata.executionTime, 0) / logs.length,
    recentExecutions: logs.slice(-10),
    errorDistribution,
  };
}

/**
 * Log execution to database for persistence
 */
export async function logExecution(
  response: AgentResponse,
  request: AgentRequest,
  _agent?: AgentSpecification
): Promise<void> {
  // Add to in-memory log
  addToExecutionLog(response);

  // F-7: Compute cost before inserting
  const costUsd =
    response.metadata.tokensUsed != null
      ? computeCostUsd(
          response.metadata.model,
          0, // totalTokens used as proxy — split not yet available in metadata
          response.metadata.tokensUsed
        )
      : 0;

  // Always attempt DB logging; handle failure with escalation then suppression (F-8)
  try {
    const supabase = await createClient();
    await supabase.from('agent_execution_logs').insert({
      agent_id: response.metadata.agentId,
      request_id: response.analytics?.requestId,
      user_id: request.context.userId,
      user_role: request.context.userRole,
      successful: response.success,
      execution_time: response.metadata.executionTime,
      input_hash: response.analytics?.inputHash,
      error_code: response.error?.code,
      model_used: response.metadata.model,
      provider_used: response.metadata.provider,
      tokens_used: response.metadata.tokensUsed,
      cost_usd: costUsd,
      timestamp: response.analytics?.timestamp,
      session_id: request.context.sessionId,
      entity_type: request.context.entityType,
      entity_id: request.context.entityId,
    });
  } catch (error) {
    // F-8: First failure → ERROR (alert); subsequent → WARN (suppressed noise)
    if (!dbLogFailureAlerted) {
      dbLogFailureAlerted = true;
      logger.error(
        '[AgentAnalytics] DB log write failed — this will be suppressed until process restart',
        { error: String(error) }
      );
    } else {
      logger.warn('[AgentAnalytics] DB log write failed (suppressed)', { error: String(error) });
    }
  }
}

/**
 * Get analytics from database
 */
export async function getDatabaseAnalytics(
  agentId?: string,
  limit: number = 100
): Promise<{
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  recentActivity: Record<string, unknown>[];
}> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('agent_execution_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data: logs, error } = await query.limit(limit);

    if (error) {
      throw error;
    }

    if (!logs || logs.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        recentActivity: [],
      };
    }

    const successfulLogs = logs.filter((log) => log.successful);

    return {
      totalExecutions: logs.length,
      successRate: successfulLogs.length / logs.length,
      averageExecutionTime:
        logs.reduce((sum, log) => sum + (log.execution_time || 0), 0) / logs.length,
      recentActivity: logs.slice(0, 10),
    };
  } catch (error) {
    logger.error('[AgentAnalytics] Failed to fetch database analytics:', error);
    return {
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      recentActivity: [],
    };
  }
}

/**
 * Get agent performance metrics
 */
export async function getPerformanceMetrics(
  agentId?: string,
  timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<{
  executionCount: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  topErrors: Array<{ code: string; count: number }>;
}> {
  try {
    const supabase = await createClient();

    const now = new Date();
    const timeMap = {
      hour: new Date(now.getTime() - 60 * 60 * 1000),
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    let query = supabase
      .from('agent_execution_logs')
      .select('*')
      .gte('timestamp', timeMap[timeRange].toISOString());

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw error;
    }

    if (!logs || logs.length === 0) {
      return {
        executionCount: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorRate: 0,
        topErrors: [],
      };
    }

    const successfulLogs = logs.filter((log) => log.successful);
    const errorLogs = logs.filter((log) => !log.successful);

    const errorCounts: Record<string, number> = {};
    errorLogs.forEach((log) => {
      if (log.error_code) {
        errorCounts[log.error_code] = (errorCounts[log.error_code] || 0) + 1;
      }
    });

    const topErrors = Object.entries(errorCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      executionCount: logs.length,
      successRate: logs.length > 0 ? successfulLogs.length / logs.length : 0,
      averageResponseTime:
        logs.length > 0
          ? logs.reduce((sum, log) => sum + (log.execution_time || 0), 0) / logs.length
          : 0,
      errorRate: logs.length > 0 ? errorLogs.length / logs.length : 0,
      topErrors,
    };
  } catch (error) {
    logger.error('[AgentAnalytics] Failed to fetch performance metrics:', error);
    return {
      executionCount: 0,
      successRate: 0,
      averageResponseTime: 0,
      errorRate: 0,
      topErrors: [],
    };
  }
}

/**
 * Structured AI operation log entry [BMS-111]
 */
interface AIOperationLog {
  level: 'info' | 'warn' | 'error';
  operation: string;
  agentId: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  success: boolean;
  errorCategory?: 'auth' | 'rate_limit' | 'timeout' | 'provider' | 'validation' | 'unknown';
  tokenCount?: number;
  userId?: string;
}

/**
 * Emit a structured log for AI operations [BMS-111]
 */
export function logAIOperation(entry: AIOperationLog): void {
  const payload = {
    ts: new Date().toISOString(),
    ...entry,
  };

  if (entry.level === 'error') {
    logger.error('[AI] Log entry', undefined, payload);
  } else if (entry.level === 'warn') {
    logger.warn('[AI] Log entry', payload);
  } else {
    logger.info('[AI] Log entry', payload);
  }
}

/**
 * Categorize an error for structured logging (F-5: instanceof instead of string-matching)
 */
export function categorizeError(error: unknown): AIOperationLog['errorCategory'] {
  if (error instanceof AgentNotFoundError) return 'unknown';
  if (error instanceof RateLimitError) return 'rate_limit';
  if (error instanceof ValidationError) return 'validation';
  if (error instanceof PermissionError) return 'auth';
  if (error instanceof ProviderError) return 'provider';
  if (error instanceof TimeoutError) return 'timeout';
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('auth') || msg.includes('unauthenticated')) return 'auth';
    if (msg.includes('rate limit')) return 'rate_limit';
    if (msg.includes('timeout') || msg.includes('abort')) return 'timeout';
    if (msg.includes('validation') || msg.includes('invalid')) return 'validation';
    if (msg.includes('provider') || msg.includes('openrouter') || msg.includes('ollama'))
      return 'provider';
  }
  return 'unknown';
}

/**
 * Clear in-memory execution log
 */
export function clearExecutionLog(): void {
  executionLog = [];
}
