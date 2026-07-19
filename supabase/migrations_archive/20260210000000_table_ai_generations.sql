-- ============================================================================
-- Migration: AI Generations Table
-- Guitar CRM - AI Generation History & Tracking
-- ============================================================================
-- Stores structured generation outputs across all generation types
-- with input params, model info, and success/error status.

-- ============================================================================
-- ENUM TYPE
-- ============================================================================

CREATE TYPE ai_generation_type AS ENUM (
    'lesson_notes',
    'assignment',
    'email_draft',
    'post_lesson_summary',
    'student_progress',
    'admin_insights',
    'chat'
);

COMMENT ON TYPE ai_generation_type IS 'Types of AI generation outputs';

-- ============================================================================
-- AI GENERATIONS TABLE
-- ============================================================================

CREATE TABLE ai_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Generation type
    generation_type ai_generation_type NOT NULL,

    -- Agent/model info
    agent_id VARCHAR(255),
    model_id VARCHAR(255),
    provider VARCHAR(100),

    -- Input/output
    input_params JSONB NOT NULL,
    output_content TEXT NOT NULL,

    -- Status
    is_successful BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,

    -- Context linking
    context_entity_type VARCHAR(50),
    context_entity_id UUID,

    -- User features
    is_starred BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX ix_ai_generations_user_date ON ai_generations(user_id, created_at DESC);
CREATE INDEX ix_ai_generations_type_date ON ai_generations(generation_type, created_at DESC);
CREATE INDEX ix_ai_generations_user_type_date ON ai_generations(user_id, generation_type, created_at DESC);
CREATE INDEX ix_ai_generations_starred ON ai_generations(user_id, created_at DESC) WHERE is_starred = true;
CREATE INDEX ix_ai_generations_context ON ai_generations(context_entity_type, context_entity_id) WHERE context_entity_type IS NOT NULL;

-- ============================================================================
-- TRIGGER
-- ============================================================================

CREATE TRIGGER trigger_update_updated_at
    BEFORE UPDATE ON ai_generations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Users can view their own generations
CREATE POLICY ai_generations_select_own ON ai_generations
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all generations
CREATE POLICY ai_generations_select_admin ON ai_generations
    FOR SELECT USING (is_admin());

-- Users can insert their own generations
CREATE POLICY ai_generations_insert ON ai_generations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own generations (star/unstar)
CREATE POLICY ai_generations_update_own ON ai_generations
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own generations
CREATE POLICY ai_generations_delete_own ON ai_generations
    FOR DELETE USING (user_id = auth.uid());

-- Admins can delete any generation
CREATE POLICY ai_generations_delete_admin ON ai_generations
    FOR DELETE USING (is_admin());

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ai_generations TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ai_generations IS 'Stores structured AI generation outputs with input params, model info, and status';
COMMENT ON COLUMN ai_generations.agent_id IS 'Agent ID used for the generation (null for direct provider calls)';
COMMENT ON COLUMN ai_generations.input_params IS 'JSON object of input parameters passed to the generation';
COMMENT ON COLUMN ai_generations.output_content IS 'Full text output of the generation';
COMMENT ON COLUMN ai_generations.context_entity_type IS 'Type of related entity (student, lesson, etc.)';
COMMENT ON COLUMN ai_generations.context_entity_id IS 'UUID of the related entity';
COMMENT ON COLUMN ai_generations.is_starred IS 'User-starred for quick access';
