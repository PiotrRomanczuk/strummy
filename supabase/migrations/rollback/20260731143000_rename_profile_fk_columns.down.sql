-- ROLLBACK for 20260731143000_rename_profile_fk_columns.sql
--
-- Reverses profile_id -> user_id and recipient_profile_id -> recipient_user_id
-- across all 14 tables, restores the constraint/index names, and restores the
-- ten function bodies to their pre-rename form.
--
-- This is NOT applied by the normal migration path. It exists so the production
-- cutover has a tested undo: if the deploy has to be reverted, run this and the
-- previous app build works again unchanged.
--
-- Order matters relative to the app: revert the Vercel deployment FIRST, then
-- run this. Running it while the new build is live breaks the app in the other
-- direction.
--
-- Idempotent, same as the forward migration.

begin;

-- 1. Columns back ------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('agent_execution_logs',      'profile_id',           'user_id'),
      ('ai_conversations',          'profile_id',           'user_id'),
      ('ai_generations',            'profile_id',           'user_id'),
      ('ai_usage_stats',            'profile_id',           'user_id'),
      ('in_app_notifications',      'profile_id',           'user_id'),
      ('notification_log',          'recipient_profile_id', 'recipient_user_id'),
      ('notification_preferences',  'profile_id',           'user_id'),
      ('notification_queue',        'recipient_profile_id', 'recipient_user_id'),
      ('system_logs',               'profile_id',           'user_id'),
      ('task_management',           'profile_id',           'user_id'),
      ('theoretical_course_access', 'profile_id',           'user_id'),
      ('user_history',              'profile_id',           'user_id'),
      ('user_preferences',          'profile_id',           'user_id'),
      ('user_roles',                'profile_id',           'user_id')
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
    end if;
  end loop;
end $$;

-- 2. Constraint names back ----------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('agent_execution_logs',      'agent_execution_logs_profile_id_fkey',         'agent_execution_logs_user_id_fkey'),
      ('ai_conversations',          'ai_conversations_profile_id_fkey',             'ai_conversations_user_id_fkey'),
      ('ai_generations',            'ai_generations_profile_id_fkey',               'ai_generations_user_id_fkey'),
      ('ai_usage_stats',            'ai_usage_stats_profile_id_fkey',               'ai_usage_stats_user_id_fkey'),
      ('in_app_notifications',      'in_app_notifications_profile_id_fkey',         'in_app_notifications_user_id_fkey'),
      ('notification_log',          'notification_log_recipient_profile_id_fkey',   'notification_log_recipient_user_id_fkey'),
      ('notification_preferences',  'notification_preferences_profile_id_fkey',     'notification_preferences_user_id_fkey'),
      ('notification_queue',        'notification_queue_recipient_profile_id_fkey', 'notification_queue_recipient_user_id_fkey'),
      ('system_logs',               'system_logs_profile_id_fkey',                  'system_logs_user_id_fkey'),
      ('task_management',           'task_management_profile_id_fkey',              'task_management_user_id_fkey'),
      ('theoretical_course_access', 'theoretical_course_access_profile_id_fkey',    'theoretical_course_access_user_id_fkey'),
      ('user_history',              'user_history_profile_id_fkey',                 'user_history_user_id_fkey'),
      ('user_preferences',          'user_preferences_profile_id_fkey',             'user_preferences_user_id_fkey'),
      ('user_roles',                'user_roles_profile_id_fkey',                   'user_roles_user_id_fkey')
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

-- 3. Index / unique-constraint names back -------------------------------------

do $$
declare
  r record;
  v_tbl text;
begin
  for r in
    select * from (values
      ('notification_preferences_profile_id_notification_type_key', 'notification_preferences_user_id_notification_type_key'),
      ('user_preferences_profile_id_key',                           'user_preferences_user_id_key'),
      ('idx_system_logs_profile_id',                                'idx_system_logs_user_id'),
      ('idx_user_history_profile_id',                               'idx_user_history_user_id'),
      ('ix_user_preferences_profile_id',                            'ix_user_preferences_user_id'),
      ('user_roles_profile_id_idx',                                 'user_roles_user_id_idx')
    ) as t(old_name, new_name)
  loop
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

-- 4. Function bodies back -----------------------------------------------------
-- Restored verbatim from the pre-migration production definitions.

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
    FOREACH notification_type_val IN ARRAY notification_types
    LOOP
        INSERT INTO notification_preferences (user_id, notification_type, enabled)
        VALUES (
            NEW.id,
            notification_type_val::notification_type,
            CASE
                WHEN notification_type_val IN ('weekly_progress_digest', 'teacher_daily_summary') THEN false
                ELSE true
            END
        )
        ON CONFLICT (user_id, notification_type) DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$function$;

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
    WHERE user_id = p_user_id
      AND notification_type = p_notification_type;

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
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'CANCELLED' THEN
        SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;

        v_lesson_date := to_char(NEW.scheduled_at, 'Day, Month DD, YYYY');
        v_lesson_time := to_char(NEW.scheduled_at, 'HH:MI AM');

        INSERT INTO in_app_notifications (
            user_id, notification_type, title, body, icon, variant,
            action_url, action_label, entity_type, entity_id, priority
        ) VALUES (
            NEW.student_id,
            'lesson_cancelled',
            'Lesson Cancelled',
            format('Your lesson on %s at %s has been cancelled', v_lesson_date, v_lesson_time),
            '❌', 'warning', '/dashboard/lessons', 'View Details', 'lesson', NEW.id::text, 9
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
    IF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at
       AND NEW.status != 'CANCELLED' THEN

        SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;

        v_new_date := to_char(NEW.scheduled_at, 'Day, Month DD, YYYY');
        v_new_time := to_char(NEW.scheduled_at, 'HH:MI AM');

        INSERT INTO in_app_notifications (
            user_id, notification_type, title, body, icon, variant,
            action_url, action_label, entity_type, entity_id, priority
        ) VALUES (
            NEW.student_id,
            'lesson_rescheduled',
            'Lesson Rescheduled',
            format('Your lesson has been moved to %s at %s', v_new_date, v_new_time),
            '🔄', 'info', '/dashboard/lessons', 'View New Time', 'lesson', NEW.id::text, 7
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
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'mastered' THEN

        SELECT student_id INTO v_student_id FROM lessons WHERE id = NEW.lesson_id;
        SELECT full_name INTO v_student_name FROM profiles WHERE id = v_student_id;
        SELECT title, artist INTO v_song_title, v_song_artist FROM songs WHERE id = NEW.song_id;

        SELECT COUNT(DISTINCT ls.song_id) INTO v_total_mastered
        FROM lesson_songs ls
        JOIN lessons l ON l.id = ls.lesson_id
        WHERE l.student_id = v_student_id
          AND ls.status = 'mastered';

        INSERT INTO in_app_notifications (
            user_id, notification_type, title, body, icon, variant,
            action_url, action_label, entity_type, entity_id, priority
        ) VALUES (
            v_student_id,
            'song_mastery_achievement',
            'Song Mastered!',
            format('You mastered "%s" by %s! 🎉 Total songs mastered: %s',
                   COALESCE(v_song_title, 'Unknown Song'),
                   COALESCE(v_song_artist, 'Unknown Artist'),
                   v_total_mastered),
            '🎸', 'success', '/dashboard/songs', 'View Progress', 'song_progress', NEW.id::text, 6
        );

        RAISE NOTICE 'Created in-app notification: song mastery for student %', v_student_id;
    END IF;

    RETURN NEW;
END;
$function$;

drop function if exists public.get_pending_notifications(integer);

create function public.get_pending_notifications(batch_size integer default 100)
 returns table(
   id uuid,
   notification_type notification_type,
   recipient_user_id uuid,
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
        nq.recipient_user_id,
        p.email,
        nq.template_data,
        nq.scheduled_for,
        nq.priority
    FROM notification_queue nq
    JOIN profiles p ON p.id = nq.recipient_user_id
    WHERE nq.status = 'pending'
      AND nq.scheduled_for <= now()
    ORDER BY nq.priority DESC, nq.scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED;
END;
$function$;

grant execute on function public.get_pending_notifications(integer)
  to public, anon, authenticated, service_role;

create or replace function public.get_user_email_count_last_hour(p_user_id uuid)
 returns integer
 language sql
 stable security definer
as $function$
  SELECT COUNT(*)::INTEGER FROM notification_log
  WHERE recipient_user_id = p_user_id
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
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'COMPLETED' THEN

        SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;
        SELECT full_name INTO v_teacher_name FROM profiles WHERE id = NEW.teacher_id;

        v_lesson_date := to_char(NEW.scheduled_at, 'Month DD, YYYY');
        v_lesson_title := COALESCE(NEW.title, 'Guitar Lesson');

        SELECT jsonb_agg(
            jsonb_build_object('title', s.title, 'artist', s.author, 'status', ls.status)
        ) INTO v_songs
        FROM lesson_songs ls
        JOIN songs s ON s.id = ls.song_id
        WHERE ls.lesson_id = NEW.id;

        v_template_data := jsonb_build_object(
            'studentName', COALESCE(v_student_name, 'Student'),
            'teacherName', COALESCE(v_teacher_name, 'Your Teacher'),
            'lessonDate', v_lesson_date,
            'lessonTitle', v_lesson_title,
            'songs', COALESCE(v_songs, '[]'::jsonb),
            'notes', COALESCE(NEW.notes, ''),
            'nextLessonDate', NULL
        );

        INSERT INTO notification_queue (
            notification_type, recipient_user_id, template_data,
            scheduled_for, priority, entity_type, entity_id
        ) VALUES (
            'lesson_recap', NEW.student_id, v_template_data,
            now() + interval '30 minutes', 5, 'lesson', NEW.id
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
    IF NEW.is_student = true AND NOT NEW.is_shadow THEN
        IF TG_OP = 'INSERT' THEN
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
                notification_type, recipient_user_id, template_data,
                scheduled_for, priority, entity_type, entity_id
            ) VALUES (
                'student_welcome', NEW.id, v_template_data, now(), 7, 'profile', NEW.id
            );

            RAISE NOTICE 'Queued welcome notification for new student %', NEW.id;

        ELSIF TG_OP = 'UPDATE' AND OLD.is_shadow = true AND NEW.is_shadow = false THEN
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
                notification_type, recipient_user_id, template_data,
                scheduled_for, priority, entity_type, entity_id
            ) VALUES (
                'student_welcome', NEW.id, v_template_data, now(), 7, 'profile', NEW.id
            );

            RAISE NOTICE 'Queued welcome notification for converted student %', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

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
    AND song_id IN (SELECT song_id FROM student_repertoire WHERE student_id = p_new_id);
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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings' AND table_schema = 'public') THEN
    DELETE FROM user_settings WHERE user_id = p_old_id
      AND EXISTS (SELECT 1 FROM user_settings WHERE user_id = p_new_id);
    UPDATE user_settings SET user_id = p_new_id WHERE user_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('user_settings', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences' AND table_schema = 'public') THEN
    DELETE FROM user_preferences WHERE user_id = p_old_id
      AND EXISTS (SELECT 1 FROM user_preferences WHERE user_id = p_new_id);
    UPDATE user_preferences SET user_id = p_new_id WHERE user_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('user_preferences', v_count);
  END IF;

  UPDATE in_app_notifications SET user_id = p_new_id WHERE user_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('in_app_notifications', v_count);

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences' AND table_schema = 'public') THEN
    DELETE FROM notification_preferences WHERE user_id = p_old_id
      AND notification_type IN (
        SELECT notification_type FROM notification_preferences WHERE user_id = p_new_id
      );
    UPDATE notification_preferences SET user_id = p_new_id WHERE user_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('notification_preferences', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_log' AND table_schema = 'public') THEN
    UPDATE notification_log SET recipient_user_id = p_new_id WHERE recipient_user_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('notification_log', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_queue' AND table_schema = 'public') THEN
    UPDATE notification_queue SET recipient_user_id = p_new_id WHERE recipient_user_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('notification_queue', v_count);
  END IF;

  UPDATE ai_generations SET user_id = p_new_id WHERE user_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('ai_generations', v_count);

  UPDATE ai_conversations SET user_id = p_new_id WHERE user_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('ai_conversations', v_count);

  UPDATE ai_usage_stats SET user_id = p_new_id WHERE user_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('ai_usage_stats', v_count);

  UPDATE agent_execution_logs SET user_id = p_new_id WHERE user_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('agent_execution_logs', v_count);

  DELETE FROM theoretical_course_access WHERE user_id = p_old_id
    AND course_id IN (SELECT course_id FROM theoretical_course_access WHERE user_id = p_new_id);
  UPDATE theoretical_course_access SET user_id = p_new_id WHERE user_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('theoretical_course_access_user', v_count);

  UPDATE theoretical_course_access SET granted_by = p_new_id WHERE granted_by = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('theoretical_course_access_granted_by', v_count);

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
    UPDATE system_logs SET user_id = p_new_id WHERE user_id = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('system_logs', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_history' AND table_schema = 'public') THEN
    UPDATE user_history SET changed_by = p_new_id WHERE changed_by = p_old_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('user_history', v_count);
  END IF;

  UPDATE profiles SET parent_id = p_new_id WHERE parent_id = p_old_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('profiles_parent', v_count);

  RETURN v_result;
END;
$function$;

commit;
