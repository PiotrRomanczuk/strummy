/**
 * Health check and debug dashboard type definitions
 */

export type ServiceStatus = 'healthy' | 'degraded' | 'error' | 'unconfigured';

export interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
  checkedAt: string;
}

/**
 * How a cron route actually gets invoked.
 *
 * `vercel-cron`     — has its own entry in vercel.json.
 * `via-dispatcher`  — fanned out in-process by /api/cron/dispatcher, so it
 *                     inherits the dispatcher's schedule, not its own.
 * `manual`          — reachable only by an explicit authenticated call.
 */
export type CronTrigger = 'vercel-cron' | 'via-dispatcher' | 'manual';

export interface CronJobStatus {
  path: string;
  /** Effective cadence — for dispatcher-run jobs this is the dispatcher's. */
  schedule: string;
  name: string;
  trigger: CronTrigger;
}

export interface HealthResponse {
  overall: ServiceStatus;
  services: {
    supabaseLocal: ServiceCheck;
    supabaseRemote: ServiceCheck;
    spotify: ServiceCheck;
    googleCalendar: ServiceCheck;
    googleDrive: ServiceCheck;
    gmailSmtp: ServiceCheck;
    openrouter: ServiceCheck;
    ollama: ServiceCheck;
  };
  crons: CronJobStatus[];
  checkedAt: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  category: string;
  targetUsers: string[];
  model?: string;
}

export interface RecentGeneration {
  id: string;
  agentId: string;
  userId: string;
  provider: string;
  model: string;
  success: boolean;
  executionTime: number;
  tokensUsed?: number;
  createdAt: string;
}

export interface AIDebugResponse {
  providerFactory: {
    configuredProvider: string;
    preferLocal: boolean;
    providers: Array<{ name: string; available: boolean }>;
  };
  queue: {
    totalActiveRequests: number;
    totalQueuedRequests: number;
    config: {
      maxConcurrentPerUser: number;
      maxQueueSize: number;
      requestTimeout: number;
    };
  };
  rateLimits: {
    limits: Record<string, { maxRequests: number; windowMs: number }>;
    activeBuckets: number;
  };
  streamingAnalytics: {
    activeSessions: number;
    aggregate: {
      totalSessions: number;
      completedSessions: number;
      errorSessions: number;
      averageTTFT: number;
    };
  };
  agents: AgentSummary[];
  recentGenerations: RecentGeneration[];
  note: string;
  checkedAt: string;
}
