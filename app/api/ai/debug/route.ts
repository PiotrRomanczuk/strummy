/**
 * AI Debug API Endpoint
 *
 * GET /api/ai/debug — Returns in-memory AI infrastructure state.
 * Admin only.
 *
 * Note: In-memory state reflects the current server process instance.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGlobalQueueStats } from '@/lib/ai/queue-manager';
import { getRateLimitStats } from '@/lib/ai/rate-limiter';
import { getAllAgents } from '@/lib/ai/registry/core';
import { getActiveSessions, getAggregateStats } from '@/lib/ai/streaming-analytics';
import { getFactoryConfigSnapshot } from '@/lib/ai/provider-factory';
import type { AIDebugResponse, AgentSummary, RecentGeneration } from '@/types/health';

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();
  if (!profile?.is_admin)
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

export async function GET(): Promise<NextResponse> {
  const auth = await verifyAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const queueStats = getGlobalQueueStats();
  const rateLimitStats = getRateLimitStats();
  const activeSessionIds = getActiveSessions();
  const aggregateStats = getAggregateStats();
  const allAgents = getAllAgents();
  const factoryConfig = getFactoryConfigSnapshot();

  const agents: AgentSummary[] = allAgents.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.uiConfig.category,
    targetUsers: a.targetUsers,
    model: a.model,
  }));

  // Fetch last 10 AI generations across all users (admin bypass)
  let recentGenerations: RecentGeneration[] = [];
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('ai_generations')
      .select('id, agent_id, provider, model_id, is_successful, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      recentGenerations = data.map((row) => ({
        id: row.id,
        agentId: row.agent_id ?? 'unknown',
        userId: '',
        provider: row.provider ?? 'unknown',
        model: row.model_id ?? 'unknown',
        success: row.is_successful,
        executionTime: 0,
        createdAt: row.created_at,
      }));
    }
  } catch {
    // Non-fatal: table may not exist in local dev
  }

  const response: AIDebugResponse = {
    providerFactory: factoryConfig,
    queue: queueStats,
    rateLimits: rateLimitStats,
    streamingAnalytics: {
      activeSessions: activeSessionIds.length,
      aggregate: {
        totalSessions: aggregateStats.totalSessions,
        completedSessions: aggregateStats.completedSessions,
        errorSessions: aggregateStats.errorSessions,
        averageTTFT: aggregateStats.averageTTFT,
      },
    },
    agents,
    recentGenerations,
    note: 'In-memory state reflects current process instance',
    checkedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
