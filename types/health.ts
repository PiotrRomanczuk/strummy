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

export interface CronJobStatus {
  path: string;
  schedule: string;
  name: string;
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
    activeMemoryBuckets: number;
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
