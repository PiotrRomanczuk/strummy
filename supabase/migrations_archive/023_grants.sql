-- ============================================================================
-- Migration 023: Explicit Grants
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Explicit permission grants for all tables

-- ============================================================================
-- AUTHENTICATED USERS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pending_students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON songs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_songs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON practice_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON student_song_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON spotify_matches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_usage_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_prompt_templates TO authenticated;
GRANT SELECT, INSERT ON agent_execution_logs TO authenticated;
GRANT SELECT ON audit_log TO authenticated;

-- Views
GRANT SELECT ON v_lesson_counts_per_teacher TO authenticated;
GRANT SELECT ON v_lesson_counts_per_student TO authenticated;
GRANT SELECT ON v_song_usage_stats TO authenticated;
GRANT SELECT ON v_student_overview TO authenticated;
GRANT SELECT ON v_upcoming_lessons TO authenticated;
GRANT SELECT ON v_assignment_overview TO authenticated;

-- Materialized views
GRANT SELECT ON mv_dashboard_stats TO authenticated;
GRANT SELECT ON mv_song_popularity TO authenticated;

-- Sequences (for UUID generation if needed)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- SERVICE ROLE (for triggers and admin operations)
-- ============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- ANON (public, unauthenticated)
-- ============================================================================
-- Minimal permissions for public access (if any)
-- Currently none - all access requires authentication
