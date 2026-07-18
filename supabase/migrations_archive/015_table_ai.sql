-- ============================================================================
-- Migration 015: AI Tables
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- AI conversations, messages, usage tracking, and prompt templates

-- ============================================================================
-- AI CONVERSATIONS
-- ============================================================================
-- Chat sessions between users and AI assistant

CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Conversation details
    title VARCHAR(255),
    model_id VARCHAR(255) NOT NULL,
    context_type ai_context_type NOT NULL DEFAULT 'general',
    context_id UUID,  -- ID of related entity (student, lesson, etc.)
    is_archived BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ix_ai_conversations_user ON ai_conversations(user_id, created_at DESC);
CREATE INDEX ix_ai_conversations_context ON ai_conversations(context_type, context_id);
CREATE INDEX ix_ai_conversations_active ON ai_conversations(user_id, created_at DESC) WHERE NOT is_archived;

-- Trigger
CREATE TRIGGER tr_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE ai_conversations IS 'Chat sessions between users and AI assistant';
COMMENT ON COLUMN ai_conversations.context_type IS 'Type of entity this conversation relates to';
COMMENT ON COLUMN ai_conversations.context_id IS 'UUID of the related entity';

-- ============================================================================
-- AI MESSAGES
-- ============================================================================
-- Individual messages within a conversation

CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent conversation
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,

    -- Message details
    role ai_message_role NOT NULL,
    content TEXT NOT NULL,
    model_id VARCHAR(255),  -- Model used for assistant responses

    -- Metrics
    tokens_used INTEGER,
    latency_ms INTEGER,

    -- Feedback
    is_helpful BOOLEAN,  -- Simple thumbs up/down

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ix_ai_messages_conversation ON ai_messages(conversation_id, created_at);

-- Comments
COMMENT ON TABLE ai_messages IS 'Individual messages within AI conversations';
COMMENT ON COLUMN ai_messages.tokens_used IS 'Number of tokens consumed';
COMMENT ON COLUMN ai_messages.latency_ms IS 'Response generation time in milliseconds';
COMMENT ON COLUMN ai_messages.is_helpful IS 'User feedback: true=helpful, false=not helpful, null=no feedback';

-- ============================================================================
-- AI USAGE STATS
-- ============================================================================
-- Daily aggregated usage for analytics and rate limiting

CREATE TABLE ai_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Aggregation keys
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    model_id VARCHAR(255) NOT NULL,

    -- Metrics
    request_count INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_latency_ms INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One row per user/date/model
    CONSTRAINT uq_ai_usage_stats UNIQUE (user_id, date, model_id)
);

-- Indexes
CREATE INDEX ix_ai_usage_stats_user_date ON ai_usage_stats(user_id, date DESC);
CREATE INDEX ix_ai_usage_stats_date ON ai_usage_stats(date DESC);

-- Trigger
CREATE TRIGGER tr_ai_usage_stats_updated_at
    BEFORE UPDATE ON ai_usage_stats
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE ai_usage_stats IS 'Daily aggregated AI usage for analytics and rate limiting';

-- ============================================================================
-- AI PROMPT TEMPLATES
-- ============================================================================
-- Reusable prompt templates for common AI tasks

CREATE TABLE ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template details
    name VARCHAR(255) NOT NULL,
    description medium_text,
    category ai_prompt_category NOT NULL DEFAULT 'custom',
    prompt_template TEXT NOT NULL,  -- Template with {{placeholders}}
    variables JSONB,  -- Expected variables: ["student_name", "lesson_date"]

    -- Flags
    is_system BOOLEAN NOT NULL DEFAULT false,  -- System templates vs user-created
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Owner (null for system templates)
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ix_ai_prompt_templates_category ON ai_prompt_templates(category);
CREATE INDEX ix_ai_prompt_templates_active ON ai_prompt_templates(is_active, category) WHERE is_active = true;
CREATE INDEX ix_ai_prompt_templates_user ON ai_prompt_templates(created_by) WHERE created_by IS NOT NULL;

-- Trigger
CREATE TRIGGER tr_ai_prompt_templates_updated_at
    BEFORE UPDATE ON ai_prompt_templates
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE ai_prompt_templates IS 'Reusable prompt templates for common AI tasks';
COMMENT ON COLUMN ai_prompt_templates.prompt_template IS 'Template text with {{placeholder}} variables';
COMMENT ON COLUMN ai_prompt_templates.variables IS 'JSON array of expected variable names';
COMMENT ON COLUMN ai_prompt_templates.is_system IS 'System-provided template (not deletable by users)';

-- ============================================================================
-- AGENT EXECUTION LOGS
-- ============================================================================
-- Tracks AI agent executions for monitoring

CREATE TABLE agent_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Agent info
    agent_id VARCHAR(255) NOT NULL,
    request_id VARCHAR(255) NOT NULL,

    -- User context
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Execution details
    successful BOOLEAN NOT NULL,
    execution_time INTEGER NOT NULL,  -- milliseconds
    input_hash VARCHAR(64) NOT NULL,
    error_code VARCHAR(100),

    -- Timestamps
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ix_agent_logs_agent ON agent_execution_logs(agent_id, timestamp DESC);
CREATE INDEX ix_agent_logs_user ON agent_execution_logs(user_id, timestamp DESC);
CREATE INDEX ix_agent_logs_successful ON agent_execution_logs(successful, timestamp DESC);

-- Comments
COMMENT ON TABLE agent_execution_logs IS 'Tracks AI agent execution for monitoring and analytics';
COMMENT ON COLUMN agent_execution_logs.execution_time IS 'Execution time in milliseconds';
COMMENT ON COLUMN agent_execution_logs.input_hash IS 'Hash of input data for deduplication analysis';
