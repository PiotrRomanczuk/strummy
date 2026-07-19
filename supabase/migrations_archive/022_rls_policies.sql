-- ============================================================================
-- Migration 022: RLS Policies
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- All RLS policies in one place for easy review

-- ============================================================================
-- PROFILES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY profiles_select_own ON profiles
    FOR SELECT USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY profiles_select_admin ON profiles
    FOR SELECT USING (is_admin());

-- Teachers can view all profiles (need to see students)
CREATE POLICY profiles_select_teacher ON profiles
    FOR SELECT USING (is_teacher());

-- Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Admins can update all profiles
CREATE POLICY profiles_update_admin ON profiles
    FOR UPDATE USING (is_admin());

-- Only admins can delete profiles
CREATE POLICY profiles_delete_admin ON profiles
    FOR DELETE USING (is_admin());

-- Note: INSERT handled by auth trigger, not direct inserts

-- ============================================================================
-- PENDING STUDENTS
-- ============================================================================

-- Teachers can view pending students they created
CREATE POLICY pending_students_select ON pending_students
    FOR SELECT USING (created_by = auth.uid() OR is_admin());

-- Teachers can create pending students
CREATE POLICY pending_students_insert ON pending_students
    FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Teachers can update their own pending students
CREATE POLICY pending_students_update ON pending_students
    FOR UPDATE USING (created_by = auth.uid() OR is_admin());

-- Teachers can delete their own pending students
CREATE POLICY pending_students_delete ON pending_students
    FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- ============================================================================
-- SONGS
-- ============================================================================

-- Admins and teachers can see all non-deleted songs
CREATE POLICY songs_select_staff ON songs
    FOR SELECT USING (
        deleted_at IS NULL AND is_admin_or_teacher()
    );

-- Students can only see songs assigned to them
CREATE POLICY songs_select_student ON songs
    FOR SELECT USING (
        deleted_at IS NULL
        AND is_student()
        AND EXISTS (
            SELECT 1 FROM lesson_songs ls
            JOIN lessons l ON ls.lesson_id = l.id
            WHERE ls.song_id = songs.id
            AND l.student_id = auth.uid()
            AND l.deleted_at IS NULL
        )
    );

-- Only admins and teachers can create songs
CREATE POLICY songs_insert ON songs
    FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Only admins and teachers can update songs
CREATE POLICY songs_update ON songs
    FOR UPDATE USING (deleted_at IS NULL AND is_admin_or_teacher());

-- Only admins and teachers can delete songs
CREATE POLICY songs_delete ON songs
    FOR DELETE USING (is_admin_or_teacher());

-- ============================================================================
-- LESSONS
-- ============================================================================

-- Admins can see all lessons
CREATE POLICY lessons_select_admin ON lessons
    FOR SELECT USING (is_admin());

-- Teachers can see their lessons
CREATE POLICY lessons_select_teacher ON lessons
    FOR SELECT USING (teacher_id = auth.uid());

-- Students can see their lessons
CREATE POLICY lessons_select_student ON lessons
    FOR SELECT USING (student_id = auth.uid());

-- Only admins and teachers can create lessons
CREATE POLICY lessons_insert ON lessons
    FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Only admins and teachers can update lessons
CREATE POLICY lessons_update ON lessons
    FOR UPDATE USING (is_admin_or_teacher());

-- Only admins and teachers can delete lessons
CREATE POLICY lessons_delete ON lessons
    FOR DELETE USING (is_admin_or_teacher());

-- ============================================================================
-- LESSON SONGS
-- ============================================================================
-- NOTE: NO permissive "all authenticated" policy - visibility cascades from lessons

-- Users can see lesson_songs if they can see the parent lesson
CREATE POLICY lesson_songs_select ON lesson_songs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lessons l
            WHERE l.id = lesson_songs.lesson_id
            AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid() OR is_admin())
        )
    );

-- Only admins and teachers can modify lesson_songs
CREATE POLICY lesson_songs_insert ON lesson_songs
    FOR INSERT WITH CHECK (is_admin_or_teacher());

CREATE POLICY lesson_songs_update ON lesson_songs
    FOR UPDATE USING (is_admin_or_teacher());

CREATE POLICY lesson_songs_delete ON lesson_songs
    FOR DELETE USING (is_admin_or_teacher());

-- ============================================================================
-- ASSIGNMENTS
-- ============================================================================

-- Admins can see all assignments
CREATE POLICY assignments_select_admin ON assignments
    FOR SELECT USING (is_admin());

-- Teachers can see assignments they created
CREATE POLICY assignments_select_teacher ON assignments
    FOR SELECT USING (teacher_id = auth.uid());

-- Students can see assignments assigned to them
CREATE POLICY assignments_select_student ON assignments
    FOR SELECT USING (student_id = auth.uid());

-- Only admins and teachers can create assignments
CREATE POLICY assignments_insert ON assignments
    FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Only admins and teachers can update assignments
CREATE POLICY assignments_update ON assignments
    FOR UPDATE USING (is_admin_or_teacher());

-- Only admins and teachers can delete assignments
CREATE POLICY assignments_delete ON assignments
    FOR DELETE USING (is_admin_or_teacher());

-- ============================================================================
-- ASSIGNMENT TEMPLATES
-- ============================================================================

-- Admins can see all templates
CREATE POLICY assignment_templates_select_admin ON assignment_templates
    FOR SELECT USING (is_admin());

-- Teachers can see their own templates
CREATE POLICY assignment_templates_select_teacher ON assignment_templates
    FOR SELECT USING (teacher_id = auth.uid());

-- Teachers can manage their own templates
CREATE POLICY assignment_templates_insert ON assignment_templates
    FOR INSERT WITH CHECK (teacher_id = auth.uid() AND is_admin_or_teacher());

CREATE POLICY assignment_templates_update ON assignment_templates
    FOR UPDATE USING (teacher_id = auth.uid() OR is_admin());

CREATE POLICY assignment_templates_delete ON assignment_templates
    FOR DELETE USING (teacher_id = auth.uid() OR is_admin());

-- ============================================================================
-- PRACTICE SESSIONS
-- ============================================================================

-- Students can manage their own practice sessions
CREATE POLICY practice_sessions_select_own ON practice_sessions
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY practice_sessions_insert_own ON practice_sessions
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY practice_sessions_update_own ON practice_sessions
    FOR UPDATE USING (student_id = auth.uid());

-- Admins and teachers can view all practice sessions
CREATE POLICY practice_sessions_select_staff ON practice_sessions
    FOR SELECT USING (is_admin_or_teacher());

-- ============================================================================
-- STUDENT SONG PROGRESS
-- ============================================================================

-- Students can view and manage their own progress
CREATE POLICY student_song_progress_select_own ON student_song_progress
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY student_song_progress_insert_own ON student_song_progress
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY student_song_progress_update_own ON student_song_progress
    FOR UPDATE USING (student_id = auth.uid());

-- Teachers and admins can view and update all progress
CREATE POLICY student_song_progress_select_staff ON student_song_progress
    FOR SELECT USING (is_admin_or_teacher());

CREATE POLICY student_song_progress_insert_staff ON student_song_progress
    FOR INSERT WITH CHECK (is_admin_or_teacher());

CREATE POLICY student_song_progress_update_staff ON student_song_progress
    FOR UPDATE USING (is_admin_or_teacher());

-- ============================================================================
-- API KEYS
-- ============================================================================

-- Users can only manage their own API keys
CREATE POLICY api_keys_select ON api_keys
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY api_keys_insert ON api_keys
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY api_keys_update ON api_keys
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY api_keys_delete ON api_keys
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- USER INTEGRATIONS
-- ============================================================================

-- Users can only manage their own integrations
CREATE POLICY user_integrations_select ON user_integrations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_integrations_insert ON user_integrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_integrations_update ON user_integrations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_integrations_delete ON user_integrations
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- WEBHOOK SUBSCRIPTIONS
-- ============================================================================

-- Users can only manage their own subscriptions
CREATE POLICY webhook_subscriptions_select ON webhook_subscriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY webhook_subscriptions_insert ON webhook_subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY webhook_subscriptions_update ON webhook_subscriptions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY webhook_subscriptions_delete ON webhook_subscriptions
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- SPOTIFY MATCHES
-- ============================================================================

-- Admins and teachers can view all matches
CREATE POLICY spotify_matches_select ON spotify_matches
    FOR SELECT USING (is_admin_or_teacher());

-- Admins and teachers can insert matches
CREATE POLICY spotify_matches_insert ON spotify_matches
    FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Admins and teachers can update matches (for review)
CREATE POLICY spotify_matches_update ON spotify_matches
    FOR UPDATE USING (is_admin_or_teacher());

-- Only admins can delete matches
CREATE POLICY spotify_matches_delete ON spotify_matches
    FOR DELETE USING (is_admin());

-- ============================================================================
-- AI CONVERSATIONS
-- ============================================================================

-- Users can only access their own conversations
CREATE POLICY ai_conversations_select ON ai_conversations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY ai_conversations_insert ON ai_conversations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_conversations_update ON ai_conversations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY ai_conversations_delete ON ai_conversations
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- AI MESSAGES
-- ============================================================================

-- Users can access messages in their own conversations
CREATE POLICY ai_messages_select ON ai_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ai_conversations
            WHERE ai_conversations.id = ai_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY ai_messages_insert ON ai_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_conversations
            WHERE ai_conversations.id = ai_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY ai_messages_update ON ai_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM ai_conversations
            WHERE ai_conversations.id = ai_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()
        )
    );

-- ============================================================================
-- AI USAGE STATS
-- ============================================================================

-- Users can view their own usage
CREATE POLICY ai_usage_stats_select_own ON ai_usage_stats
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all usage
CREATE POLICY ai_usage_stats_select_admin ON ai_usage_stats
    FOR SELECT USING (is_admin());

-- Users can insert/update their own usage
CREATE POLICY ai_usage_stats_insert ON ai_usage_stats
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_usage_stats_update ON ai_usage_stats
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- AI PROMPT TEMPLATES
-- ============================================================================

-- Everyone can view system templates and their own
CREATE POLICY ai_prompt_templates_select ON ai_prompt_templates
    FOR SELECT USING (is_system = true OR created_by = auth.uid() OR is_admin());

-- Users can create their own templates
CREATE POLICY ai_prompt_templates_insert ON ai_prompt_templates
    FOR INSERT WITH CHECK (created_by = auth.uid() AND is_system = false);

-- Users can update their own templates, admins can update all
CREATE POLICY ai_prompt_templates_update ON ai_prompt_templates
    FOR UPDATE USING ((created_by = auth.uid() AND is_system = false) OR is_admin());

-- Users can delete their own templates, admins can delete all
CREATE POLICY ai_prompt_templates_delete ON ai_prompt_templates
    FOR DELETE USING ((created_by = auth.uid() AND is_system = false) OR is_admin());

-- ============================================================================
-- AGENT EXECUTION LOGS
-- ============================================================================

-- Users can view their own logs
CREATE POLICY agent_logs_select_own ON agent_execution_logs
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY agent_logs_select_admin ON agent_execution_logs
    FOR SELECT USING (is_admin());

-- Users can insert their own logs
CREATE POLICY agent_logs_insert ON agent_execution_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

-- Admins can view all audit logs
CREATE POLICY audit_log_select_admin ON audit_log
    FOR SELECT USING (is_admin());

-- Users can view audit logs for entities they have access to
CREATE POLICY audit_log_select_own ON audit_log
    FOR SELECT USING (actor_id = auth.uid());

-- Only triggers (service role) can insert audit logs
-- No direct insert policy for regular users
