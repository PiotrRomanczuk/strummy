/**
 * Agent Registry Core
 *
 * Functional registry for managing AI agents
 */

import type { AgentSpecification, AgentRequest, AgentResponse } from './types';
import { validateSpecification, validateRequest, checkPermissions } from './validation';
import { prepareContext, executeAgent, generateRequestId, hashInput } from './execution';
import { logExecution, logAIOperation, categorizeError } from './analytics';
import { checkRateLimit } from '../rate-limiter';
import { AgentNotFoundError, RateLimitError, getErrorCode } from '../errors';
import { isAIError } from '../types';
import type { AIResult } from '../types';

// Registry state - using Map for efficient lookups
const agents = new Map<string, AgentSpecification>();

/**
 * Fallback templates returned when AI providers are unavailable [BMS-113]
 * Individual agents may also define their own via AgentSpecification.fallbackTemplate (F-15).
 */
const AGENT_FALLBACK_TEMPLATES: Record<string, string> = {
  'lesson-notes-assistant':
    '## Lesson Notes (AI Unavailable)\n\n**Student:** [name]\n**Date:** [date]\n\n### Topics Covered\n- \n\n### Progress\n- \n\n### Next Steps\n- \n\n*AI-generated notes are temporarily unavailable. Please fill in manually.*',
  'assignment-generator':
    '## Practice Assignment (AI Unavailable)\n\n**Student:** [name]\n**Focus Area:** [focus]\n\n### Tasks\n1. \n2. \n3. \n\n### Goals\n- \n\n*AI-generated assignments are temporarily unavailable. Please fill in manually.*',
  'email-draft-generator':
    'Subject: [Update for student]\n\nHi [name],\n\n[Your message here]\n\nBest regards,\n[Teacher]\n\n*AI-generated email drafts are temporarily unavailable.*',
  'post-lesson-summary':
    '## Post-Lesson Summary (AI Unavailable)\n\n**Student:** [name]\n**Date:** [date]\n\n### What We Worked On\n- \n\n### Achievements\n- \n\n### Areas for Improvement\n- \n\n*AI-generated summaries are temporarily unavailable.*',
  'student-progress-insights':
    '## Student Progress Insights (AI Unavailable)\n\n**Student:** [name]\n**Period:** [time period]\n\n### Progress Overview\n- \n\n### Strengths\n- \n\n### Areas for Growth\n- \n\n### Recommendations\n- \n\n*AI-generated insights are temporarily unavailable. Please review lesson history manually.*',
  'admin-dashboard-insights':
    '## Business Insights (AI Unavailable)\n\n**Period:** [time period]\n\n### Key Metrics\n- Total Students: [count]\n- Active Lessons: [count]\n\n### Observations\n- \n\n### Action Items\n- \n\n*AI-generated business insights are temporarily unavailable.*',
  'chat-assistant':
    "I'm sorry, the AI assistant is temporarily unavailable. Please try again in a few moments, or contact support if the issue persists.",
};

/**
 * Register a new AI agent with its specification
 */
export function registerAgent(spec: AgentSpecification): void {
  validateSpecification(spec);
  agents.set(spec.id, spec);
}

/**
 * Execute an agent with proper validation and monitoring
 */
export async function executeAgentRequest(request: AgentRequest): Promise<AgentResponse> {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    // F-1 Step 1: Get agent specification first
    const agent = agents.get(request.agentId);
    if (!agent) {
      throw new AgentNotFoundError(request.agentId);
    }

    // F-1 Step 2: Validate request BEFORE rate limit — bad input must not consume quota
    await validateRequest(request, agent);

    // F-1 Step 3: Check permissions
    await checkPermissions(request, agent);

    // F-1 Step 4: Check rate limits (only after we know input is valid)
    const rateLimitResult = await checkRateLimit(
      request.context.userId,
      request.context.userRole,
      request.agentId
    );
    if (!rateLimitResult.allowed) {
      throw new RateLimitError(rateLimitResult.retryAfter ?? 60);
    }

    // Prepare execution context
    const executionContext = await prepareContext(request, agent);

    // F-2: executeAgent now returns { result, providerName }
    const { result, providerName } = await executeAgent(request, agent, executionContext);

    // F-3: Extract token usage from the canonical camelCase fields
    const aiResult = result as AIResult;
    const usage = !isAIError(aiResult) ? aiResult.usage : undefined;

    // Create success response
    const response: AgentResponse = {
      success: true,
      result,
      metadata: {
        agentId: request.agentId,
        executionTime: Date.now() - startTime,
        model: request.overrides?.model || agent.model || 'default',
        provider: providerName,
        tokensUsed: usage?.totalTokens,
      },
      analytics: {
        requestId,
        timestamp: new Date(),
        inputHash: hashInput(request.input),
        successful: true,
      },
    };

    // Structured success logging [BMS-111]
    logAIOperation({
      level: 'info',
      operation: 'executeAgentRequest',
      agentId: request.agentId,
      provider: providerName,
      model: request.overrides?.model || agent.model || 'default',
      latencyMs: Date.now() - startTime,
      success: true,
      tokenCount: usage?.totalTokens,
      userId: request.context.userId,
    });

    // Log execution
    if (agent.enableLogging) {
      await logExecution(response, request, agent);
    }

    return response;
  } catch (error) {
    const response: AgentResponse = {
      success: false,
      error: {
        code: getErrorCode(error),
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        agentId: request.agentId,
        executionTime: Date.now() - startTime,
        model: request.overrides?.model || 'unknown',
        provider: 'unknown',
      },
      analytics: {
        requestId,
        timestamp: new Date(),
        inputHash: hashInput(request.input),
        successful: false,
      },
    };

    // Structured error logging [BMS-111]
    logAIOperation({
      level: 'error',
      operation: 'executeAgentRequest',
      agentId: request.agentId,
      model: request.overrides?.model || 'unknown',
      latencyMs: Date.now() - startTime,
      success: false,
      errorCategory: categorizeError(error),
      userId: request.context.userId,
    });

    await logExecution(response, request);

    // F-15: Attach fallback template — check agent.fallbackTemplate first, then registry map
    const agent = agents.get(request.agentId);
    const fallback = agent?.fallbackTemplate ?? AGENT_FALLBACK_TEMPLATES[request.agentId];
    if (fallback) {
      response.result = { content: fallback, isFallback: true };
    }

    return response;
  }
}

/**
 * Get all registered agents
 */
export function getAllAgents(): AgentSpecification[] {
  return Array.from(agents.values());
}

/**
 * Get specific agent by ID
 */
export function getAgent(agentId: string): AgentSpecification | undefined {
  return agents.get(agentId);
}

/**
 * Get agents filtered by user role and context
 */
export function getAvailableAgents(userRole: string, _context?: string): AgentSpecification[] {
  return getAllAgents().filter((agent) => {
    if (!agent.targetUsers.includes(userRole as AgentSpecification['targetUsers'][number])) {
      return false;
    }
    return true;
  });
}

/**
 * Check if an agent exists
 */
export function hasAgent(agentId: string): boolean {
  return agents.has(agentId);
}

/**
 * Unregister an agent
 */
export function unregisterAgent(agentId: string): boolean {
  const existed = agents.has(agentId);
  agents.delete(agentId);
  return existed;
}

/**
 * Get registry statistics
 */
export function getRegistryStats(): {
  totalAgents: number;
  agentsByCategory: Record<string, number>;
  agentsByTargetUser: Record<string, number>;
} {
  const allAgents = getAllAgents();
  const agentsByCategory: Record<string, number> = {};
  const agentsByTargetUser: Record<string, number> = {};

  allAgents.forEach((agent) => {
    const category = agent.uiConfig.category;
    agentsByCategory[category] = (agentsByCategory[category] || 0) + 1;

    agent.targetUsers.forEach((user) => {
      agentsByTargetUser[user] = (agentsByTargetUser[user] || 0) + 1;
    });
  });

  return {
    totalAgents: allAgents.length,
    agentsByCategory,
    agentsByTargetUser,
  };
}

// Legacy compatibility object (maintains the same interface)
export const agentRegistry = {
  register: registerAgent,
  execute: executeAgentRequest,
  getAgents: getAllAgents,
  getAgent,
  getAvailableAgents,
  hasAgent,
  unregister: unregisterAgent,
  getRegistryStats,
};
