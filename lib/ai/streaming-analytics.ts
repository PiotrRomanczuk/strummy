import { logger } from '@/lib/logger';
/**
 * Streaming Analytics
 *
 * Tracks and logs AI streaming performance metrics
 */

/**
 * Streaming metrics for a single session
 */
export interface StreamingMetrics {
  sessionId: string;
  agentId: string;
  modelId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  firstTokenTime?: number;
  totalTokens: number;
  status: 'streaming' | 'complete' | 'error' | 'cancelled';
  errorMessage?: string;
  cancelled?: boolean;
}

/**
 * In-memory store for active streaming sessions
 */
const activeStreams = new Map<string, StreamingMetrics>();

/**
 * Performance summary for analytics
 */
export interface PerformanceSummary {
  ttft: number; // Time to first token (ms)
  totalDuration: number; // Total streaming duration (ms)
  tokensPerSecond: number; // Average tokens per second
  totalTokens: number;
  status: 'complete' | 'error' | 'cancelled';
}

/**
 * Start tracking a new streaming session
 *
 * @param sessionId - Unique session identifier
 * @param agentId - Agent or operation identifier
 * @param modelId - Model being used
 * @param userId - User identifier
 * @returns Session ID
 */
export function startStreamingSession(
  sessionId: string,
  agentId: string,
  modelId: string,
  userId: string
): string {
  const metrics: StreamingMetrics = {
    sessionId,
    agentId,
    modelId,
    userId,
    startTime: Date.now(),
    totalTokens: 0,
    status: 'streaming',
  };

  activeStreams.set(sessionId, metrics);
  return sessionId;
}

/**
 * Record the first token received (for TTFT calculation)
 *
 * @param sessionId - Session identifier
 */
export function recordFirstToken(sessionId: string): void {
  const metrics = activeStreams.get(sessionId);
  if (!metrics) return;

  if (!metrics.firstTokenTime) {
    metrics.firstTokenTime = Date.now();
  }
}

/**
 * Update token count for a session
 *
 * @param sessionId - Session identifier
 * @param tokenCount - Current token count
 */
export function updateTokenCount(sessionId: string, tokenCount: number): void {
  const metrics = activeStreams.get(sessionId);
  if (!metrics) return;

  metrics.totalTokens = tokenCount;
}

/**
 * Mark a streaming session as complete
 *
 * @param sessionId - Session identifier
 * @param status - Final status
 * @param errorMessage - Optional error message
 * @returns Performance summary
 */
export function completeStreamingSession(
  sessionId: string,
  status: 'complete' | 'error' | 'cancelled' = 'complete',
  errorMessage?: string
): PerformanceSummary | null {
  const metrics = activeStreams.get(sessionId);
  if (!metrics) return null;

  metrics.endTime = Date.now();
  metrics.status = status;
  metrics.errorMessage = errorMessage;
  metrics.cancelled = status === 'cancelled';

  // Calculate performance metrics
  const ttft = metrics.firstTokenTime
    ? metrics.firstTokenTime - metrics.startTime
    : 0;

  const totalDuration = metrics.endTime - metrics.startTime;

  const tokensPerSecond = totalDuration > 0
    ? Math.round((metrics.totalTokens / totalDuration) * 1000)
    : 0;

  const summary: PerformanceSummary = {
    ttft,
    totalDuration,
    tokensPerSecond,
    totalTokens: metrics.totalTokens,
    status,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    logger.info('[Streaming Analytics]', {
      sessionId,
      agentId: metrics.agentId,
      modelId: metrics.modelId,
      ...summary,
      errorMessage,
    });
  }

  // Send to analytics service (if available)
  sendToAnalytics(metrics, summary);

  // Clean up
  activeStreams.delete(sessionId);

  return summary;
}

/**
 * Send metrics to analytics service (Vercel Analytics, etc.)
 *
 * @param metrics - Session metrics
 * @param summary - Performance summary
 */
function sendToAnalytics(metrics: StreamingMetrics, summary: PerformanceSummary): void {
  try {
    // Check if Vercel Analytics is available (using the new @vercel/analytics API)
    if (typeof window !== 'undefined' && window.va) {
      // Send custom event with the new Vercel Analytics API
      window.va('event', {
        name: 'AI Streaming',
        data: {
          agentId: metrics.agentId,
          modelId: metrics.modelId,
          ttft: summary.ttft,
          totalDuration: summary.totalDuration,
          tokensPerSecond: summary.tokensPerSecond,
          totalTokens: summary.totalTokens,
          status: summary.status,
        },
      });
    }

    // Could also send to other analytics services here
    // e.g., PostHog, Mixpanel, Google Analytics, etc.
  } catch (error) {
    logger.error('[Streaming Analytics] Failed to send metrics:', error);
  }
}

/**
 * Get current streaming metrics for a session
 *
 * @param sessionId - Session identifier
 * @returns Current metrics or null
 */
export function getStreamingMetrics(sessionId: string): StreamingMetrics | null {
  return activeStreams.get(sessionId) || null;
}

/**
 * Get all active streaming sessions
 *
 * @returns Array of active session IDs
 */
export function getActiveSessions(): string[] {
  return Array.from(activeStreams.keys());
}

/**
 * Calculate aggregate statistics across all completed sessions
 *
 * @param agentId - Optional filter by agent
 * @returns Aggregate statistics
 */
export interface AggregateStats {
  totalSessions: number;
  completedSessions: number;
  errorSessions: number;
  cancelledSessions: number;
  averageTTFT: number;
  averageDuration: number;
  averageTokensPerSecond: number;
  totalTokens: number;
}

// Store completed sessions for aggregate stats (last 100)
const completedSessions: Array<{ metrics: StreamingMetrics; summary: PerformanceSummary }> = [];
const MAX_STORED_SESSIONS = 100;

/**
 * Store completed session for aggregate stats
 */
function _storeCompletedSession(metrics: StreamingMetrics, summary: PerformanceSummary): void {
  completedSessions.push({ metrics, summary });

  // Keep only last MAX_STORED_SESSIONS
  if (completedSessions.length > MAX_STORED_SESSIONS) {
    completedSessions.shift();
  }
}

// Update completeStreamingSession to store data
const originalComplete = completeStreamingSession;
export { originalComplete as _originalComplete };

/**
 * Get aggregate statistics
 */
export function getAggregateStats(agentId?: string): AggregateStats {
  const filtered = agentId
    ? completedSessions.filter((s) => s.metrics.agentId === agentId)
    : completedSessions;

  const totalSessions = filtered.length;
  const completedCount = filtered.filter((s) => s.metrics.status === 'complete').length;
  const errorCount = filtered.filter((s) => s.metrics.status === 'error').length;
  const cancelledCount = filtered.filter((s) => s.metrics.status === 'cancelled').length;

  const completedOnly = filtered.filter((s) => s.metrics.status === 'complete');

  const avgTTFT = completedOnly.length > 0
    ? Math.round(
        completedOnly.reduce((sum, s) => sum + s.summary.ttft, 0) / completedOnly.length
      )
    : 0;

  const avgDuration = completedOnly.length > 0
    ? Math.round(
        completedOnly.reduce((sum, s) => sum + s.summary.totalDuration, 0) / completedOnly.length
      )
    : 0;

  const avgTokensPerSecond = completedOnly.length > 0
    ? Math.round(
        completedOnly.reduce((sum, s) => sum + s.summary.tokensPerSecond, 0) /
          completedOnly.length
      )
    : 0;

  const totalTokens = filtered.reduce((sum, s) => sum + s.metrics.totalTokens, 0);

  return {
    totalSessions,
    completedSessions: completedCount,
    errorSessions: errorCount,
    cancelledSessions: cancelledCount,
    averageTTFT: avgTTFT,
    averageDuration: avgDuration,
    averageTokensPerSecond: avgTokensPerSecond,
    totalTokens,
  };
}

/**
 * Get count of active streaming sessions
 */
export function getActiveStreamCount(): number {
  return activeStreams.size;
}

/**
 * Clear all analytics data (useful for testing)
 */
export function clearAnalytics(): void {
  activeStreams.clear();
  completedSessions.length = 0;
}
