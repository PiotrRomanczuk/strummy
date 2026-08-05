-- Migration: legacy RLS policies → profile-id space; chain-set re-assertion
-- ============================================================================
-- Date: 2026-07-27. Implements the legacy-policy sweep from
-- docs/analysis/2026-07-27-migrations-architecture-review.md (finding 1's
-- inherited class + finding 10 for every policy touched here).
--
-- Two distinct drift classes repaired, verified against the LIVE dev stack
-- (pg_policies) and the baseline dump:
--
-- 1. CHAIN-OWNED TABLES (profiles, songs, lessons, lesson_songs, assignments,
--    assignment_templates): stale legacy policy sets coexist with the chain's
--    sets. Policies are permissive (OR-combined), so every legacy predicate
--    comparing a profiles.id-space column to auth.uid() silently broadens or
--    narrows access beside the chain's correct policies. Worse, live drift
--    REMOVED two chain policies out-of-band (songs_select_active,
--    profiles_select_staff — absent from pg_policies on dev). Part 1 drops
--    every stale policy by name and re-asserts the chain's canonical set,
--    InitPlan-wrapped ((select helper()) — Supabase perf guidance).
--
-- 2. BASELINE-ONLY TABLES: their policies compare profile-id-space columns
--    (FKs → profiles(id), verified via pg_constraint) directly to auth.uid().
--    Part 2 recreates each with the comparison in profile-id space via
--    (select public.current_profile_id()), role-check EXISTS subqueries
--    replaced by the chain helpers, and TO authenticated made explicit.
--    Value-space exceptions NOT rewritten (their columns FK auth.users):
--    api_keys, apple_shortcut_song_import_log, user_integrations,
--    webhook_subscriptions, drive_files.uploaded_by, song_videos.uploaded_by.
--    audit_log partitions inherit the parent's policy; only the parent is
--    recreated.
--
-- 3. has_role(user_role): reads the abolished user_roles table; its last two
--    policy references ("Teachers can create student profiles" / "Teachers
--    can read all profiles") are dropped in Part 1, and task_management's
--    user_roles-admin EXISTS is replaced by public.is_admin(). Part 3 drops
--    the function. teacher_teaches_student() also loses its last policy
--    references here; the function is left in place (harmless, data-only).
--
-- Teacher intake note: the shadow-profile INSERT in app/api/users/route.ts
-- runs on the USER-scoped client and relied on the legacy blanket
-- has_role('teacher') INSERT policy — which also let a teacher insert
-- profiles with is_admin = true. profiles_insert_staff below preserves the
-- intake path with tight bounds: teachers may only create shadow student
-- profiles (user_id IS NULL, no role flags); admins keep full insert.
--
-- DEPENDENCY: Part 2 references baseline-only tables unguarded. All real
-- stacks (dev, prod-at-cutover) have them; fresh `db reset` replay is
-- covered by the pre-chain baseline migration landing in this same PR
-- (finding 3) — the chain already hard-requires it (20260718210000 et al.).
-- Idempotent: every CREATE POLICY is preceded by DROP POLICY IF EXISTS.
-- ============================================================================
--
-- CORRECTION (2026-08-05): every Part 2 policy predicate below originally
-- read `user_id` — a column none of these baseline-only tables have; they're
-- all profile-id space, like everything else this migration otherwise
-- upholds. Running the original file fails outright ("column user_id does
-- not exist"), which is exactly what happened: this migration was registered
-- as applied on StudentProduction but never actually created any of these
-- policies there. StudentDevelopment's LIVE policies (confirmed via
-- pg_policies) all correctly use profile_id / recipient_profile_id — so
-- either this file was never actually run against dev either, or dev's
-- objects were hand-corrected afterward outside the migration system. Either
-- way, this file is now the odd one out; brought in line with what's
-- actually live by replacing `user_id`→`profile_id` and
-- `recipient_user_id`→`recipient_profile_id` throughout Part 2 and Part 3
-- (Part 1, the profiles table's own `user_id` column, is untouched — that
-- one is real).
-- ============================================================================


-- ============================================================================
-- PART 1 — chain-owned tables: drop stale legacy sets, re-assert canon
-- ============================================================================

-- ---- profiles ---------------------------------------------------------------
-- Stale legacy (baseline/archive era):
DROP POLICY IF EXISTS "Teachers can create student profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS delete_own_or_admin_profile ON public.profiles;
DROP POLICY IF EXISTS insert_profile_admin_only ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own_teacher ON public.profiles;
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
DROP POLICY IF EXISTS select_own_or_admin_profile ON public.profiles;
DROP POLICY IF EXISTS update_own_or_admin_profile ON public.profiles;

-- Canonical set (20260718090100 + 20260718090300), InitPlan-wrapped.
-- profiles_select_parent (20260727100000) is left as-is.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR (select public.is_admin()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()) OR (select public.is_admin()))
  WITH CHECK (user_id = (select auth.uid()) OR (select public.is_admin()));

-- Replaces both profiles_admin_insert (admin-only, broke teacher intake) and
-- the legacy blanket teacher INSERT (allowed teacher-created admins).
DROP POLICY IF EXISTS profiles_admin_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_staff ON public.profiles;
CREATE POLICY profiles_insert_staff ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.is_admin())
    OR ((select public.is_teacher())
        AND user_id IS NULL          -- shadow profile only (claimed at signup)
        AND is_student = true
        AND is_admin = false
        AND is_teacher = false)
  );

DROP POLICY IF EXISTS profiles_admin_delete ON public.profiles;
CREATE POLICY profiles_admin_delete ON public.profiles
  FOR DELETE TO authenticated
  USING ((select public.is_admin()));

DROP POLICY IF EXISTS profiles_select_staff ON public.profiles;
CREATE POLICY profiles_select_staff ON public.profiles
  FOR SELECT TO authenticated
  USING ((select public.is_admin_or_teacher()));

-- ---- songs ------------------------------------------------------------------
DROP POLICY IF EXISTS songs_delete ON public.songs;
DROP POLICY IF EXISTS songs_insert ON public.songs;
DROP POLICY IF EXISTS songs_update ON public.songs;
DROP POLICY IF EXISTS songs_delete_policy ON public.songs;
DROP POLICY IF EXISTS songs_insert_policy ON public.songs;
DROP POLICY IF EXISTS songs_select_policy ON public.songs;
DROP POLICY IF EXISTS songs_update_policy ON public.songs;
DROP POLICY IF EXISTS songs_select_student ON public.songs;
DROP POLICY IF EXISTS "Songs: Students can view assigned songs" ON public.songs;
-- not in the chain; superseded by songs_select_active below
DROP POLICY IF EXISTS songs_select_staff ON public.songs;

-- Canonical set (20260718090200): shared library — any authenticated user
-- reads non-deleted rows (covers students; the dropped per-lesson student
-- policies are redundant under this design). songs_select_parent stays.
DROP POLICY IF EXISTS songs_select_active ON public.songs;
CREATE POLICY songs_select_active ON public.songs
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL OR (select public.is_admin()));

DROP POLICY IF EXISTS songs_insert_staff ON public.songs;
CREATE POLICY songs_insert_staff ON public.songs
  FOR INSERT TO authenticated
  WITH CHECK ((select public.is_admin_or_teacher()));

DROP POLICY IF EXISTS songs_update_staff ON public.songs;
CREATE POLICY songs_update_staff ON public.songs
  FOR UPDATE TO authenticated
  USING ((select public.is_admin_or_teacher()))
  WITH CHECK ((select public.is_admin_or_teacher()));

DROP POLICY IF EXISTS songs_delete_staff ON public.songs;
CREATE POLICY songs_delete_staff ON public.songs
  FOR DELETE TO authenticated
  USING ((select public.is_admin_or_teacher()));

-- ---- lessons ----------------------------------------------------------------
DROP POLICY IF EXISTS lessons_delete_policy ON public.lessons;
DROP POLICY IF EXISTS lessons_select_admin ON public.lessons;
DROP POLICY IF EXISTS lessons_select_student ON public.lessons;
DROP POLICY IF EXISTS lessons_select_teacher ON public.lessons;
DROP POLICY IF EXISTS lessons_update_policy ON public.lessons;

-- Canonical set (20260718090300). lessons_select_parent stays.
DROP POLICY IF EXISTS lessons_select_participant ON public.lessons;
CREATE POLICY lessons_select_participant ON public.lessons
  FOR SELECT TO authenticated
  USING ((select public.is_admin())
         OR teacher_id = (select public.current_profile_id())
         OR student_id = (select public.current_profile_id()));

DROP POLICY IF EXISTS lessons_insert_teacher ON public.lessons;
CREATE POLICY lessons_insert_teacher ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK ((select public.is_admin())
              OR ((select public.is_teacher())
                  AND teacher_id = (select public.current_profile_id())));

DROP POLICY IF EXISTS lessons_update_teacher ON public.lessons;
CREATE POLICY lessons_update_teacher ON public.lessons
  FOR UPDATE TO authenticated
  USING ((select public.is_admin()) OR teacher_id = (select public.current_profile_id()))
  WITH CHECK ((select public.is_admin()) OR teacher_id = (select public.current_profile_id()));

DROP POLICY IF EXISTS lessons_delete_teacher ON public.lessons;
CREATE POLICY lessons_delete_teacher ON public.lessons
  FOR DELETE TO authenticated
  USING ((select public.is_admin()) OR teacher_id = (select public.current_profile_id()));

-- ---- lesson_songs -----------------------------------------------------------
DROP POLICY IF EXISTS delete_lesson_songs_admin ON public.lesson_songs;
DROP POLICY IF EXISTS insert_lesson_songs_admin ON public.lesson_songs;
DROP POLICY IF EXISTS select_lesson_songs_participants ON public.lesson_songs;
DROP POLICY IF EXISTS update_lesson_songs_admin ON public.lesson_songs;

-- Canonical set (20260718090400) — visibility inherits the parent lesson.
DROP POLICY IF EXISTS lesson_songs_select ON public.lesson_songs;
CREATE POLICY lesson_songs_select ON public.lesson_songs
  FOR SELECT TO authenticated
  USING ((select public.can_access_lesson(lesson_id)));

DROP POLICY IF EXISTS lesson_songs_insert ON public.lesson_songs;
CREATE POLICY lesson_songs_insert ON public.lesson_songs
  FOR INSERT TO authenticated
  WITH CHECK ((select public.can_manage_lesson(lesson_id)));

DROP POLICY IF EXISTS lesson_songs_update ON public.lesson_songs;
CREATE POLICY lesson_songs_update ON public.lesson_songs
  FOR UPDATE TO authenticated
  USING ((select public.can_manage_lesson(lesson_id)))
  WITH CHECK ((select public.can_manage_lesson(lesson_id)));

DROP POLICY IF EXISTS lesson_songs_delete ON public.lesson_songs;
CREATE POLICY lesson_songs_delete ON public.lesson_songs
  FOR DELETE TO authenticated
  USING ((select public.can_manage_lesson(lesson_id)));

-- ---- assignments ------------------------------------------------------------
DROP POLICY IF EXISTS assignments_delete_policy ON public.assignments;
DROP POLICY IF EXISTS assignments_select_admin ON public.assignments;
DROP POLICY IF EXISTS assignments_select_student ON public.assignments;
DROP POLICY IF EXISTS assignments_select_teacher ON public.assignments;
DROP POLICY IF EXISTS assignments_update_policy ON public.assignments;

-- Canonical set (20260718090500). assignments_select_parent stays.
DROP POLICY IF EXISTS assignments_select_participant ON public.assignments;
CREATE POLICY assignments_select_participant ON public.assignments
  FOR SELECT TO authenticated
  USING ((select public.is_admin())
         OR teacher_id = (select public.current_profile_id())
         OR student_id = (select public.current_profile_id()));

DROP POLICY IF EXISTS assignments_insert_teacher ON public.assignments;
CREATE POLICY assignments_insert_teacher ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK ((select public.is_admin())
              OR ((select public.is_teacher())
                  AND teacher_id = (select public.current_profile_id())));

DROP POLICY IF EXISTS assignments_update_teacher ON public.assignments;
CREATE POLICY assignments_update_teacher ON public.assignments
  FOR UPDATE TO authenticated
  USING ((select public.is_admin()) OR teacher_id = (select public.current_profile_id()))
  WITH CHECK ((select public.is_admin()) OR teacher_id = (select public.current_profile_id()));

DROP POLICY IF EXISTS assignments_delete_teacher ON public.assignments;
CREATE POLICY assignments_delete_teacher ON public.assignments
  FOR DELETE TO authenticated
  USING ((select public.is_admin()) OR teacher_id = (select public.current_profile_id()));

-- ---- assignment_templates ---------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete all assignment templates" ON public.assignment_templates;
DROP POLICY IF EXISTS "Admins can insert assignment templates" ON public.assignment_templates;
DROP POLICY IF EXISTS "Admins can update all assignment templates" ON public.assignment_templates;
DROP POLICY IF EXISTS "Admins can view all assignment templates" ON public.assignment_templates;
DROP POLICY IF EXISTS "Teachers can delete their own assignment templates" ON public.assignment_templates;
DROP POLICY IF EXISTS "Teachers can insert their own assignment templates" ON public.assignment_templates;
DROP POLICY IF EXISTS "Teachers can update their own assignment templates" ON public.assignment_templates;
DROP POLICY IF EXISTS "Teachers can view their own assignment templates" ON public.assignment_templates;
DROP POLICY IF EXISTS assignment_templates_select_admin ON public.assignment_templates;
DROP POLICY IF EXISTS assignment_templates_select_teacher ON public.assignment_templates;

-- Canonical set (20260720000002).
DROP POLICY IF EXISTS assignment_templates_select ON public.assignment_templates;
CREATE POLICY assignment_templates_select ON public.assignment_templates
  FOR SELECT TO authenticated
  USING ((select public.is_admin()) OR teacher_id = (select public.current_profile_id()));

DROP POLICY IF EXISTS assignment_templates_insert ON public.assignment_templates;
CREATE POLICY assignment_templates_insert ON public.assignment_templates
  FOR INSERT TO authenticated
  WITH CHECK ((select public.is_admin())
              OR ((select public.is_teacher())
                  AND teacher_id = (select public.current_profile_id())));

DROP POLICY IF EXISTS assignment_templates_update ON public.assignment_templates;
CREATE POLICY assignment_templates_update ON public.assignment_templates
  FOR UPDATE TO authenticated
  USING ((select public.is_admin()) OR teacher_id = (select public.current_profile_id()))
  WITH CHECK ((select public.is_admin()) OR teacher_id = (select public.current_profile_id()));

DROP POLICY IF EXISTS assignment_templates_delete ON public.assignment_templates;
CREATE POLICY assignment_templates_delete ON public.assignment_templates
  FOR DELETE TO authenticated
  USING ((select public.is_admin()) OR teacher_id = (select public.current_profile_id()));


-- ============================================================================
-- PART 2 — baseline-only tables: policies recreated in profile-id space
-- ============================================================================
-- Mechanically generated from live pg_policies with the identity rewrite
-- (EXISTS role checks → chain helpers; auth.uid() → current_profile_id() on
-- profile-space columns), then reviewed line-by-line. task_management's
-- user_roles-admin EXISTS was additionally collapsed to public.is_admin().
-- agent_execution_logs.agent_logs_insert (INSERT)
DROP POLICY IF EXISTS agent_logs_insert ON public.agent_execution_logs;
CREATE POLICY agent_logs_insert ON public.agent_execution_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((profile_id = (select public.current_profile_id())));

-- agent_execution_logs.agent_logs_select_own (SELECT)
DROP POLICY IF EXISTS agent_logs_select_own ON public.agent_execution_logs;
CREATE POLICY agent_logs_select_own ON public.agent_execution_logs
  FOR SELECT
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- ai_conversations.ai_conversations_delete (DELETE)
DROP POLICY IF EXISTS ai_conversations_delete ON public.ai_conversations;
CREATE POLICY ai_conversations_delete ON public.ai_conversations
  FOR DELETE
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- ai_conversations.ai_conversations_insert (INSERT)
DROP POLICY IF EXISTS ai_conversations_insert ON public.ai_conversations;
CREATE POLICY ai_conversations_insert ON public.ai_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK ((profile_id = (select public.current_profile_id())));

-- ai_conversations.ai_conversations_select (SELECT)
DROP POLICY IF EXISTS ai_conversations_select ON public.ai_conversations;
CREATE POLICY ai_conversations_select ON public.ai_conversations
  FOR SELECT
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- ai_conversations.ai_conversations_update (UPDATE)
DROP POLICY IF EXISTS ai_conversations_update ON public.ai_conversations;
CREATE POLICY ai_conversations_update ON public.ai_conversations
  FOR UPDATE
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- ai_generations.ai_generations_delete_own (DELETE)
DROP POLICY IF EXISTS ai_generations_delete_own ON public.ai_generations;
CREATE POLICY ai_generations_delete_own ON public.ai_generations
  FOR DELETE
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- ai_generations.ai_generations_insert (INSERT)
DROP POLICY IF EXISTS ai_generations_insert ON public.ai_generations;
CREATE POLICY ai_generations_insert ON public.ai_generations
  FOR INSERT
  TO authenticated
  WITH CHECK ((profile_id = (select public.current_profile_id())));

-- ai_generations.ai_generations_select_own (SELECT)
DROP POLICY IF EXISTS ai_generations_select_own ON public.ai_generations;
CREATE POLICY ai_generations_select_own ON public.ai_generations
  FOR SELECT
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- ai_generations.ai_generations_update_own (UPDATE)
DROP POLICY IF EXISTS ai_generations_update_own ON public.ai_generations;
CREATE POLICY ai_generations_update_own ON public.ai_generations
  FOR UPDATE
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- ai_messages.ai_messages_insert (INSERT)
DROP POLICY IF EXISTS ai_messages_insert ON public.ai_messages;
CREATE POLICY ai_messages_insert ON public.ai_messages
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ai_conversations
  WHERE ((ai_conversations.id = ai_messages.conversation_id) AND (ai_conversations.profile_id = (select public.current_profile_id()))))));

-- ai_messages.ai_messages_select (SELECT)
DROP POLICY IF EXISTS ai_messages_select ON public.ai_messages;
CREATE POLICY ai_messages_select ON public.ai_messages
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ai_conversations
  WHERE ((ai_conversations.id = ai_messages.conversation_id) AND (ai_conversations.profile_id = (select public.current_profile_id()))))));

-- ai_messages.ai_messages_update (UPDATE)
DROP POLICY IF EXISTS ai_messages_update ON public.ai_messages;
CREATE POLICY ai_messages_update ON public.ai_messages
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ai_conversations
  WHERE ((ai_conversations.id = ai_messages.conversation_id) AND (ai_conversations.profile_id = (select public.current_profile_id()))))));

-- ai_prompt_templates.ai_prompt_templates_delete (DELETE)
DROP POLICY IF EXISTS ai_prompt_templates_delete ON public.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_delete ON public.ai_prompt_templates
  FOR DELETE
  TO authenticated
  USING ((((created_by = (select public.current_profile_id())) AND (is_system = false)) OR (select public.is_admin())));

-- ai_prompt_templates.ai_prompt_templates_insert (INSERT)
DROP POLICY IF EXISTS ai_prompt_templates_insert ON public.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_insert ON public.ai_prompt_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (((created_by = (select public.current_profile_id())) AND (is_system = false)));

-- ai_prompt_templates.ai_prompt_templates_select (SELECT)
DROP POLICY IF EXISTS ai_prompt_templates_select ON public.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_select ON public.ai_prompt_templates
  FOR SELECT
  TO authenticated
  USING (((is_system = true) OR (created_by = (select public.current_profile_id())) OR (select public.is_admin())));

-- ai_prompt_templates.ai_prompt_templates_update (UPDATE)
DROP POLICY IF EXISTS ai_prompt_templates_update ON public.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_update ON public.ai_prompt_templates
  FOR UPDATE
  TO authenticated
  USING ((((created_by = (select public.current_profile_id())) AND (is_system = false)) OR (select public.is_admin())));

-- ai_usage_stats.ai_usage_stats_insert (INSERT)
DROP POLICY IF EXISTS ai_usage_stats_insert ON public.ai_usage_stats;
CREATE POLICY ai_usage_stats_insert ON public.ai_usage_stats
  FOR INSERT
  TO authenticated
  WITH CHECK ((profile_id = (select public.current_profile_id())));

-- ai_usage_stats.ai_usage_stats_select_own (SELECT)
DROP POLICY IF EXISTS ai_usage_stats_select_own ON public.ai_usage_stats;
CREATE POLICY ai_usage_stats_select_own ON public.ai_usage_stats
  FOR SELECT
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- ai_usage_stats.ai_usage_stats_update (UPDATE)
DROP POLICY IF EXISTS ai_usage_stats_update ON public.ai_usage_stats;
CREATE POLICY ai_usage_stats_update ON public.ai_usage_stats
  FOR UPDATE
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- audit_log.audit_log_select_own (SELECT)
DROP POLICY IF EXISTS audit_log_select_own ON public.audit_log;
CREATE POLICY audit_log_select_own ON public.audit_log
  FOR SELECT
  TO authenticated
  USING ((actor_id = (select public.current_profile_id())));

-- chord_quiz_attempts.Students can insert their own chord quiz attempts (INSERT)
DROP POLICY IF EXISTS "Students can insert their own chord quiz attempts" ON public.chord_quiz_attempts;
CREATE POLICY "Students can insert their own chord quiz attempts" ON public.chord_quiz_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK ((student_id = (select public.current_profile_id())));

-- chord_quiz_attempts.Students can view their own chord quiz attempts (SELECT)
DROP POLICY IF EXISTS "Students can view their own chord quiz attempts" ON public.chord_quiz_attempts;
CREATE POLICY "Students can view their own chord quiz attempts" ON public.chord_quiz_attempts
  FOR SELECT
  TO authenticated
  USING ((student_id = (select public.current_profile_id())));

-- chord_srs.Students insert own SRS state (INSERT)
DROP POLICY IF EXISTS "Students insert own SRS state" ON public.chord_srs;
CREATE POLICY "Students insert own SRS state" ON public.chord_srs
  FOR INSERT
  TO authenticated
  WITH CHECK ((student_id = (select public.current_profile_id())));

-- chord_srs.Students read own SRS state (SELECT)
DROP POLICY IF EXISTS "Students read own SRS state" ON public.chord_srs;
CREATE POLICY "Students read own SRS state" ON public.chord_srs
  FOR SELECT
  TO authenticated
  USING ((student_id = (select public.current_profile_id())));

-- chord_srs.Students update own SRS state (UPDATE)
DROP POLICY IF EXISTS "Students update own SRS state" ON public.chord_srs;
CREATE POLICY "Students update own SRS state" ON public.chord_srs
  FOR UPDATE
  TO authenticated
  USING ((student_id = (select public.current_profile_id())));

-- in_app_notifications.in_app_notifications_admin_all (ALL)
DROP POLICY IF EXISTS in_app_notifications_admin_all ON public.in_app_notifications;
CREATE POLICY in_app_notifications_admin_all ON public.in_app_notifications
  FOR ALL
  TO authenticated
  USING ((select public.is_admin()));

-- in_app_notifications.in_app_notifications_select_own (SELECT)
DROP POLICY IF EXISTS in_app_notifications_select_own ON public.in_app_notifications;
CREATE POLICY in_app_notifications_select_own ON public.in_app_notifications
  FOR SELECT
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- in_app_notifications.in_app_notifications_update_own (UPDATE)
DROP POLICY IF EXISTS in_app_notifications_update_own ON public.in_app_notifications;
CREATE POLICY in_app_notifications_update_own ON public.in_app_notifications
  FOR UPDATE
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- notification_log.notification_log_select_admin (SELECT)
DROP POLICY IF EXISTS notification_log_select_admin ON public.notification_log;
CREATE POLICY notification_log_select_admin ON public.notification_log
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()));

-- notification_log.notification_log_select_own (SELECT)
DROP POLICY IF EXISTS notification_log_select_own ON public.notification_log;
CREATE POLICY notification_log_select_own ON public.notification_log
  FOR SELECT
  TO authenticated
  USING ((recipient_profile_id = (select public.current_profile_id())));

-- notification_preferences.notification_preferences_select_admin (SELECT)
DROP POLICY IF EXISTS notification_preferences_select_admin ON public.notification_preferences;
CREATE POLICY notification_preferences_select_admin ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()));

-- notification_preferences.notification_preferences_select_own (SELECT)
DROP POLICY IF EXISTS notification_preferences_select_own ON public.notification_preferences;
CREATE POLICY notification_preferences_select_own ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- notification_preferences.notification_preferences_update_own (UPDATE)
DROP POLICY IF EXISTS notification_preferences_update_own ON public.notification_preferences;
CREATE POLICY notification_preferences_update_own ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- notification_queue.notification_queue_select_admin (SELECT)
DROP POLICY IF EXISTS notification_queue_select_admin ON public.notification_queue;
CREATE POLICY notification_queue_select_admin ON public.notification_queue
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()));

-- notification_queue.notification_queue_select_own (SELECT)
DROP POLICY IF EXISTS notification_queue_select_own ON public.notification_queue;
CREATE POLICY notification_queue_select_own ON public.notification_queue
  FOR SELECT
  TO authenticated
  USING ((recipient_profile_id = (select public.current_profile_id())));

-- practice_sessions.practice_sessions_delete_own_today (DELETE)
DROP POLICY IF EXISTS practice_sessions_delete_own_today ON public.practice_sessions;
CREATE POLICY practice_sessions_delete_own_today ON public.practice_sessions
  FOR DELETE
  TO authenticated
  USING (((student_id = (select public.current_profile_id())) AND ((created_at)::date = CURRENT_DATE)));

-- practice_sessions.practice_sessions_insert_own (INSERT)
DROP POLICY IF EXISTS practice_sessions_insert_own ON public.practice_sessions;
CREATE POLICY practice_sessions_insert_own ON public.practice_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ((student_id = (select public.current_profile_id())));

-- practice_sessions.practice_sessions_select_own (SELECT)
DROP POLICY IF EXISTS practice_sessions_select_own ON public.practice_sessions;
CREATE POLICY practice_sessions_select_own ON public.practice_sessions
  FOR SELECT
  TO authenticated
  USING ((student_id = (select public.current_profile_id())));

-- practice_sessions.practice_sessions_update_own (UPDATE)
DROP POLICY IF EXISTS practice_sessions_update_own ON public.practice_sessions;
CREATE POLICY practice_sessions_update_own ON public.practice_sessions
  FOR UPDATE
  TO authenticated
  USING ((student_id = (select public.current_profile_id())));

-- song_of_the_week.Admins can delete SOTW (DELETE)
DROP POLICY IF EXISTS "Admins can delete SOTW" ON public.song_of_the_week;
CREATE POLICY "Admins can delete SOTW" ON public.song_of_the_week
  FOR DELETE
  TO authenticated
  USING ((select public.is_admin()));

-- song_of_the_week.Admins can insert SOTW (INSERT)
DROP POLICY IF EXISTS "Admins can insert SOTW" ON public.song_of_the_week;
CREATE POLICY "Admins can insert SOTW" ON public.song_of_the_week
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.is_admin()));

-- song_of_the_week.Admins can update SOTW (UPDATE)
DROP POLICY IF EXISTS "Admins can update SOTW" ON public.song_of_the_week;
CREATE POLICY "Admins can update SOTW" ON public.song_of_the_week
  FOR UPDATE
  TO authenticated
  USING ((select public.is_admin()));

-- song_of_the_week.Authenticated users can view SOTW (SELECT)
DROP POLICY IF EXISTS "Authenticated users can view SOTW" ON public.song_of_the_week;
CREATE POLICY "Authenticated users can view SOTW" ON public.song_of_the_week
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- song_requests.Students can create requests (INSERT)
DROP POLICY IF EXISTS "Students can create requests" ON public.song_requests;
CREATE POLICY "Students can create requests" ON public.song_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (((select public.current_profile_id()) = student_id));

-- song_requests.Students can read own requests (SELECT)
DROP POLICY IF EXISTS "Students can read own requests" ON public.song_requests;
CREATE POLICY "Students can read own requests" ON public.song_requests
  FOR SELECT
  TO authenticated
  USING (((select public.current_profile_id()) = student_id));

-- song_requests.Teachers can read all requests (SELECT)
DROP POLICY IF EXISTS "Teachers can read all requests" ON public.song_requests;
CREATE POLICY "Teachers can read all requests" ON public.song_requests
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin_or_teacher()));

-- song_requests.Teachers can update requests (UPDATE)
DROP POLICY IF EXISTS "Teachers can update requests" ON public.song_requests;
CREATE POLICY "Teachers can update requests" ON public.song_requests
  FOR UPDATE
  TO authenticated
  USING ((select public.is_admin_or_teacher()));

-- song_videos.song_videos_select_student (SELECT)
DROP POLICY IF EXISTS song_videos_select_student ON public.song_videos;
CREATE POLICY song_videos_select_student ON public.song_videos
  FOR SELECT
  TO authenticated
  USING (((select public.is_student()) AND ((EXISTS ( SELECT 1
   FROM student_repertoire sr
  WHERE ((sr.song_id = song_videos.song_id) AND (sr.student_id = (select public.current_profile_id()))))) OR (EXISTS ( SELECT 1
   FROM (lesson_songs ls
     JOIN lessons l ON ((l.id = ls.lesson_id)))
  WHERE ((ls.song_id = song_videos.song_id) AND (l.student_id = (select public.current_profile_id())) AND (l.deleted_at IS NULL)))))));

-- student_repertoire.sr_select_own (SELECT)
DROP POLICY IF EXISTS sr_select_own ON public.student_repertoire;
CREATE POLICY sr_select_own ON public.student_repertoire
  FOR SELECT
  TO authenticated
  USING ((student_id = (select public.current_profile_id())));

-- student_repertoire.sr_update_own_notes (UPDATE)
DROP POLICY IF EXISTS sr_update_own_notes ON public.student_repertoire;
CREATE POLICY sr_update_own_notes ON public.student_repertoire
  FOR UPDATE
  TO authenticated
  USING ((student_id = (select public.current_profile_id())))
  WITH CHECK ((student_id = (select public.current_profile_id())));

-- student_skills.Students can view their own skills (SELECT)
DROP POLICY IF EXISTS "Students can view their own skills" ON public.student_skills;
CREATE POLICY "Students can view their own skills" ON public.student_skills
  FOR SELECT
  TO authenticated
  USING ((student_id = (select public.current_profile_id())));

-- sync_conflicts.sync_conflicts_delete_own (DELETE)
DROP POLICY IF EXISTS sync_conflicts_delete_own ON public.sync_conflicts;
CREATE POLICY sync_conflicts_delete_own ON public.sync_conflicts
  FOR DELETE
  TO authenticated
  USING ((((status)::text = 'resolved'::text) AND (EXISTS ( SELECT 1
   FROM lessons
  WHERE ((lessons.id = sync_conflicts.lesson_id) AND (lessons.teacher_id = (select public.current_profile_id())))))));

-- sync_conflicts.sync_conflicts_select_own (SELECT)
DROP POLICY IF EXISTS sync_conflicts_select_own ON public.sync_conflicts;
CREATE POLICY sync_conflicts_select_own ON public.sync_conflicts
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM lessons
  WHERE ((lessons.id = sync_conflicts.lesson_id) AND (lessons.teacher_id = (select public.current_profile_id()))))));

-- sync_conflicts.sync_conflicts_update_own (UPDATE)
DROP POLICY IF EXISTS sync_conflicts_update_own ON public.sync_conflicts;
CREATE POLICY sync_conflicts_update_own ON public.sync_conflicts
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM lessons
  WHERE ((lessons.id = sync_conflicts.lesson_id) AND (lessons.teacher_id = (select public.current_profile_id()))))));

-- task_management.delete_task_management_user_or_admin (DELETE)
DROP POLICY IF EXISTS delete_task_management_user_or_admin ON public.task_management;
CREATE POLICY delete_task_management_user_or_admin ON public.task_management
  FOR DELETE
  TO authenticated
  USING (((select public.is_admin()) OR (profile_id = (select public.current_profile_id()))));

-- task_management.insert_task_management_user_or_admin (INSERT)
DROP POLICY IF EXISTS insert_task_management_user_or_admin ON public.task_management;
CREATE POLICY insert_task_management_user_or_admin ON public.task_management
  FOR INSERT
  TO authenticated
  WITH CHECK (((select public.is_admin()) OR (profile_id = (select public.current_profile_id()))));

-- task_management.select_task_management_user_or_admin (SELECT)
DROP POLICY IF EXISTS select_task_management_user_or_admin ON public.task_management;
CREATE POLICY select_task_management_user_or_admin ON public.task_management
  FOR SELECT
  TO authenticated
  USING (((select public.is_admin()) OR (profile_id = (select public.current_profile_id()))));

-- task_management.update_task_management_user_or_admin (UPDATE)
DROP POLICY IF EXISTS update_task_management_user_or_admin ON public.task_management;
CREATE POLICY update_task_management_user_or_admin ON public.task_management
  FOR UPDATE
  TO authenticated
  USING (((select public.is_admin()) OR (profile_id = (select public.current_profile_id()))));

-- theoretical_course_access.tca_delete (DELETE)
DROP POLICY IF EXISTS tca_delete ON public.theoretical_course_access;
CREATE POLICY tca_delete ON public.theoretical_course_access
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM theoretical_courses tc
  WHERE ((tc.id = theoretical_course_access.course_id) AND ((tc.created_by = (select public.current_profile_id())) OR (select public.is_admin()))))));

-- theoretical_course_access.tca_select_own (SELECT)
DROP POLICY IF EXISTS tca_select_own ON public.theoretical_course_access;
CREATE POLICY tca_select_own ON public.theoretical_course_access
  FOR SELECT
  TO authenticated
  USING ((profile_id = (select public.current_profile_id())));

-- theoretical_course_access.tca_select_teacher (SELECT)
DROP POLICY IF EXISTS tca_select_teacher ON public.theoretical_course_access;
CREATE POLICY tca_select_teacher ON public.theoretical_course_access
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM theoretical_courses tc
  WHERE ((tc.id = theoretical_course_access.course_id) AND (tc.created_by = (select public.current_profile_id()))))));

-- theoretical_courses.tc_delete (DELETE)
DROP POLICY IF EXISTS tc_delete ON public.theoretical_courses;
CREATE POLICY tc_delete ON public.theoretical_courses
  FOR DELETE
  TO authenticated
  USING (((created_by = (select public.current_profile_id())) OR (select public.is_admin())));

-- theoretical_courses.tc_select_student (SELECT)
DROP POLICY IF EXISTS tc_select_student ON public.theoretical_courses;
CREATE POLICY tc_select_student ON public.theoretical_courses
  FOR SELECT
  TO authenticated
  USING (((deleted_at IS NULL) AND (is_published = true) AND (select public.is_student()) AND (EXISTS ( SELECT 1
   FROM theoretical_course_access tca
  WHERE ((tca.course_id = theoretical_courses.id) AND (tca.profile_id = (select public.current_profile_id())))))));

-- theoretical_courses.tc_update (UPDATE)
DROP POLICY IF EXISTS tc_update ON public.theoretical_courses;
CREATE POLICY tc_update ON public.theoretical_courses
  FOR UPDATE
  TO authenticated
  USING (((created_by = (select public.current_profile_id())) OR (select public.is_admin())));

-- theoretical_lessons.tl_delete (DELETE)
DROP POLICY IF EXISTS tl_delete ON public.theoretical_lessons;
CREATE POLICY tl_delete ON public.theoretical_lessons
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM theoretical_courses tc
  WHERE ((tc.id = theoretical_lessons.course_id) AND ((tc.created_by = (select public.current_profile_id())) OR (select public.is_admin()))))));

-- theoretical_lessons.tl_select_student (SELECT)
DROP POLICY IF EXISTS tl_select_student ON public.theoretical_lessons;
CREATE POLICY tl_select_student ON public.theoretical_lessons
  FOR SELECT
  TO authenticated
  USING (((deleted_at IS NULL) AND (is_published = true) AND (select public.is_student()) AND (EXISTS ( SELECT 1
   FROM theoretical_course_access tca
  WHERE ((tca.course_id = theoretical_lessons.course_id) AND (tca.profile_id = (select public.current_profile_id())))))));

-- theoretical_lessons.tl_update (UPDATE)
DROP POLICY IF EXISTS tl_update ON public.theoretical_lessons;
CREATE POLICY tl_update ON public.theoretical_lessons
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM theoretical_courses tc
  WHERE ((tc.id = theoretical_lessons.course_id) AND ((tc.created_by = (select public.current_profile_id())) OR (select public.is_admin()))))));

-- user_preferences.Admins can read all preferences (SELECT)
DROP POLICY IF EXISTS "Admins can read all preferences" ON public.user_preferences;
CREATE POLICY "Admins can read all preferences" ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING ((select public.is_admin()));

-- user_preferences.Users can insert own preferences (INSERT)
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (((select public.current_profile_id()) = profile_id));

-- user_preferences.Users can read own preferences (SELECT)
DROP POLICY IF EXISTS "Users can read own preferences" ON public.user_preferences;
CREATE POLICY "Users can read own preferences" ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (((select public.current_profile_id()) = profile_id));

-- user_preferences.Users can update own preferences (UPDATE)
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (((select public.current_profile_id()) = profile_id))
  WITH CHECK (((select public.current_profile_id()) = profile_id));


-- ---- drive_files (hand-written: mixed value spaces) -------------------------
-- uploaded_by FKs auth.users (AUTH space — comparison kept on auth.uid());
-- entity_id for entity_type='profile' and the lesson/assignment/song joins
-- are profile-id space. Staff policies re-created only for InitPlan wrapping.
DROP POLICY IF EXISTS drive_files_insert_staff ON public.drive_files;
CREATE POLICY drive_files_insert_staff ON public.drive_files
  FOR INSERT TO authenticated
  WITH CHECK ((select public.is_admin_or_teacher()) AND uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS drive_files_select_staff ON public.drive_files;
CREATE POLICY drive_files_select_staff ON public.drive_files
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (select public.is_admin_or_teacher()));

DROP POLICY IF EXISTS drive_files_update_staff ON public.drive_files;
CREATE POLICY drive_files_update_staff ON public.drive_files
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (select public.is_admin_or_teacher()));

DROP POLICY IF EXISTS drive_files_delete_staff ON public.drive_files;
CREATE POLICY drive_files_delete_staff ON public.drive_files
  FOR DELETE TO authenticated
  USING ((select public.is_admin_or_teacher()));

DROP POLICY IF EXISTS drive_files_select_student ON public.drive_files;
CREATE POLICY drive_files_select_student ON public.drive_files
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (select public.is_student())
    AND (
      (visibility)::text = 'public'::text
      OR (
        (visibility)::text = 'students'::text
        AND (
          ((entity_type)::text = 'lesson'::text AND EXISTS (
            SELECT 1 FROM lessons
            WHERE lessons.id = drive_files.entity_id
              AND lessons.student_id = (select public.current_profile_id())
              AND lessons.deleted_at IS NULL))
          OR ((entity_type)::text = 'assignment'::text AND EXISTS (
            SELECT 1 FROM assignments
            WHERE assignments.id = drive_files.entity_id
              AND assignments.student_id = (select public.current_profile_id())))
          OR ((entity_type)::text = 'song'::text AND EXISTS (
            SELECT 1 FROM lesson_songs ls
            JOIN lessons l ON ls.lesson_id = l.id
            WHERE ls.song_id = drive_files.entity_id
              AND l.student_id = (select public.current_profile_id())
              AND l.deleted_at IS NULL))
          OR ((entity_type)::text = 'profile'::text
              AND entity_id = (select public.current_profile_id()))
        )
      )
    )
  );


-- ============================================================================
-- PART 3 — retire has_role(user_role)
-- ============================================================================
-- Its last two policy references were dropped in Part 1 and task_management
-- no longer consults user_roles. The active convention is profiles booleans
-- via is_admin()/is_teacher()/is_student()/is_admin_or_teacher(). If this
-- DROP ever fails on a dependency, a policy was missed — investigate, do not
-- force. (The unused rpc.hasRole wrapper in lib/api/unified-db.ts has no
-- callers; user_roles the table is left untouched — data cleanup is out of
-- scope here.)
DROP FUNCTION IF EXISTS public.has_role(public.user_role);
