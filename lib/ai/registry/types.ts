/**
 * Agent Registry Types and Interfaces
 *
 * Core type definitions for the AI agent registry system
 */

// Core Agent Specification Interface
export interface AgentSpecification {
  // Agent Identity
  id: string;
  name: string;
  description: string;
  version: string;

  // Purpose & Scope
  purpose: string;
  targetUsers: ('admin' | 'teacher' | 'student' | 'system')[];
  useCases: string[];
  limitations: string[];

  // Behavior Configuration
  systemPrompt: string;
  temperature: number;
  maxTokens?: number;
  model?: string;
  fallbackTemplate?: string;
  outputSchema?: unknown; // ZodTypeAny — kept as unknown to avoid importing zod here

  // Context & Data Requirements
  requiredContext: string[];
  optionalContext: string[];
  dataAccess: {
    tables?: string[];
    permissions: ('read' | 'write')[];
  };

  // Validation & Safety
  inputValidation: {
    maxLength: number;
    allowedFields: string[];
    sensitiveDataHandling: 'block' | 'sanitize' | 'allow';
  };

  // Monitoring & Analytics
  enableLogging: boolean;
  enableAnalytics: boolean;
  successMetrics: string[];

  // UI Integration
  uiConfig: {
    category: 'content' | 'analysis' | 'automation' | 'communication' | 'assistant';
    icon: string;
    placement: ('dashboard' | 'modal' | 'inline' | 'sidebar')[];
    loadingMessage?: string;
    errorMessage?: string;
  };
}

// Agent Execution Context
export interface AgentContext {
  // User Information
  userId: string;
  userRole: 'admin' | 'teacher' | 'student';

  // Request Context
  sessionId: string;
  requestId: string;
  timestamp: Date;

  // Application Context
  currentPage?: string;
  entityId?: string; // ID of current student, lesson, song, etc.
  entityType?: string;

  // Additional Context Data
  contextData: Record<string, unknown>;
}

// Agent Execution Request
export interface AgentRequest {
  agentId: string;
  input: Record<string, unknown>;
  context: AgentContext;
  overrides?: {
    model?: string;
    temperature?: number;
    systemPrompt?: string;
  };
}

// Agent Execution Response
export interface AgentResponse {
  success: boolean;
  result?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    agentId: string;
    executionTime: number;
    tokensUsed?: number;
    model: string;
    provider: string;
  };
  analytics: {
    requestId: string;
    timestamp: Date;
    inputHash: string;
    successful: boolean;
  };
}
