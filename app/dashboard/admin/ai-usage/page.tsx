import { redirect } from 'next/navigation';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getDatabaseAnalytics, getPerformanceMetrics } from '@/lib/ai/registry/analytics';
import { createClient } from '@/lib/supabase/server';
import { AIUsageStatCards } from './AIUsageStatCards';
import { AIUsageErrorBreakdown } from './AIUsageErrorBreakdown';
import { AIUsageAgentSummary } from './AIUsageAgentSummary';
import { AIUsageRecentRuns } from './AIUsageRecentRuns';

export const metadata = { title: 'AI Usage — Admin' };

interface ExecutionLogRow {
  id: string;
  agent_id: string;
  successful: boolean;
  execution_time: number;
  error_code: string | null;
  timestamp: string;
}

async function fetchRecentRuns(): Promise<ExecutionLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('agent_execution_logs')
    .select('id, agent_id, successful, execution_time, error_code, timestamp')
    .order('timestamp', { ascending: false })
    .limit(10);
  return (data ?? []) as ExecutionLogRow[];
}

function buildAgentSummary(activity: Record<string, unknown>[]) {
  const counts = new Map<string, { count: number; successCount: number }>();
  for (const row of activity) {
    const agentId = String(row.agent_id ?? 'unknown');
    const existing = counts.get(agentId) ?? { count: 0, successCount: 0 };
    existing.count += 1;
    if (row.successful) existing.successCount += 1;
    counts.set(agentId, existing);
  }
  return Array.from(counts.entries())
    .map(([agentId, { count, successCount }]) => ({ agentId, count, successCount }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export default async function AIUsagePage() {
  const { user, isAdmin } = await getUserWithRolesSSR();

  if (!user) redirect('/sign-in');
  if (!isAdmin) redirect('/dashboard');

  const [analytics, metrics, recentRuns] = await Promise.all([
    getDatabaseAnalytics(undefined, 500),
    getPerformanceMetrics(undefined, 'day'),
    fetchRecentRuns(),
  ]);

  const agentSummary = buildAgentSummary(analytics.recentActivity);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">AI Usage</h1>
        <p className="text-muted-foreground">
          Agent execution analytics — last 24 hours (metrics) and up to 500 recent logs (summary).
        </p>
      </div>

      <AIUsageStatCards
        totalExecutions={metrics.executionCount}
        successRate={metrics.successRate}
        avgLatencyMs={metrics.averageResponseTime}
        errorRate={metrics.errorRate}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AIUsageErrorBreakdown topErrors={metrics.topErrors} />
        <AIUsageAgentSummary agents={agentSummary} />
      </div>

      <AIUsageRecentRuns runs={recentRuns} />
    </div>
  );
}
