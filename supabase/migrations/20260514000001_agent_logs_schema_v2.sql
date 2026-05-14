-- Migration: Extend agent_execution_logs with analytics columns
-- Adds missing columns referenced by analytics.ts logExecution

ALTER TABLE agent_execution_logs
  ADD COLUMN IF NOT EXISTS user_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS model_used VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_used VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
  ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Index for cost analysis
CREATE INDEX IF NOT EXISTS ix_agent_logs_cost ON agent_execution_logs(cost_usd, timestamp DESC) WHERE cost_usd > 0;

-- Index for provider analysis
CREATE INDEX IF NOT EXISTS ix_agent_logs_provider ON agent_execution_logs(provider_used, timestamp DESC);

COMMENT ON COLUMN agent_execution_logs.cost_usd IS 'Computed API cost in USD based on model pricing';
COMMENT ON COLUMN agent_execution_logs.provider_used IS 'Actual AI provider used (openrouter/ollama)';
