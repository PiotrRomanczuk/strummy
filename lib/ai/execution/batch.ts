/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Agent Availability and Batch Execution
 *
 * Advanced agent execution features and utilities
 */

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { executeAgent, type AgentResponse } from '../agent-registry';
import { buildAgentContext } from './context';
import { createErrorResponse } from './response-utils';
import { logger } from '@/lib/logger';

/**
 * Check if an agent is available for the current user
 */
export async function checkAgentAvailability(agentId: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  try {
    const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();

    if (!user) {
      return { available: false, reason: 'Authentication required' };
    }

    // Import registry to check agent specs
    const { getAllAgents } = await import('../registry');
    const agents = getAllAgents();
    const agent = agents.find((a) => a.id === agentId);

    if (!agent) {
      return { available: false, reason: 'Agent not found' };
    }

    const userRole = isAdmin ? 'admin' : isTeacher ? 'teacher' : 'student';

    if (!(agent.targetUsers as string[]).includes(userRole)) {
      return { available: false, reason: 'Insufficient permissions' };
    }

    return { available: true };
  } catch {
    return { available: false, reason: 'System error' };
  }
}

/**
 * Execute multiple agents in batches with concurrency control
 */
export async function executeBatchAgents(
  requests: Array<{
    agentId: string;
    input: Record<string, any>;
    entityId?: string;
    entityType?: string;
  }>
): Promise<AgentResponse[]> {
  const results: AgentResponse[] = [];

  // Execute in parallel with concurrency limit
  const BATCH_SIZE = 3;

  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map((request) =>
      executeCustomAgent(request.agentId, request.input, request.entityId, request.entityType)
    );

    const batchResults = await Promise.allSettled(batchPromises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Create error response for failed requests
        results.push(
          createErrorResponse(
            'BATCH_EXECUTION_FAILED',
            result.reason instanceof Error ? result.reason.message : 'Batch execution failed'
          )
        );
      }
    }
  }

  return results;
}

/**
 * Execute any agent with full flexibility
 */
export async function executeCustomAgent(
  agentId: string,
  input: Record<string, any>,
  entityId?: string,
  entityType?: string,
  additionalContext?: Record<string, any>
): Promise<AgentResponse> {
  const context = await buildAgentContext(entityId, entityType, additionalContext);

  return executeAgent(agentId, input, context);
}

/**
 * Get available agents for current user
 */
export async function getAvailableAgents(): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    available: boolean;
  }>
> {
  try {
    const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();

    if (!user) {
      return [];
    }

    const userRole = isAdmin ? 'admin' : isTeacher ? 'teacher' : 'student';
    const { getAvailableAgents } = await import('../registry');
    const agents = getAvailableAgents(userRole);

    return agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      category: agent.uiConfig.category,
      available: true,
    }));
  } catch (error) {
    logger.error('[AgentExecution] Failed to get available agents:', error);
    return [];
  }
}
