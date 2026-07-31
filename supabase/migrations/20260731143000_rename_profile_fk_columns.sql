-- Rename profiles-targeting FK columns: user_id -> profile_id
--
-- Why: `user_id` meant two different things in this schema. 13 tables used it
-- for auth.users.id; 14 used it for profiles.id. Those are different UUIDs, so
-- a join against the wrong one returns zero rows instead of erroring — the
-- failure looks like "user has no roles", not like a bug.
--
-- After this migration the rule is absolute:
--   user_id    -> auth.users.id
--   profile_id -> public.profiles.id
--
-- RLS policies and index *definitions* are stored as parse trees and follow a
-- RENAME COLUMN automatically — they need no edits here. plpgsql function
-- bodies are stored as TEXT and do NOT, which is why the six functions at the
-- bottom of this file are recreated. Missing one of them would fail silently at
-- runtime, not at migration time.
--
-- Idempotent: every step is guarded, so re-applying is a no-op.

begin;

-- 1. Columns ------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('agent_execution_logs',      'user_id',           'profile_id'),
      ('ai_conversations',          'user_id',           'profile_id'),
      ('ai_generations',            'user_id',           'profile_id'),
      ('ai_usage_stats',            'user_id',           'profile_id'),
      ('in_app_notifications',      'user_id',           'profile_id'),
      ('notification_log',          'recipient_user_id', 'recipient_profile_id'),
      ('notification_preferences',  'user_id',           'profile_id'),
      ('notification_queue',        'recipient_user_id', 'recipient_profile_id'),
      ('system_logs',               'user_id',           'profile_id'),
      ('task_management',           'user_id',           'profile_id'),
      ('theoretical_course_access', 'user_id',           'profile_id'),
      ('user_history',              'user_id',           'profile_id'),
      ('user_preferences',          'user_id',           'profile_id'),
      ('user_roles',                'user_id',           'profile_id')
    ) as t(tbl, old_col, new_col)
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = r.tbl and column_name = r.old_col
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = r.tbl and column_name = r.new_col
    ) then
      execute format('alter table public.%I rename column %I to %I', r.tbl, r.old_col, r.new_col);
      raise notice 'renamed %.% -> %', r.tbl, r.old_col, r.new_col;
    end if;
  end loop;
end $$;

-- 2. Foreign-key constraint names ---------------------------------------------
-- FK violation errors print the constraint name. Leaving `user_roles_user_id_fkey`
-- on a column called profile_id would reintroduce the ambiguity in exactly the
-- place someone reads when debugging.

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('agent_execution_logs',      'agent_execution_logs_user_id_fkey',           'agent_execution_logs_profile_id_fkey'),
      ('ai_conversations',          'ai_conversations_user_id_fkey',               'ai_conversations_profile_id_fkey'),
      ('ai_generations',            'ai_generations_user_id_fkey',                 'ai_generations_profile_id_fkey'),
      ('ai_usage_stats',            'ai_usage_stats_user_id_fkey',                 'ai_usage_stats_profile_id_fkey'),
      ('in_app_notifications',      'in_app_notifications_user_id_fkey',           'in_app_notifications_profile_id_fkey'),
      ('notification_log',          'notification_log_recipient_user_id_fkey',     'notification_log_recipient_profile_id_fkey'),
      ('notification_preferences',  'notification_preferences_user_id_fkey',       'notification_preferences_profile_id_fkey'),
      ('notification_queue',        'notification_queue_recipient_user_id_fkey',   'notification_queue_recipient_profile_id_fkey'),
      ('system_logs',               'system_logs_user_id_fkey',                    'system_logs_profile_id_fkey'),
      ('task_management',           'task_management_user_id_fkey',                'task_management_profile_id_fkey'),
      ('theoretical_course_access', 'theoretical_course_access_user_id_fkey',      'theoretical_course_access_profile_id_fkey'),
      ('user_history',              'user_history_user_id_fkey',                   'user_history_profile_id_fkey'),
      ('user_preferences',          'user_preferences_user_id_fkey',               'user_preferences_profile_id_fkey'),
      ('user_roles',                'user_roles_user_id_fkey',                     'user_roles_profile_id_fkey')
    ) as t(tbl, old_name, new_name)
  loop
    if exists (
      select 1 from pg_constraint where conname = r.old_name
        and conrelid = format('public.%I', r.tbl)::regclass
    ) and not exists (
      select 1 from pg_constraint where conname = r.new_name
        and conrelid = format('public.%I', r.tbl)::regclass
    ) then
      execute format('alter table public.%I rename constraint %I to %I', r.tbl, r.old_name, r.new_name);
    end if;
  end loop;
end $$;

-- 3. Index / unique-constraint names ------------------------------------------
-- Only the names that literally embed `user_id`. Names like `uq_course_access`
-- and `user_roles_unique` stay as they are — they never named the column.
-- Unique constraints must be renamed as constraints (that renames the backing
-- index); plain indexes are renamed directly.

do $$
declare
  r record;
  v_tbl text;
begin
  for r in
    select * from (values
      ('notification_preferences_user_id_notification_type_key', 'notification_preferences_profile_id_notification_type_key'),
      ('user_preferences_user_id_key',                           'user_preferences_profile_id_key'),
      ('idx_system_logs_user_id',                                'idx_system_logs_profile_id'),
      ('idx_user_history_user_id',                               'idx_user_history_profile_id'),
      ('ix_user_preferences_user_id',                            'ix_user_preferences_profile_id'),
      ('user_roles_user_id_idx',                                 'user_roles_profile_id_idx')
    ) as t(old_name, new_name)
  loop
    -- Already renamed (or never existed)? Skip.
    if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and c.relname = r.new_name) then
      continue;
    end if;

    select conrelid::regclass::text into v_tbl
    from pg_constraint where conname = r.old_name
      and connamespace = 'public'::regnamespace;

    if v_tbl is not null then
      execute format('alter table %s rename constraint %I to %I', v_tbl, r.old_name, r.new_name);
    elsif exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = r.old_name and c.relkind = 'i') then
      execute format('alter index public.%I rename to %I', r.old_name, r.new_name);
    end if;
  end loop;
end $$;

-- 4. plpgsql functions --------------------------------------------------------
-- Bodies are stored as text; the renames above did not touch them. Each of these
-- is reproduced verbatim from the live production definition with only the
-- renamed column references changed.

create or replace function public.initialize_notification_preferences()
 returns trigger
 language plpgsql
 security definer
as $function$
DECLARE
    notification_types TEXT[] := ARRAY[
        'lesson_reminder_24h',
        'lesson_recap',
        'lesson_cancelled',
        'lesson_rescheduled',
        'assignment_created',
        'assignment_due_reminder',
        'assignment_overdue_alert',
        'assignment_completed',
        'song_mastery_achievement',
        'milestone_reached',
        'student_welcome',
        'trial_ending_reminder',
        'teacher_daily_summary',
        'weekly_progress_digest',
        'calendar_conflict_alert',
        'webhook_expiration_notice',
        'admin_error_alert'
    ];
    notification_type_val TEXT;
BEGIN
    -- Create default preferences for all notification types
    FOREACH notification_type_val IN ARRAY notification_types
    LOOP
        INSERT INTO notification_preferences (profile_id, notification_type, enabled)
        VALUES (
            NEW.id,
            notification_type_val::notification_type,
            CASE
                -- Opt-in by default for most notifications
                WHEN notification_type_val IN ('weekly_progress_digest', 'teacher_daily_summary') THEN false
                ELSE true
            END
        )
        ON CONFLICT (profile_id, notification_type) DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$function$;

-- Parameter stays p_user_id: it is part of the RPC signature and renaming it
-- would break callers using named arguments. Only the column reference changes.
create or replace function public.is_notification_enabled(p_user_id uuid, p_notification_type notification_type)
 returns boolean
 language plpgsql
 security definer
as $function$
DECLARE
    preference_enabled BOOLEAN;
BEGIN
    SELECT enabled INTO preference_enabled
    FROM notification_preferences
    WHERE profile_id = p_user_id
      AND notification_type = p_notification_type;

    -- If no preference found, default to enabled
    RETURN COALESCE(preference_enabled, true);
END;
$function$;

create or replace function public.tr_notify_lesson_cancelled()
 returns trigger
 language plpgsql
 security definer
as $function$
DECLARE
    v_student_name TEXT;
    v_lesson_date TEXT;
    v_lesson_time TEXT;
BEGIN
    -- Only proceed if status changed to CANCELLED
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'CANCELLED' THEN
        -- Get student name
        SELECT full_name INTO v_student_name
        FROM profiles
        WHERE id = NEW.student_id;

        -- Format date and time
        v_lesson_date := to_char(NEW.scheduled_at, 'Day, Month DD, YYYY');
        v_lesson_time := to_char(NEW.scheduled_at, 'HH:MI AM');

        -- Create in-app notification (in-app only, no email)
        INSERT INTO in_app_notifications (
            profile_id,
            notification_type,
            title,
            body,
            icon,
            variant,
            action_url,
            action_label,
            entity_type,
            entity_id,
            priority
        ) VALUES (
            NEW.student_id,
            'lesson_cancelled',
            'Lesson Cancelled',
            format('Your lesson on %s at %s has been cancelled', v_lesson_date, v_lesson_time),
            '❌',
            'warning',
            '/dashboard/lessons',
            'View Details',
            'lesson',
            NEW.id::text,
            9
        );

        RAISE NOTICE 'Created in-app notification: lesson cancelled for student %', NEW.student_id;
    END IF;

    RETURN NEW;
END;
$function$;

create or replace function public.tr_notify_lesson_rescheduled()
 returns trigger
 language plpgsql
 security definer
as $function$
DECLARE
    v_student_name TEXT;
    v_new_date TEXT;
    v_new_time TEXT;
BEGIN
    -- Only proceed if scheduled_at changed (and not a cancellation)
    IF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at
       AND NEW.status != 'CANCELLED' THEN

        -- Get student name
        SELECT full_name INTO v_student_name
        FROM profiles
        WHERE id = NEW.student_id;

        -- Format new date/time
        v_new_date := to_char(NEW.scheduled_at, 'Day, Month DD, YYYY');
        v_new_time := to_char(NEW.scheduled_at, 'HH:MI AM');

        -- Create in-app notification (in-app only, no email)
        INSERT INTO in_app_notifications (
            profile_id,
            notification_type,
            title,
            body,
            icon,
            variant,
            action_url,
            action_label,
            entity_type,
            entity_id,
            priority
        ) VALUES (
            NEW.student_id,
            'lesson_rescheduled',
            'Lesson Rescheduled',
            format('Your lesson has been moved to %s at %s', v_new_date, v_new_time),
            '🔄',
            'info',
            '/dashboard/lessons',
            'View New Time',
            'lesson',
            NEW.id::text,
            7
        );

        RAISE NOTICE 'Created in-app notification: lesson rescheduled for student %', NEW.student_id;
    END IF;

    RETURN NEW;
END;
$function$;

create or replace function public.tr_notify_song_mastery()
 returns trigger
 language plpgsql
 security definer
as $function$
DECLARE
    v_student_id UUID;
    v_student_name TEXT;
    v_song_title TEXT;
    v_song_artist TEXT;
    v_total_mastered INT;
BEGIN
    -- Only proceed if status changed to 'mastered'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'mastered' THEN

        -- Get student ID from lesson
        SELECT student_id INTO v_student_id
        FROM lessons
        WHERE id = NEW.lesson_id;

        -- Get student name
        SELECT full_name INTO v_student_name
        FROM profiles
        WHERE id = v_student_id;

        -- Get song details
        SELECT title, artist INTO v_song_title, v_song_artist
        FROM songs
        WHERE id = NEW.song_id;

        -- Count total mastered songs for this student
        SELECT COUNT(DISTINCT ls.song_id) INTO v_total_mastered
        FROM lesson_songs ls
        JOIN lessons l ON l.id = ls.lesson_id
        WHERE l.student_id = v_student_id
          AND ls.status = 'mastered';

        -- Create in-app notification (in-app only, no email)
        INSERT INTO in_app_notifications (
            profile_id,
            notification_type,
            title,
            body,
            icon,
            variant,
            action_url,
            action_label,
            entity_type,
            entity_id,
            priority
        ) VALUES (
            v_student_id,
            'song_mastery_achievement',
            'Song Mastered!',
            format('You mastered "%s" by %s! 🎉 Total songs mastered: %s',
                   COALESCE(v_song_title, 'Unknown Song'),
                   COALESCE(v_song_artist, 'Unknown Artist'),
                   v_total_mastered),
            '🎸',
            'success',
            '/dashboard/songs',
            'View Progress',
            'song_progress',
            NEW.id::text,
            6
        );

        RAISE NOTICE 'Created in-app notification: song mastery for student %', v_student_id;
    END IF;

    RETURN NEW;
END;
$function$;

-- NOTE: this function's behaviour is unchanged — only renamed columns differ.
-- A pre-existing gap is left as-is deliberately (see PR): the user_history block
-- repoints `changed_by` but not `profile_id`, so merging a shadow profile leaves
-- user_history rows pointing at the old profile. Fixing that is a behaviour
-- change and belongs in its own PR, not in a rename.
create or replace function public.transfer_shadow_profile_references(p_old_id uuid, p_new_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_count INTEGER;
  v_result JSONB := '{}'::JSONB;
BEGIN
  IF p_old_id IS NULL OR p_new_id IS NULL THEN
    RAISE EXCEPTION 'Both old_id and new_id must be provided';
  END IF;

  IF p_old_id = p_new_id THEN
    RETURN v_result;
  END IF;

  -- STUDENT DATA --------------------------------------------------------------

  UPDATE lessons SET student_id = p_new_id WHERE student_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('lessons_student', v_count);

  UPDATE assignments SET student_id = p_new_id WHERE student_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('assignments_student', v_count);

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_skills' AND table_schema = 'public') THEN
    UPDATE student_skills SET student_id = p_new_id WHERE student_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('student_skills', v_count);
  END IF;

  DELETE FROM student_repertoire
  WHERE student_id = p_old_id
    AND song_id IN (
      SELECT song_id FROM student_repertoire WHERE student_id = p_new_id
    );
  UPDATE student_repertoire SET student_id = p_new_id WHERE student_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('student_repertoire', v_count);

  UPDATE practice_sessions SET student_id = p_new_id WHERE student_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('practice_sessions', v_count);

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_song_progress' AND table_schema = 'public') THEN
    UPDATE student_song_progress SET student_id = p_new_id WHERE student_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('student_song_progress', v_count);
  END IF;

  UPDATE song_requests SET student_id = p_new_id WHERE student_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('song_requests_student', v_count);

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chord_quiz_attempts' AND table_schema = 'public') THEN
    UPDATE chord_quiz_attempts SET student_id = p_new_id WHERE student_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('chord_quiz_attempts', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chord_srs' AND table_schema = 'public') THEN
    DELETE FROM chord_srs WHERE student_id = p_old_id
      AND chord_id IN (SELECT chord_id FROM chord_srs WHERE student_id = p_new_id);
    UPDATE chord_srs SET student_id = p_new_id WHERE student_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('chord_srs', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'song_status_history' AND table_schema = 'public') THEN
    UPDATE song_status_history SET student_id = p_new_id WHERE student_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('song_status_history', v_count);
  END IF;

  -- TEACHER / ADMIN DATA -----------------------------------------------------

  UPDATE lessons SET teacher_id = p_new_id WHERE teacher_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('lessons_teacher', v_count);

  UPDATE assignments SET teacher_id = p_new_id WHERE teacher_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('assignments_teacher', v_count);

  UPDATE assignment_templates SET teacher_id = p_new_id WHERE teacher_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('assignment_templates', v_count);

  UPDATE student_repertoire SET assigned_by = p_new_id WHERE assigned_by = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('repertoire_assigned_by', v_count);

  UPDATE song_requests SET reviewed_by = p_new_id WHERE reviewed_by = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('song_requests_reviewed_by', v_count);

  UPDATE song_of_the_week SET selected_by = p_new_id WHERE selected_by = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('song_of_the_week', v_count);

  UPDATE theoretical_courses SET created_by = p_new_id WHERE created_by = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('theoretical_courses', v_count);

  -- PROFILE-SCOPED DATA (profile_id unique-constrained, delete-first pattern) --

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings' AND table_schema = 'public') THEN
    DELETE FROM user_settings WHERE user_id = p_old_id
      AND EXISTS (SELECT 1 FROM user_settings WHERE user_id = p_new_id);
    UPDATE user_settings SET user_id = p_new_id WHERE user_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('user_settings', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences' AND table_schema = 'public') THEN
    DELETE FROM user_preferences WHERE profile_id = p_old_id
      AND EXISTS (SELECT 1 FROM user_preferences WHERE profile_id = p_new_id);
    UPDATE user_preferences SET profile_id = p_new_id WHERE profile_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('user_preferences', v_count);
  END IF;

  UPDATE in_app_notifications SET profile_id = p_new_id WHERE profile_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('in_app_notifications', v_count);

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences' AND table_schema = 'public') THEN
    DELETE FROM notification_preferences WHERE profile_id = p_old_id
      AND notification_type IN (
        SELECT notification_type FROM notification_preferences WHERE profile_id = p_new_id
      );
    UPDATE notification_preferences SET profile_id = p_new_id WHERE profile_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('notification_preferences', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_log' AND table_schema = 'public') THEN
    UPDATE notification_log SET recipient_profile_id = p_new_id WHERE recipient_profile_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('notification_log', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_queue' AND table_schema = 'public') THEN
    UPDATE notification_queue SET recipient_profile_id = p_new_id WHERE recipient_profile_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('notification_queue', v_count);
  END IF;

  UPDATE ai_generations SET profile_id = p_new_id WHERE profile_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('ai_generations', v_count);

  UPDATE ai_conversations SET profile_id = p_new_id WHERE profile_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('ai_conversations', v_count);

  UPDATE ai_usage_stats SET profile_id = p_new_id WHERE profile_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('ai_usage_stats', v_count);

  UPDATE agent_execution_logs SET profile_id = p_new_id WHERE profile_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('agent_execution_logs', v_count);

  DELETE FROM theoretical_course_access WHERE profile_id = p_old_id
    AND course_id IN (
      SELECT course_id FROM theoretical_course_access WHERE profile_id = p_new_id
    );
  UPDATE theoretical_course_access SET profile_id = p_new_id WHERE profile_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('theoretical_course_access_user', v_count);

  UPDATE theoretical_course_access SET granted_by = p_new_id WHERE granted_by = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('theoretical_course_access_granted_by', v_count);

  -- AUDIT / LOGGING ----------------------------------------------------------

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' AND table_schema = 'public') THEN
    UPDATE audit_log SET actor_id = p_new_id WHERE actor_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('audit_log', v_count);
  END IF;

  UPDATE spotify_matches SET reviewed_by = p_new_id WHERE reviewed_by = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('spotify_matches', v_count);

  UPDATE ai_prompt_templates SET created_by = p_new_id WHERE created_by = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('ai_prompt_templates', v_count);

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignment_history' AND table_schema = 'public') THEN
    UPDATE assignment_history SET changed_by = p_new_id WHERE changed_by = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('assignment_history', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_history' AND table_schema = 'public') THEN
    UPDATE lesson_history SET changed_by = p_new_id WHERE changed_by = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('lesson_history', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs' AND table_schema = 'public') THEN
    UPDATE system_logs SET profile_id = p_new_id WHERE profile_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('system_logs', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_history' AND table_schema = 'public') THEN
    UPDATE user_history SET changed_by = p_new_id WHERE changed_by = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('user_history', v_count);
  END IF;

  -- SELF-REFERENCING ---------------------------------------------------------

  UPDATE profiles SET parent_id = p_new_id WHERE parent_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('profiles_parent', v_count);

  RETURN v_result;
END;
$function$;

-- 4b. Functions touching notification_log / notification_queue ----------------
-- These four were missed on the first pass and caught by
-- divergent-identity.rls.test.ts, which failed with
--   column "recipient_user_id" of relation "notification_queue" does not exist
-- because a profile INSERT fires tr_notify_student_welcome. Exactly the silent
-- text-body breakage this file's header warns about.

-- Output column is part of the RPC contract that
-- lib/services/notification-queue-processor.ts destructures, so it has to be
-- renamed too — which CREATE OR REPLACE cannot do for a RETURNS TABLE column.
-- DROP + CREATE also drops the ACL, hence the explicit re-grants.
drop function if exists public.get_pending_notifications(integer);

create function public.get_pending_notifications(batch_size integer default 100)
 returns table(
   id uuid,
   notification_type notification_type,
   recipient_profile_id uuid,
   recipient_email text,
   template_data jsonb,
   scheduled_for timestamp with time zone,
   priority integer
 )
 language plpgsql
 security definer
as $function$
BEGIN
    RETURN QUERY
    SELECT
        nq.id,
        nq.notification_type,
        nq.recipient_profile_id,
        p.email,
        nq.template_data,
        nq.scheduled_for,
        nq.priority
    FROM notification_queue nq
    JOIN profiles p ON p.id = nq.recipient_profile_id
    WHERE nq.status = 'pending'
      AND nq.scheduled_for <= now()
    ORDER BY nq.priority DESC, nq.scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED;  -- Prevent concurrent processing
END;
$function$;

grant execute on function public.get_pending_notifications(integer)
  to public, anon, authenticated, service_role;

-- Parameter name p_user_id is part of the call signature; only the column moves.
create or replace function public.get_user_email_count_last_hour(p_user_id uuid)
 returns integer
 language sql
 stable security definer
as $function$
  SELECT COUNT(*)::INTEGER FROM notification_log
  WHERE recipient_profile_id = p_user_id
    AND status IN ('sent', 'pending')
    AND created_at > now() - interval '1 hour';
$function$;

create or replace function public.tr_notify_lesson_completed()
 returns trigger
 language plpgsql
 security definer
as $function$
DECLARE
    v_student_name TEXT;
    v_teacher_name TEXT;
    v_lesson_date TEXT;
    v_lesson_title TEXT;
    v_songs JSONB;
    v_template_data JSONB;
BEGIN
    -- Only proceed if status changed to COMPLETED
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'COMPLETED' THEN

        -- Get student and teacher names
        SELECT full_name INTO v_student_name
        FROM profiles
        WHERE id = NEW.student_id;

        SELECT full_name INTO v_teacher_name
        FROM profiles
        WHERE id = NEW.teacher_id;

        -- Format date
        v_lesson_date := to_char(NEW.scheduled_at, 'Month DD, YYYY');
        v_lesson_title := COALESCE(NEW.title, 'Guitar Lesson');

        -- Get songs worked on in this lesson (use s.author, not s.artist)
        SELECT jsonb_agg(
            jsonb_build_object(
                'title', s.title,
                'artist', s.author,
                'status', ls.status
            )
        ) INTO v_songs
        FROM lesson_songs ls
        JOIN songs s ON s.id = ls.song_id
        WHERE ls.lesson_id = NEW.id;

        -- Build template data (key is 'songs', not 'songsWorkedOn')
        v_template_data := jsonb_build_object(
            'studentName', COALESCE(v_student_name, 'Student'),
            'teacherName', COALESCE(v_teacher_name, 'Your Teacher'),
            'lessonDate', v_lesson_date,
            'lessonTitle', v_lesson_title,
            'songs', COALESCE(v_songs, '[]'::jsonb),
            'notes', COALESCE(NEW.notes, ''),
            'nextLessonDate', NULL
        );

        -- Queue notification for student
        -- Schedule for 30 minutes after completion (was 1 hour)
        INSERT INTO notification_queue (
            notification_type,
            recipient_profile_id,
            template_data,
            scheduled_for,
            priority,
            entity_type,
            entity_id
        ) VALUES (
            'lesson_recap',
            NEW.student_id,
            v_template_data,
            now() + interval '30 minutes',
            5, -- Normal priority
            'lesson',
            NEW.id
        );

        RAISE NOTICE 'Queued lesson recap notification (30min delay) for student %', NEW.student_id;
    END IF;

    RETURN NEW;
END;
$function$;

create or replace function public.tr_notify_student_welcome()
 returns trigger
 language plpgsql
 security definer
as $function$
DECLARE
    v_teacher_name TEXT;
    v_template_data JSONB;
    v_base_url TEXT;
BEGIN
    -- Only proceed if this is a new student with an auth account (not a shadow user)
    IF NEW.is_student = true AND NOT NEW.is_shadow THEN
        -- For INSERT: welcome new users
        IF TG_OP = 'INSERT' THEN
            -- Get teacher name (if student has lessons scheduled)
            SELECT p.full_name INTO v_teacher_name
            FROM profiles p
            JOIN lessons l ON l.teacher_id = p.id
            WHERE l.student_id = NEW.id
            LIMIT 1;

            v_base_url := COALESCE(current_setting('app.base_url', true), 'https://example.com');

            -- Build template data
            v_template_data := jsonb_build_object(
                'studentName', COALESCE(NEW.full_name, 'Student'),
                'teacherName', COALESCE(v_teacher_name, 'Your Teacher'),
                'loginLink', format('%s/dashboard', v_base_url),
                'firstLessonDate', NULL
            );

            -- Queue welcome notification
            INSERT INTO notification_queue (
                notification_type,
                recipient_profile_id,
                template_data,
                scheduled_for,
                priority,
                entity_type,
                entity_id
            ) VALUES (
                'student_welcome',
                NEW.id,
                v_template_data,
                now(), -- Send immediately
                7, -- High priority
                'profile',
                NEW.id
            );

            RAISE NOTICE 'Queued welcome notification for new student %', NEW.id;

        -- For UPDATE: welcome when shadow user converts to real user
        ELSIF TG_OP = 'UPDATE' AND OLD.is_shadow = true AND NEW.is_shadow = false THEN
            -- Get teacher name
            SELECT p.full_name INTO v_teacher_name
            FROM profiles p
            JOIN lessons l ON l.teacher_id = p.id
            WHERE l.student_id = NEW.id
            LIMIT 1;

            v_base_url := COALESCE(current_setting('app.base_url', true), 'https://example.com');

            v_template_data := jsonb_build_object(
                'studentName', COALESCE(NEW.full_name, 'Student'),
                'teacherName', COALESCE(v_teacher_name, 'Your Teacher'),
                'loginLink', format('%s/dashboard', v_base_url),
                'firstLessonDate', NULL
            );

            INSERT INTO notification_queue (
                notification_type,
                recipient_profile_id,
                template_data,
                scheduled_for,
                priority,
                entity_type,
                entity_id
            ) VALUES (
                'student_welcome',
                NEW.id,
                v_template_data,
                now(),
                7,
                'profile',
                NEW.id
            );

            RAISE NOTICE 'Queued welcome notification for converted student %', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- 5. Post-condition guard -----------------------------------------------------
-- Fail loudly if anything still points at profiles.id under a `user_id` name,
-- or if a function body still references a renamed column.

do $$
declare
  v_cols text;
  v_funcs text;
begin
  select string_agg(c.conrelid::regclass::text || '.' || a.attname, ', ')
    into v_cols
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  where c.contype = 'f'
    and c.confrelid = 'public.profiles'::regclass
    and a.attname like '%user_id%';

  if v_cols is not null then
    raise exception 'Columns still named user_id but referencing profiles.id: %', v_cols;
  end if;

  -- Deliberately coarse: flag ANY public function whose body mentions one of the
  -- 14 renamed tables together with a `user_id` token. The first version of this
  -- guard listed tables by hand, omitted notification_log/notification_queue,
  -- and let four functions through — including a profile-insert trigger that
  -- broke every signup. A guard narrower than the change it guards is decoration.
  --
  -- Two documented exemptions:
  --   is_notification_enabled(p_user_id …)          — parameter name, not a column
  --   transfer_shadow_profile_references            — guarded user_settings block
  --                                                   for a table that does not exist
  --   get_user_email_count_last_hour(p_user_id …)   — parameter name, not a column
  select string_agg(p.proname, ', ') into v_funcs
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'
    and l.lanname in ('plpgsql', 'sql')
    and p.prosrc ~ '(agent_execution_logs|ai_conversations|ai_generations|ai_usage_stats|in_app_notifications|notification_log|notification_preferences|notification_queue|system_logs|task_management|theoretical_course_access|user_history|user_preferences|user_roles)'
    and p.prosrc ~ '\muser_id\M'
    and p.proname not in (
      'is_notification_enabled',
      'transfer_shadow_profile_references',
      'get_user_email_count_last_hour'
    );

  if v_funcs is not null then
    raise exception 'Function bodies still reference a renamed column: %', v_funcs;
  end if;

  -- The RPC contract consumed by notification-queue-processor.ts.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_queue'
      and column_name = 'recipient_profile_id'
  ) then
    raise exception 'notification_queue.recipient_profile_id missing after rename';
  end if;
end $$;

commit;
