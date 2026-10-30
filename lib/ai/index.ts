/**
 * AI System Entry Point
 *
 * Exports all AI-related functionality including the new Agent Registry System
 */

export * from './types';
export * from './provider-factory';
export * from './providers';

// Agent Registry System
export * from './agent-registry';
export * from './agent-specifications';

// Agent Execution System - exclude getAvailableAgents to avoid conflict
export {
  buildAgentContext,
  validateAgentContext,
  type AgentExecutionContext,
  generateEmailDraftAgent,
  generateLessonNotesAgent,
  generateAssignmentAgent,
  generatePostLessonSummaryAgent,
  analyzeStudentProgressAgent,
  generateAdminInsightsAgent,
  isAgentSuccess,
  extractAgentResult,
  formatAgentError,
  extractAgentMetadata,
  createErrorResponse,
  checkAgentAvailability,
  executeBatchAgents,
  executeCustomAgent,
} from './agent-execution';

// Initialize agent registry on module load
import { registerAllAgents } from './agent-specifications';
import { logger } from '@/lib/logger';

// Registration guard to prevent duplicate registration
let agentsRegistered = false;

// Register all agents when module is imported
try {
  if (!agentsRegistered) {
    registerAllAgents();
    agentsRegistered = true;
  }
} catch (error) {
  logger.error('[AI] Failed to register agents:', error);
}

// Re-export commonly used functions
export { getAIProvider, getProviderFor } from './provider-factory';
export { resolveModel, type ModelChoice } from './model-resolver';

// Export rate limiter utilities
export {
  checkRateLimit,
  resetRateLimit,
  clearAllRateLimits,
  DEFAULT_RATE_LIMITS,
} from './rate-limiter';

// Export retry utilities
export { withRetry, AI_PROVIDER_RETRY_CONFIG, DATABASE_RETRY_CONFIG } from './retry';

// Export model mapping utilities
export {
  mapToOllamaModel,
  mapToOpenRouterModel,
  getAllModelMappings,
  addModelMapping,
  MODEL_MAPPINGS,
  FALLBACK_MODELS,
} from './model-mappings';
