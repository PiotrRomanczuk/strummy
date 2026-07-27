-- Baseline: full public-schema snapshot (finding 3)
-- ============================================================================
-- Date: 2026-07-27. docs/analysis/2026-07-27-migrations-architecture-review.md
-- finding 3: the incremental chain (20260718090000+) assumed dozens of
-- baseline-era objects no migration created — a fresh `supabase db reset`
-- could not reproduce any real stack. This file is a pg_dump --schema-only
-- of the StudentDevelopment stack taken 2026-07-27 AFTER the identity-repair
-- migrations (through 20260727137000) were applied. The chain is idempotent,
-- so replaying it on top of this snapshot no-ops into the identical state.
--
-- FRESH DATABASES ONLY. Provisioned stacks (dev/prod) already contain every
-- object here — the Supabase CLI's schema_migrations tracking skips it there;
-- never hand-apply this file to a provisioned stack.
-- Prelude: pg_dump --schema=public omits CREATE EXTENSION statements.
-- ============================================================================
create extension if not exists citext;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public;  -- exists on every Supabase stack


--
-- Name: ai_context_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_context_type AS ENUM (
    'general',
    'student',
    'lesson',
    'song',
    'assignment',
    'practice'
);


--
-- Name: ai_generation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_generation_type AS ENUM (
    'lesson_notes',
    'assignment',
    'email_draft',
    'post_lesson_summary',
    'student_progress',
    'admin_insights',
    'chat'
);


--
-- Name: TYPE ai_generation_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.ai_generation_type IS 'Types of AI generation outputs';


--
-- Name: ai_message_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_message_role AS ENUM (
    'system',
    'user',
    'assistant'
);


--
-- Name: ai_prompt_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_prompt_category AS ENUM (
    'email',
    'lesson_notes',
    'practice_plan',
    'progress_report',
    'feedback',
    'reminder',
    'custom'
);


--
-- Name: assignment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assignment_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'overdue',
    'cancelled'
);


--
-- Name: TYPE assignment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.assignment_status IS 'Assignment workflow states';


--
-- Name: audit_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_action AS ENUM (
    'created',
    'updated',
    'deleted',
    'status_changed',
    'rescheduled',
    'cancelled',
    'completed',
    'role_changed'
);


--
-- Name: TYPE audit_action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.audit_action IS 'Types of actions tracked in audit log';


--
-- Name: audit_entity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_entity AS ENUM (
    'profile',
    'lesson',
    'assignment',
    'song',
    'song_progress'
);


--
-- Name: TYPE audit_entity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.audit_entity IS 'Entity types tracked in audit log';


--
-- Name: auth_email_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.auth_email_status AS ENUM (
    'not_applicable',
    'sent',
    'failed',
    'skipped'
);


--
-- Name: auth_event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.auth_event_type AS ENUM (
    'signup_attempted',
    'signup_succeeded',
    'signup_failed',
    'email_confirmed',
    'invite_sent',
    'invite_failed',
    'user_created_by_admin',
    'shadow_user_created',
    'signin_succeeded',
    'signin_failed',
    'signin_locked',
    'signin_rate_limited',
    'password_reset_requested',
    'password_reset_failed',
    'resend_verification_requested',
    'resend_verification_failed',
    'shadow_invite_email_set',
    'shadow_invite_sent',
    'shadow_link_completed',
    'shadow_link_failed'
);


--
-- Name: difficulty_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.difficulty_level AS ENUM (
    'beginner',
    'intermediate',
    'advanced'
);


--
-- Name: TYPE difficulty_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.difficulty_level IS 'Song difficulty classification';


--
-- Name: email_address; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.email_address AS text
	CONSTRAINT email_address_check CHECK ((VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text));


--
-- Name: DOMAIN email_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON DOMAIN public.email_address IS 'Email address with basic format validation';


--
-- Name: lesson_song_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lesson_song_status AS ENUM (
    'to_learn',
    'started',
    'remembered',
    'slow_tempo',
    'with_author',
    'mastered'
);


--
-- Name: lesson_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lesson_status AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: TYPE lesson_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.lesson_status IS 'Lesson workflow states';


--
-- Name: log_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.log_level AS ENUM (
    'debug',
    'info',
    'warn',
    'error'
);


--
-- Name: long_text; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.long_text AS character varying(50000);


--
-- Name: DOMAIN long_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON DOMAIN public.long_text IS 'Text limited to 50000 characters - for long content';


--
-- Name: medium_text; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.medium_text AS character varying(5000);


--
-- Name: DOMAIN medium_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON DOMAIN public.medium_text IS 'Text limited to 5000 characters - for descriptions, notes';


--
-- Name: music_key; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.music_key AS ENUM (
    'C',
    'C#',
    'Db',
    'D',
    'D#',
    'Eb',
    'E',
    'F',
    'F#',
    'Gb',
    'G',
    'G#',
    'Ab',
    'A',
    'A#',
    'Bb',
    'B',
    'Cm',
    'C#m',
    'Dm',
    'D#m',
    'Ebm',
    'Em',
    'Fm',
    'F#m',
    'Gm',
    'G#m',
    'Am',
    'A#m',
    'Bbm',
    'Bm'
);


--
-- Name: TYPE music_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.music_key IS 'Musical keys including major and minor variants';


--
-- Name: notification_delivery_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_delivery_channel AS ENUM (
    'email',
    'in_app',
    'both'
);


--
-- Name: TYPE notification_delivery_channel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.notification_delivery_channel IS 'Notification delivery channel: email (2 types), in_app (16 types), or both (future)';


--
-- Name: notification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_status AS ENUM (
    'pending',
    'sent',
    'failed',
    'bounced',
    'skipped',
    'cancelled'
);


--
-- Name: TYPE notification_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.notification_status IS 'Notification delivery status tracking';


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
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
);


--
-- Name: TYPE notification_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.notification_type IS 'All available email notification types';


--
-- Name: percentage; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.percentage AS integer
	CONSTRAINT percentage_check CHECK (((VALUE IS NULL) OR ((VALUE >= 0) AND (VALUE <= 100))));


--
-- Name: DOMAIN percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON DOMAIN public.percentage IS 'Integer between 0 and 100';


--
-- Name: positive_int; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.positive_int AS integer
	CONSTRAINT positive_int_check CHECK (((VALUE IS NULL) OR (VALUE > 0)));


--
-- Name: DOMAIN positive_int; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON DOMAIN public.positive_int IS 'Positive integer for counts and durations';


--
-- Name: short_text; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.short_text AS character varying(500);


--
-- Name: DOMAIN short_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON DOMAIN public.short_text IS 'Text limited to 500 characters - for titles, names';


--
-- Name: song_progress_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.song_progress_status AS ENUM (
    'to_learn',
    'started',
    'remembered',
    'with_author',
    'mastered'
);


--
-- Name: TYPE song_progress_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.song_progress_status IS 'Linear song learning progression (no backwards movement)';


--
-- Name: spotify_match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.spotify_match_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'auto_applied'
);


--
-- Name: student_pipeline_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.student_pipeline_status AS ENUM (
    'lead',
    'trial',
    'active',
    'inactive',
    'churned'
);


--
-- Name: TYPE student_pipeline_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.student_pipeline_status IS 'Student lifecycle stages';


--
-- Name: student_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.student_status AS ENUM (
    'active',
    'archived'
);


--
-- Name: task_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'PENDING_REVIEW',
    'COMPLETED',
    'CANCELLED',
    'BLOCKED'
);


--
-- Name: theoretical_course_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.theoretical_course_level AS ENUM (
    'beginner',
    'intermediate',
    'advanced'
);


--
-- Name: TYPE theoretical_course_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.theoretical_course_level IS 'Difficulty level for theoretical courses';


--
-- Name: url; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.url AS text
	CONSTRAINT url_check CHECK (((VALUE IS NULL) OR (VALUE ~* '^https?://'::text)));


--
-- Name: DOMAIN url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON DOMAIN public.url IS 'URL with http/https protocol validation';


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'teacher',
    'student'
);


--
-- Name: TYPE user_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.user_role IS 'Available user roles in the system';


--
-- Name: video_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.video_type AS ENUM (
    'tutorial',
    'short'
);


--
-- Name: archive_old_audit_partitions(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_old_audit_partitions(months_to_keep integer DEFAULT 12) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    cutoff_date DATE;
    partition_record RECORD;
BEGIN
    cutoff_date := date_trunc('month', now()) - (months_to_keep || ' months')::interval;

    FOR partition_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE 'audit_log_20%'
        AND tablename != 'audit_log_default'
        AND substring(tablename from 11 for 4)::int * 100 +
            substring(tablename from 16 for 2)::int <
            extract(year from cutoff_date)::int * 100 + extract(month from cutoff_date)::int
    LOOP
        -- Option 1: Detach partition (keeps data, removes from queries)
        -- EXECUTE format('ALTER TABLE audit_log DETACH PARTITION %I', partition_record.tablename);

        -- Option 2: Drop partition (deletes data)
        RAISE NOTICE 'Would archive partition: % (older than %)', partition_record.tablename, cutoff_date;
        -- EXECUTE format('DROP TABLE %I', partition_record.tablename);
    END LOOP;
END;
$$;


--
-- Name: FUNCTION archive_old_audit_partitions(months_to_keep integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.archive_old_audit_partitions(months_to_keep integer) IS 'Archives partitions older than specified months';


--
-- Name: audit_log_changes(public.audit_entity, uuid, public.audit_action, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_log_changes(p_entity_type public.audit_entity, p_entity_id uuid, p_action public.audit_action, p_changes jsonb, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes, metadata)
    VALUES (p_entity_type, p_entity_id, auth.uid(), p_action, p_changes, p_metadata)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;


--
-- Name: FUNCTION audit_log_changes(p_entity_type public.audit_entity, p_entity_id uuid, p_action public.audit_action, p_changes jsonb, p_metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.audit_log_changes(p_entity_type public.audit_entity, p_entity_id uuid, p_action public.audit_action, p_changes jsonb, p_metadata jsonb) IS 'Insert a record into the audit log';


--
-- Name: can_access_lesson(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_access_lesson(p_lesson_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson_id
      and (public.is_admin()
           or l.teacher_id = public.current_profile_id()
           or l.student_id = public.current_profile_id())
  );
$$;


--
-- Name: can_manage_lesson(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_manage_lesson(p_lesson_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson_id
      and (public.is_admin() or l.teacher_id = public.current_profile_id())
  );
$$;


--
-- Name: check_and_record_auth_rate_limit(text, text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_record_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Step 1: Insert the attempt first (atomic)
  INSERT INTO auth_rate_limits (identifier, operation, attempted_at)
  VALUES (p_identifier, p_operation, now());

  -- Step 2: Count all attempts in the window (including the one just inserted)
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM auth_rate_limits
  WHERE identifier = p_identifier
    AND operation = p_operation
    AND attempted_at > now() - (p_window_ms || ' milliseconds')::interval;

  RETURN v_count;
END;
$$;


--
-- Name: FUNCTION check_and_record_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_and_record_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint) IS 'Atomically record an auth attempt and return the count in the window. Prevents race conditions in rate limiting.';


--
-- Name: check_auth_rate_limit(text, text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COUNT(*)::INTEGER FROM auth_rate_limits
  WHERE identifier = p_identifier AND operation = p_operation
    AND attempted_at > now() - (p_window_ms || ' milliseconds')::interval;
$$;


--
-- Name: FUNCTION check_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint) IS 'Count auth attempts in a time window for rate limiting';


--
-- Name: cleanup_auth_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_auth_rate_limits() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    AS $$
  DELETE FROM auth_rate_limits WHERE attempted_at < now() - interval '2 hours';
$$;


--
-- Name: FUNCTION cleanup_auth_rate_limits(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_auth_rate_limits() IS 'Remove expired auth rate limit entries older than 2 hours';


--
-- Name: cleanup_old_in_app_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_in_app_notifications() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM in_app_notifications
  WHERE is_read = true AND expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % old read in-app notifications', deleted_count;
  RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_old_in_app_notifications(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_old_in_app_notifications() IS 'Delete read notifications past expiration (run daily via cron)';


--
-- Name: create_audit_log_partition(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_audit_log_partition(year integer, month integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := format('audit_log_%s_%s', year, lpad(month::text, 2, '0'));
    start_date := make_date(year, month, 1);
    end_date := start_date + interval '1 month';

    -- Only create if doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = partition_name AND schemaname = 'public'
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
END;
$$;


--
-- Name: FUNCTION create_audit_log_partition(year integer, month integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_audit_log_partition(year integer, month integer) IS 'Creates a monthly partition for audit_log';


--
-- Name: current_profile_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_profile_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select id from public.profiles where user_id = (select auth.uid());
$$;


--
-- Name: current_user_roles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_roles() RETURNS TABLE(is_admin boolean, is_teacher boolean, is_student boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT
        COALESCE(is_admin, false),
        COALESCE(is_teacher, false),
        COALESCE(is_student, false)
    FROM profiles
    WHERE id = auth.uid();
$$;


--
-- Name: FUNCTION current_user_roles(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.current_user_roles() IS 'Get all role flags for current user in single query';


--
-- Name: find_similar_songs(text, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_similar_songs(search_title text, threshold double precision DEFAULT 0.3, max_results integer DEFAULT 5) RETURNS TABLE(id uuid, title character varying, author character varying, similarity double precision)
    LANGUAGE sql STABLE
    AS $$
    SELECT s.id, s.title, s.author, similarity(s.title, search_title) AS similarity
    FROM songs s
    WHERE s.deleted_at IS NULL
      AND similarity(s.title, search_title) >= threshold
    ORDER BY similarity(s.title, search_title) DESC
    LIMIT max_results;
$$;


--
-- Name: FUNCTION find_similar_songs(search_title text, threshold double precision, max_results integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.find_similar_songs(search_title text, threshold double precision, max_results integer) IS 'Finds songs with similar titles using trigram matching for CSV import';


--
-- Name: fn_aggregate_practice_to_repertoire(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_aggregate_practice_to_repertoire() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Only aggregate when the session is linked to a specific song
    IF NEW.song_id IS NOT NULL THEN
        INSERT INTO public.student_repertoire (
            student_id, song_id,
            total_practice_minutes, practice_session_count, last_practiced_at
        )
        VALUES (
            NEW.student_id, NEW.song_id,
            NEW.duration_minutes, 1, NEW.created_at
        )
        ON CONFLICT (student_id, song_id) DO UPDATE SET
            total_practice_minutes =
                student_repertoire.total_practice_minutes + EXCLUDED.total_practice_minutes,
            practice_session_count = student_repertoire.practice_session_count + 1,
            last_practiced_at = GREATEST(
                COALESCE(student_repertoire.last_practiced_at, EXCLUDED.last_practiced_at),
                EXCLUDED.last_practiced_at
            );
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_aggregate_practice_to_repertoire(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_aggregate_practice_to_repertoire() IS 'AFTER INSERT trigger function: upserts practice metrics into student_repertoire. Since 2026-07-27 (finding 9) a session for a song not yet in the repertoire CREATES the row (status defaults to to_learn) instead of silently dropping the minutes.';


--
-- Name: fn_record_progress_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_record_progress_history() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    INSERT INTO song_status_history (
      student_id,
      song_id,
      previous_status,
      new_status,
      changed_at
    ) VALUES (
      NEW.student_id,
      NEW.song_id,
      OLD.current_status::text,
      NEW.current_status::text,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_sync_lesson_song_to_repertoire(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sync_lesson_song_to_repertoire() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_student_id     UUID;
    v_repertoire_id  UUID;
    v_current_status song_progress_status;
    v_new_status     song_progress_status;
    -- array_position is 1-indexed: to_learn=1, started=2, ..., mastered=5
    v_status_order   TEXT[] := ARRAY['to_learn','started','remembered','with_author','mastered'];
    v_new_idx        INT;
    v_cur_idx        INT;
BEGIN
    -- Cast lesson_song_status → song_progress_status (same values, different type names)
    v_new_status := NEW.status::TEXT::song_progress_status;

    -- Look up the student from the parent lesson
    SELECT student_id INTO v_student_id
    FROM lessons
    WHERE id = NEW.lesson_id;

    -- Nothing to sync if lesson has no student (shouldn't happen, but be safe)
    IF v_student_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Ensure a student_repertoire entry exists for this student+song pair
    INSERT INTO student_repertoire (student_id, song_id, current_status)
    VALUES (v_student_id, NEW.song_id, v_new_status)
    ON CONFLICT (student_id, song_id) DO NOTHING;

    -- Fetch the entry (either the one we just created or the pre-existing one)
    SELECT id, current_status
    INTO v_repertoire_id, v_current_status
    FROM student_repertoire
    WHERE student_id = v_student_id AND song_id = NEW.song_id;

    -- Link lesson_songs.repertoire_id if not already set
    IF NEW.repertoire_id IS NULL THEN
        NEW.repertoire_id := v_repertoire_id;
    END IF;

    -- -----------------------------------------------------------------------
    -- Forward-only status cascade
    -- -----------------------------------------------------------------------
    v_new_idx := array_position(v_status_order, NEW.status::TEXT);
    v_cur_idx  := array_position(v_status_order, v_current_status::TEXT);

    IF v_new_idx > v_cur_idx THEN
        UPDATE student_repertoire
        SET
            current_status = v_new_status,
            -- Set started_at the first time the student moves past 'to_learn'
            started_at = CASE
                WHEN v_cur_idx = 1 AND started_at IS NULL THEN now()
                ELSE started_at
            END,
            -- Set mastered_at the first time 'mastered' is reached
            mastered_at = CASE
                WHEN v_new_idx = 5 AND mastered_at IS NULL THEN now()
                ELSE mastered_at
            END
        WHERE id = v_repertoire_id;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_sync_lesson_song_to_repertoire(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_sync_lesson_song_to_repertoire() IS 'BEFORE trigger: syncs lesson_songs.status changes to student_repertoire. Auto-creates repertoire entry, links repertoire_id, advances status forward only.';


--
-- Name: get_bounce_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_bounce_stats() RETURNS TABLE(notification_type text, bounce_count bigint, total_sent bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    nl.notification_type::text,
    COUNT(*) FILTER (WHERE nl.status = 'bounced') AS bounce_count,
    COUNT(*) AS total_sent
  FROM notification_log nl
  WHERE nl.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY nl.notification_type
  HAVING COUNT(*) FILTER (WHERE nl.status = 'bounced') > 0
  ORDER BY COUNT(*) FILTER (WHERE nl.status = 'bounced') DESC;
END;
$$;


--
-- Name: FUNCTION get_bounce_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_bounce_stats() IS 'Returns bounce statistics by notification type for the last 7 days';


--
-- Name: get_pending_notifications(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_notifications(batch_size integer DEFAULT 100) RETURNS TABLE(id uuid, notification_type public.notification_type, recipient_user_id uuid, recipient_email text, template_data jsonb, scheduled_for timestamp with time zone, priority integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
    FOR UPDATE SKIP LOCKED;  -- Prevent concurrent processing
END;
$$;


--
-- Name: FUNCTION get_pending_notifications(batch_size integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_pending_notifications(batch_size integer) IS 'Get batch of pending notifications with entity info for deduplication';


--
-- Name: get_system_email_count_last_hour(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_system_email_count_last_hour() RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COUNT(*)::INTEGER FROM notification_log
  WHERE status IN ('sent', 'pending')
    AND created_at > now() - interval '1 hour';
$$;


--
-- Name: FUNCTION get_system_email_count_last_hour(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_system_email_count_last_hour() IS 'Count all emails sent in the last hour for system-wide rate limiting';


--
-- Name: get_user_email_count_last_hour(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_email_count_last_hour(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COUNT(*)::INTEGER FROM notification_log
  WHERE recipient_user_id = p_user_id
    AND status IN ('sent', 'pending')
    AND created_at > now() - interval '1 hour';
$$;


--
-- Name: FUNCTION get_user_email_count_last_hour(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_email_count_last_hour(p_user_id uuid) IS 'Count emails sent by a user in the last hour for rate limiting';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_first text := nullif(new.raw_user_meta_data ->> 'first_name', '');
  v_last  text := nullif(new.raw_user_meta_data ->> 'last_name', '');
  v_full  text := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
                           nullif(trim(concat_ws(' ',
                             nullif(new.raw_user_meta_data ->> 'first_name', ''),
                             nullif(new.raw_user_meta_data ->> 'last_name', ''))), ''));
begin
  -- (a) Claim the shadow profile invited under this email: link auth, swap the
  --     placeholder email for the real one, clear shadow markers. The profile
  --     id stays stable, so every FK (lessons, assignments, repertoire)
  --     survives untouched. Names: fill only where null — never clobber
  --     teacher-entered values. Newest shadow wins if several match.
  update public.profiles p
     set user_id      = new.id,
         email        = new.email,
         is_shadow    = false,
         invite_email = null,
         first_name   = coalesce(p.first_name, v_first),
         last_name    = coalesce(p.last_name, v_last),
         full_name    = coalesce(p.full_name, v_full)
   where p.id = (select s.id from public.profiles s
                  where s.invite_email = new.email
                    and s.is_shadow and s.user_id is null
                  order by s.created_at desc limit 1);
  if found then return new; end if;

  -- (b) Claim an unlinked profile that already carries this email directly
  --     (teacher-created row holding the real address). Same claim, minus the
  --     email assignment (it already matches; citext ignores case).
  update public.profiles p
     set user_id      = new.id,
         is_shadow    = false,
         invite_email = null,
         first_name   = coalesce(p.first_name, v_first),
         last_name    = coalesce(p.last_name, v_last),
         full_name    = coalesce(p.full_name, v_full)
   where p.email = new.email and p.user_id is null;
  if found then return new; end if;

  -- (c) Nothing to claim: mint a fresh profile (id defaults to
  --     gen_random_uuid — independent of new.id by design).
  begin
    insert into public.profiles (user_id, email, first_name, last_name, full_name)
    values (new.id, new.email, v_first, v_last, v_full)
    on conflict (user_id) do nothing;
  exception when unique_violation then
    -- Race: a claimable row with this email appeared between (b) and the
    -- insert. Retry the direct-email claim once; if still nothing, re-raise.
    update public.profiles p
       set user_id      = new.id,
           is_shadow    = false,
           invite_email = null,
           first_name   = coalesce(p.first_name, v_first),
           last_name    = coalesce(p.last_name, v_last),
           full_name    = coalesce(p.full_name, v_full)
     where p.email = new.email and p.user_id is null;
    if not found then raise; end if;
  end;
  return new;
end;
$$;


--
-- Name: FUNCTION handle_new_user(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.handle_new_user() IS 'On auth.users insert, creates or claims the profile. Shadow-claim branch (2026-07-19, IDA-6): inserts the new profiles row before delegating to transfer_shadow_profile_references(), then deletes the old shadow row -- insert-before-transfer-before-delete, never the reverse.';


--
-- Name: has_active_lesson_assignments(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_active_lesson_assignments(p_song_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM lesson_songs ls
        JOIN lessons l ON ls.lesson_id = l.id
        WHERE ls.song_id = p_song_id
        AND l.status IN ('SCHEDULED', 'IN_PROGRESS')
        AND l.deleted_at IS NULL
    );
END;
$$;


--
-- Name: FUNCTION has_active_lesson_assignments(p_song_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.has_active_lesson_assignments(p_song_id uuid) IS 'Check if song has active (scheduled/in-progress) lesson assignments';


--
-- Name: initialize_notification_preferences(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.initialize_notification_preferences() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
        INSERT INTO notification_preferences (user_id, notification_type, enabled)
        VALUES (
            NEW.id,
            notification_type_val::notification_type,
            CASE
                -- Opt-in by default for most notifications
                WHEN notification_type_val IN ('weekly_progress_digest', 'teacher_daily_summary') THEN false
                ELSE true
            END
        )
        ON CONFLICT (user_id, notification_type) DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;


--
-- Name: FUNCTION is_admin(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_admin() IS 'Check if current user has admin role';


--
-- Name: is_admin_or_teacher(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_or_teacher() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT COALESCE(
        (SELECT is_admin OR is_teacher FROM profiles WHERE id = auth.uid()),
        false
    );
$$;


--
-- Name: FUNCTION is_admin_or_teacher(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_admin_or_teacher() IS 'Check if current user is admin or teacher';


--
-- Name: is_child_of_parent(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_child_of_parent(_student_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
        SELECT EXISTS (
          SELECT 1 FROM profiles
          WHERE id = _student_id
            AND parent_id = public.current_profile_id()
        );
      $$;


--
-- Name: is_notification_enabled(uuid, public.notification_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_notification_enabled(p_user_id uuid, p_notification_type public.notification_type) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    preference_enabled BOOLEAN;
BEGIN
    SELECT enabled INTO preference_enabled
    FROM notification_preferences
    WHERE user_id = p_user_id
      AND notification_type = p_notification_type;

    -- If no preference found, default to enabled
    RETURN COALESCE(preference_enabled, true);
END;
$$;


--
-- Name: FUNCTION is_notification_enabled(p_user_id uuid, p_notification_type public.notification_type); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_notification_enabled(p_user_id uuid, p_notification_type public.notification_type) IS 'Check if user has enabled a specific notification type';


--
-- Name: is_parent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_parent() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_parent
        );
      $$;


--
-- Name: is_student(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_student() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_student FROM profiles WHERE id = auth.uid()),
    false
  );
$$;


--
-- Name: FUNCTION is_student(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_student() IS 'Check if current user has student role';


--
-- Name: is_teacher(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_teacher() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_teacher FROM profiles WHERE id = auth.uid()),
    false
  );
$$;


--
-- Name: FUNCTION is_teacher(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_teacher() IS 'Check if current user has teacher role';


--
-- Name: jsonb_diff(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jsonb_diff(left_val jsonb, right_val jsonb) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT COALESCE(
    jsonb_object_agg(key, value),
    '{}'::jsonb
  )
  FROM jsonb_each(left_val)
  WHERE right_val -> key IS DISTINCT FROM value;
$$;


--
-- Name: mark_overdue_assignments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_overdue_assignments() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE assignments
    SET status = 'overdue'
    WHERE deleted_at IS NULL
    AND status NOT IN ('completed', 'cancelled', 'overdue')
    AND due_date < now();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


--
-- Name: FUNCTION mark_overdue_assignments(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.mark_overdue_assignments() IS 'Mark assignments past due date as overdue (run via cron)';


--
-- Name: migrate_pending_student(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.migrate_pending_student(p_pending_id uuid, p_auth_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_pending RECORD;
BEGIN
    -- Get pending student record
    SELECT * INTO v_pending FROM pending_students WHERE id = p_pending_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Update the new profile with pending student data
    UPDATE profiles
    SET
        full_name = COALESCE(profiles.full_name, v_pending.full_name),
        phone = COALESCE(profiles.phone, v_pending.phone),
        notes = v_pending.notes,
        is_student = true
    WHERE id = p_auth_user_id;

    -- Delete the pending student record
    DELETE FROM pending_students WHERE id = p_pending_id;

    RETURN true;
END;
$$;


--
-- Name: FUNCTION migrate_pending_student(p_pending_id uuid, p_auth_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.migrate_pending_student(p_pending_id uuid, p_auth_user_id uuid) IS 'Migrate pending student data to real profile after signup';


--
-- Name: refresh_dashboard_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_dashboard_stats() RETURNS void
    LANGUAGE sql
    AS $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
$$;


--
-- Name: FUNCTION refresh_dashboard_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.refresh_dashboard_stats() IS 'Refresh dashboard stats materialized view (can run concurrently)';


--
-- Name: refresh_song_engagement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_song_engagement() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_song_engagement;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_song_popularity;
END;
$$;


--
-- Name: refresh_song_popularity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_song_popularity() RETURNS void
    LANGUAGE sql
    AS $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_song_popularity;
$$;


--
-- Name: FUNCTION refresh_song_popularity(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.refresh_song_popularity() IS 'Refresh song popularity materialized view (can run concurrently)';


--
-- Name: refresh_teacher_performance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_teacher_performance() RETURNS void
    LANGUAGE sql
    AS $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_teacher_performance;
$$;


--
-- Name: FUNCTION refresh_teacher_performance(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.refresh_teacher_performance() IS 'Refresh teacher performance materialized view (can run concurrently)';


--
-- Name: reverse_song_progress_from_practice(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reverse_song_progress_from_practice() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
      BEGIN
          IF OLD.song_id IS NOT NULL THEN
              UPDATE public.student_repertoire SET
                  total_practice_minutes = GREATEST(total_practice_minutes - OLD.duration_minutes, 0),
                  practice_session_count = GREATEST(practice_session_count - 1, 0),
                  last_practiced_at = (
                      SELECT MAX(ps.created_at) FROM public.practice_sessions ps
                      WHERE ps.student_id = OLD.student_id AND ps.song_id = OLD.song_id
                  )
              WHERE student_id = OLD.student_id AND song_id = OLD.song_id;
          END IF;
          RETURN OLD;
      END;
      $$;


--
-- Name: FUNCTION reverse_song_progress_from_practice(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reverse_song_progress_from_practice() IS 'AFTER DELETE trigger function: reverses practice metrics on student_repertoire when a same-day session is undone. Repointed 2026-07-18 (PRA-1) — the baseline version targeted the deprecated student_song_progress table with a column name (total_practice_minutes) that does not exist there, raising 42703 on any song-linked undo.';


--
-- Name: rls_staff_policy_hygiene_check(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_staff_policy_hygiene_check() RETURNS TABLE(tablename text, cmd text, bare_policy text, bare_clause text, scoped_sibling text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
  -- Two independent detection paths, unioned:
  --
  -- (1) A bare is_teacher()/is_admin_or_teacher() policy with no ownership
  --     reference, coexisting with a sibling that IS teacher-ownership-scoped
  --     for the same table+cmd. Catches the assignments/lessons/lesson_songs
  --     shape. `student_id = auth.uid()`-only siblings don't count here —
  --     that's a student's own-row check, a different caller population, not
  --     evidence teacher access should be scoped. Bare is_admin()-only isn't
  --     a trigger either: admin access is always meant to be unconditional.
  --
  -- (2) A "wide open" policy — satisfied by literally any row regardless of
  --     caller (bare `true`, or a `deleted_at IS NULL` branch OR'd with a role
  --     check rather than AND'd) — coexisting with ANY caller-specific
  --     sibling (teacher, student, or parent scoped) for the same table+cmd.
  --     Catches the exact `songs_select_active` shape
  --     (`(deleted_at IS NULL) OR is_admin()`), which doesn't require the
  --     caller to be staff at all on its first branch, so path (1) alone
  --     can't see it.
  WITH bare_teacher_policies AS (
    SELECT
      p.tablename::text,
      p.cmd::text,
      p.policyname::text,
      COALESCE(p.qual, p.with_check)::text AS clause
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND COALESCE(p.qual, p.with_check) ~* 'is_admin_or_teacher\(\)|is_teacher\(\)'
      AND COALESCE(p.qual, p.with_check) !~* 'teacher_id|current_profile_id|can_access_lesson|can_manage_lesson|teacher_teaches_student|created_by|is_child_of_parent'
  ),
  teacher_scoped_policies AS (
    SELECT
      p.tablename::text,
      p.cmd::text,
      p.policyname::text,
      COALESCE(p.qual, p.with_check)::text AS clause
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND COALESCE(p.qual, p.with_check) ~* 'teacher_id|current_profile_id|can_access_lesson|can_manage_lesson|teacher_teaches_student|created_by'
  ),
  wide_open_policies AS (
    SELECT
      p.tablename::text,
      p.cmd::text,
      p.policyname::text,
      COALESCE(p.qual, p.with_check)::text AS clause
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (
        trim(both from COALESCE(p.qual, p.with_check)) ~* '^true$'
        OR COALESCE(p.qual, p.with_check) ~* 'deleted_at\s+is\s+null\s*\)?\s*or\s+is_'
      )
  ),
  any_caller_scoped_policies AS (
    SELECT
      p.tablename::text,
      p.cmd::text,
      p.policyname::text,
      COALESCE(p.qual, p.with_check)::text AS clause
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND COALESCE(p.qual, p.with_check) ~* 'teacher_id|current_profile_id|can_access_lesson|can_manage_lesson|teacher_teaches_student|created_by|is_child_of_parent|student_id\s*=\s*auth\.uid|auth\.uid\(\)\s*=|=\s*auth\.uid\(\)'
  )
  SELECT a.tablename, a.cmd, a.policyname AS bare_policy, a.clause AS bare_clause, b.policyname AS scoped_sibling
  FROM bare_teacher_policies a
  JOIN teacher_scoped_policies b
    ON a.tablename = b.tablename AND a.cmd = b.cmd AND a.policyname <> b.policyname
  UNION
  SELECT a.tablename, a.cmd, a.policyname AS bare_policy, a.clause AS bare_clause, b.policyname AS scoped_sibling
  FROM wide_open_policies a
  JOIN any_caller_scoped_policies b
    ON a.tablename = b.tablename AND a.cmd = b.cmd AND a.policyname <> b.policyname
  ORDER BY 1, 2;
$_$;


--
-- Name: FUNCTION rls_staff_policy_hygiene_check(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rls_staff_policy_hygiene_check() IS 'Regression guard (2026-07-19): flags any table+operation where a bare admin/teacher-role RLS policy coexists with a properly ownership-scoped staff policy, silently defeating it (Postgres RLS OR''s permissive policies together). service_role only. See lib/testing/rls/__tests__/rls-policy-hygiene.rls.test.ts.';


--
-- Name: set_lesson_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_lesson_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Find the next lesson number for this teacher-student pair
    SELECT COALESCE(MAX(lesson_teacher_number), 0) + 1 INTO next_number
    FROM lessons
    WHERE teacher_id = NEW.teacher_id
    AND student_id = NEW.student_id;

    NEW.lesson_teacher_number := next_number;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION set_lesson_number(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.set_lesson_number() IS 'Auto-sets sequential lesson_teacher_number per teacher-student pair';


--
-- Name: set_lesson_numbers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_lesson_numbers() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Find the next lesson_teacher_number for this teacher-student pair
    SELECT COALESCE(MAX(lesson_teacher_number), 0) + 1 INTO next_number
    FROM lessons
    WHERE teacher_id = NEW.teacher_id AND student_id = NEW.student_id;

    -- Set the lesson_teacher_number for the new lesson
    NEW.lesson_teacher_number := next_number;

    RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION set_updated_at(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.set_updated_at() IS 'Generic trigger function to auto-update updated_at timestamp';


--
-- Name: soft_delete_song(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.soft_delete_song(p_song_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    song_record RECORD;
    lesson_count INTEGER;
BEGIN
    -- Check if song exists and is not already deleted
    SELECT * INTO song_record FROM songs WHERE id = p_song_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Song not found or already deleted');
    END IF;

    -- Check for active lesson assignments
    IF has_active_lesson_assignments(p_song_id) THEN
        RETURN json_build_object('success', false, 'error', 'Cannot delete song with active lesson assignments');
    END IF;

    -- Count related records
    SELECT COUNT(*) INTO lesson_count FROM lesson_songs WHERE song_id = p_song_id;

    -- Soft delete the song
    UPDATE songs SET deleted_at = now() WHERE id = p_song_id;

    -- Remove lesson song assignments (hard delete since they're junction records)
    DELETE FROM lesson_songs WHERE song_id = p_song_id;

    RETURN json_build_object(
        'success', true,
        'lesson_assignments_removed', lesson_count
    );
END;
$$;


--
-- Name: FUNCTION soft_delete_song(p_song_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.soft_delete_song(p_song_id uuid) IS 'Soft delete a song and remove its lesson assignments';


--
-- Name: soft_delete_song_with_cascade(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.soft_delete_song_with_cascade(song_uuid uuid, user_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    song_record RECORD;
    lesson_assignments_count INTEGER;
    repertoire_deactivated_count INTEGER;
    result JSON;
BEGIN
    -- Check if song exists and is not already deleted
    SELECT * INTO song_record FROM songs WHERE id = song_uuid AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Song not found or already deleted');
    END IF;

    -- Check for active lesson assignments
    IF has_active_lesson_assignments(song_uuid) THEN
        RETURN json_build_object('success', false, 'error', 'Cannot delete song with active lesson assignments');
    END IF;

    -- Count related records before deletion
    SELECT COUNT(*) INTO lesson_assignments_count FROM lesson_songs WHERE song_id = song_uuid;

    -- Soft delete the song
    UPDATE songs SET deleted_at = NOW() WHERE id = song_uuid;

    -- Cascade: Remove lesson song assignments (hard delete since they're junction records)
    DELETE FROM lesson_songs WHERE song_id = song_uuid;

    -- Cascade: Deactivate student repertoire entries for this song.
    -- Preserve the rows (progress/practice history) but hide them from active
    -- views, since a soft-deleted song must not surface as active repertoire.
    UPDATE student_repertoire
        SET is_active = false, updated_at = NOW()
        WHERE song_id = song_uuid AND is_active = true;
    GET DIAGNOSTICS repertoire_deactivated_count = ROW_COUNT;

    -- Return success with counts
    RETURN json_build_object(
        'success', true,
        'lesson_assignments_removed', lesson_assignments_count,
        'favorite_assignments_removed', repertoire_deactivated_count
    );
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    student_id uuid NOT NULL,
    lesson_id uuid,
    song_id uuid,
    title text,
    description text,
    status public.assignment_status DEFAULT 'not_started'::public.assignment_status NOT NULL,
    due_date date,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    checklist jsonb DEFAULT '[]'::jsonb NOT NULL,
    chord_drill jsonb,
    chord_drill_result jsonb,
    daily_target_minutes integer,
    submission_type text DEFAULT 'self_report'::text NOT NULL,
    CONSTRAINT assignments_checklist_is_array CHECK (((jsonb_typeof(checklist) = 'array'::text) AND (jsonb_array_length(checklist) <= 20))),
    CONSTRAINT assignments_chord_drill_result_shape CHECK (((chord_drill_result IS NULL) OR (jsonb_typeof(chord_drill_result) = 'object'::text))),
    CONSTRAINT assignments_chord_drill_shape CHECK (((chord_drill IS NULL) OR ((jsonb_typeof(chord_drill) = 'object'::text) AND (jsonb_typeof((chord_drill -> 'chord_ids'::text)) = 'array'::text) AND ((jsonb_array_length((chord_drill -> 'chord_ids'::text)) >= 1) AND (jsonb_array_length((chord_drill -> 'chord_ids'::text)) <= 30))))),
    CONSTRAINT assignments_daily_target_minutes_positive CHECK (((daily_target_minutes IS NULL) OR (daily_target_minutes > 0))),
    CONSTRAINT assignments_submission_type_check CHECK ((submission_type = ANY (ARRAY['self_report'::text, 'audio'::text, 'video'::text, 'note'::text])))
);


--
-- Name: TABLE assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.assignments IS 'Teacher-assigned work/practice for students in the Guitar CRM system';


--
-- Name: COLUMN assignments.lesson_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assignments.lesson_id IS 'Optional link to lesson this assignment came from';


--
-- Name: COLUMN assignments.song_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assignments.song_id IS 'Optional link to the song this assignment is about';


--
-- Name: COLUMN assignments.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assignments.deleted_at IS 'Soft delete timestamp (null = active)';


--
-- Name: COLUMN assignments.daily_target_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assignments.daily_target_minutes IS 'Optional daily practice target in minutes (5/10/15/20 in the UI); NULL = no target.';


--
-- Name: COLUMN assignments.submission_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assignments.submission_type IS 'Expected proof mode: self_report | audio | video | note. Selector only — actual media upload is a later wave.';


--
-- Name: student_complete_chord_drill(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_complete_chord_drill(p_assignment_id uuid, p_score integer, p_total integer) RETURNS public.assignments
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_assignment public.assignments;
BEGIN
  SELECT * INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_assignment.student_id IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'Not authorized to update this assignment' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_assignment.chord_drill IS NULL THEN
    RAISE EXCEPTION 'Assignment has no chord drill' USING ERRCODE = 'check_violation';
  END IF;

  -- A cancelled assignment is terminal; a drill run cannot revive it.
  IF v_assignment.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot complete a cancelled assignment' USING ERRCODE = 'check_violation';
  END IF;

  IF p_total <= 0 OR p_score < 0 OR p_score > p_total THEN
    RAISE EXCEPTION 'Invalid drill score % of %', p_score, p_total USING ERRCODE = 'check_violation';
  END IF;

  -- Running the drill IS the work, so it completes the assignment directly
  -- (a drill is atomic — no separate "start" step). The result is built
  -- server-side from the validated pair so the payload can carry nothing else.
  UPDATE public.assignments
  SET chord_drill_result = jsonb_build_object(
        'score', p_score,
        'total', p_total,
        'completed_at', now()
      ),
      status = 'completed',
      updated_at = now()
  WHERE id = p_assignment_id
  RETURNING * INTO v_assignment;

  RETURN v_assignment;
END;
$$;


--
-- Name: FUNCTION student_complete_chord_drill(p_assignment_id uuid, p_score integer, p_total integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.student_complete_chord_drill(p_assignment_id uuid, p_score integer, p_total integer) IS 'ASG-4: the only path a student has to record a chord-drill result. SECURITY DEFINER validates ownership + that the assignment is a drill, then writes only chord_drill_result (built from a validated score/total) and sets status=completed — RLS boundary per ADR-0001, mirroring student_update_assignment_status and student_toggle_checklist_item. Fixed 2026-07-27: ownership check now compares against public.current_profile_id() instead of auth.uid() (identity-model split, finding 1).';


--
-- Name: student_toggle_checklist_item(uuid, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_toggle_checklist_item(p_assignment_id uuid, p_item_id text, p_done boolean) RETURNS public.assignments
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_assignment public.assignments;
  v_found boolean;
BEGIN
  SELECT * INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_assignment.student_id IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'Not authorized to update this assignment' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- The item must already exist; students cannot add items.
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_assignment.checklist) e
    WHERE e->>'id' = p_item_id
  ) INTO v_found;

  IF NOT v_found THEN
    RAISE EXCEPTION 'Checklist item not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Rebuild the array flipping ONLY the matching item's `done` flag. Text,
  -- ordering, and membership are preserved verbatim, so a student can never
  -- rewrite content through this path.
  UPDATE public.assignments
  SET checklist = (
        SELECT jsonb_agg(
          CASE WHEN e->>'id' = p_item_id
            THEN jsonb_set(e, '{done}', to_jsonb(p_done))
            ELSE e
          END
          ORDER BY ord
        )
        FROM jsonb_array_elements(checklist) WITH ORDINALITY AS t(e, ord)
      ),
      updated_at = now()
  WHERE id = p_assignment_id
  RETURNING * INTO v_assignment;

  RETURN v_assignment;
END;
$$;


--
-- Name: FUNCTION student_toggle_checklist_item(p_assignment_id uuid, p_item_id text, p_done boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.student_toggle_checklist_item(p_assignment_id uuid, p_item_id text, p_done boolean) IS 'The only path a student has to mutate a checklist: flips one existing item''s done flag by id. Cannot add/remove/reorder items or edit text — RLS boundary per ADR-0001, mirroring student_update_assignment_status. Fixed 2026-07-27: ownership check now compares against public.current_profile_id() instead of auth.uid() (identity-model split, finding 1).';


--
-- Name: student_update_assignment_status(uuid, public.assignment_status); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_update_assignment_status(p_assignment_id uuid, p_new_status public.assignment_status) RETURNS public.assignments
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_assignment public.assignments;
  v_allowed boolean;
BEGIN
  SELECT * INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_assignment.student_id IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'Not authorized to update this assignment' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Students may only ever target these two states (mirrors STUDENT_TARGETS
  -- in app/actions/assignment-status.ts).
  IF p_new_status NOT IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION 'Students can only start or complete an assignment' USING ERRCODE = 'check_violation';
  END IF;

  -- No-op transition is always allowed (mirrors validateStatusTransition).
  IF v_assignment.status = p_new_status THEN
    RETURN v_assignment;
  END IF;

  -- Mirrors VALID_STATUS_TRANSITIONS in schemas/AssignmentSchema.ts.
  v_allowed := CASE v_assignment.status
    WHEN 'not_started' THEN p_new_status IN ('in_progress', 'cancelled')
    WHEN 'in_progress' THEN p_new_status IN ('completed', 'cancelled')
    WHEN 'overdue' THEN p_new_status IN ('in_progress', 'completed', 'cancelled')
    ELSE false -- completed / cancelled are terminal
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_assignment.status, p_new_status
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.assignments
  SET status = p_new_status, updated_at = now()
  WHERE id = p_assignment_id
  RETURNING * INTO v_assignment;

  RETURN v_assignment;
END;
$$;


--
-- Name: FUNCTION student_update_assignment_status(p_assignment_id uuid, p_new_status public.assignment_status); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.student_update_assignment_status(p_assignment_id uuid, p_new_status public.assignment_status) IS 'ASG-3: the only path a student has to mutate assignments. SECURITY DEFINER validates ownership + the status transition state machine in SQL, then writes only the status column — RLS no longer trusts app code to scope which columns a student-submitted UPDATE touches. Fixed 2026-07-27: ownership check now compares against public.current_profile_id() instead of auth.uid() — student_id is a profiles.id, not an auth.users.id (identity-model split, finding 1).';


--
-- Name: sync_song_video_published_flag(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_song_video_published_flag() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  target_video_id uuid;
  any_published_tiktok    boolean;
  any_published_instagram boolean;
  any_published_youtube   boolean;
BEGIN
  target_video_id := COALESCE(NEW.song_video_id, OLD.song_video_id);
  IF target_video_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    bool_or(platform = 'tiktok'         AND status = 'published'),
    bool_or(platform = 'instagram'      AND status = 'published'),
    bool_or(platform = 'youtube_shorts' AND status = 'published')
  INTO any_published_tiktok, any_published_instagram, any_published_youtube
  FROM content_posts
  WHERE song_video_id = target_video_id;

  UPDATE song_videos
  SET
    published_to_tiktok          = COALESCE(any_published_tiktok, false),
    published_to_instagram       = COALESCE(any_published_instagram, false),
    published_to_youtube_shorts  = COALESCE(any_published_youtube, false)
  WHERE id = target_video_id;

  RETURN NEW;
END;
$$;


--
-- Name: teacher_teaches_student(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.teacher_teaches_student(_teacher_id uuid, _student_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM lessons
    WHERE teacher_id = _teacher_id
      AND student_id = _student_id
      AND deleted_at IS NULL
  );
$$;


--
-- Name: tr_assignment_history_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_assignment_history_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.assignment_history (assignment_id, changed_by, change_type, new_data)
    VALUES (NEW.id, public.current_profile_id(), 'created', jsonb_build_object('status', NEW.status));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.assignment_history (
      assignment_id, changed_by, change_type, previous_data, new_data
    )
    VALUES (
      NEW.id,
      public.current_profile_id(),
      'status_changed',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION tr_assignment_history_status(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tr_assignment_history_status() IS 'Logs assignment creation and status transitions to assignment_history (ASG-2). Fixed 2026-07-27: records public.current_profile_id() (a profiles.id) as changed_by instead of auth.uid() (identity-model split, finding 1).';


--
-- Name: tr_audit_assignments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_audit_assignments() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'status_changed';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('assignment', OLD.id, auth.uid(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('assignment', NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$;


--
-- Name: tr_audit_lessons(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_audit_lessons() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'CANCELLED' THEN
                v_action := 'cancelled';
            ELSIF NEW.status = 'COMPLETED' THEN
                v_action := 'completed';
            ELSIF NEW.status = 'RESCHEDULED' THEN
                v_action := 'rescheduled';
            ELSE
                v_action := 'status_changed';
            END IF;
        ELSIF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at THEN
            v_action := 'rescheduled';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('lesson', OLD.id, auth.uid(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('lesson', NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$;


--
-- Name: tr_audit_profiles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_audit_profiles() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin) OR
           (OLD.is_teacher IS DISTINCT FROM NEW.is_teacher) OR
           (OLD.is_student IS DISTINCT FROM NEW.is_student) THEN
            v_action := 'role_changed';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('profile', OLD.id, auth.uid(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('profile', NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$;


--
-- Name: tr_audit_song_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_audit_song_progress() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'status_changed';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('song_progress', NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$;


--
-- Name: tr_notify_lesson_cancelled(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_notify_lesson_cancelled() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
            user_id,
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
$$;


--
-- Name: FUNCTION tr_notify_lesson_cancelled(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tr_notify_lesson_cancelled() IS 'Create in-app notification when lesson is cancelled (in-app only, no email)';


--
-- Name: tr_notify_lesson_completed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_notify_lesson_completed() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
            recipient_user_id,
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
$$;


--
-- Name: FUNCTION tr_notify_lesson_completed(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tr_notify_lesson_completed() IS 'Queue lesson recap 30min after completion (deduplicates with manual sends)';


--
-- Name: tr_notify_lesson_rescheduled(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_notify_lesson_rescheduled() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
            user_id,
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
$$;


--
-- Name: FUNCTION tr_notify_lesson_rescheduled(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tr_notify_lesson_rescheduled() IS 'Create in-app notification when lesson time changes (in-app only, no email)';


--
-- Name: tr_notify_song_mastery(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_notify_song_mastery() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
            user_id,
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
$$;


--
-- Name: FUNCTION tr_notify_song_mastery(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tr_notify_song_mastery() IS 'Create in-app notification when student masters a song (in-app only, no email)';


--
-- Name: tr_notify_student_welcome(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_notify_student_welcome() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
                recipient_user_id,
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
                recipient_user_id,
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
$$;


--
-- Name: FUNCTION tr_notify_student_welcome(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tr_notify_student_welcome() IS 'Automatically queue welcome notification for new students with accounts';


--
-- Name: tr_update_song_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tr_update_song_progress() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM update_song_progress_from_practice(NEW.id);
    RETURN NEW;
END;
$$;


--
-- Name: track_lesson_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_lesson_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    change_type_value TEXT;
    previous_data_value JSONB;
    new_data_value JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        change_type_value := 'created';
        previous_data_value := NULL;
        new_data_value := to_jsonb(NEW);

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'cancelled'  THEN change_type_value := 'cancelled';
            ELSIF NEW.status = 'completed' THEN change_type_value := 'completed';
            ELSE change_type_value := 'status_changed';
            END IF;
        ELSIF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at THEN
            change_type_value := 'rescheduled';
        ELSE
            change_type_value := 'updated';
        END IF;
        previous_data_value := to_jsonb(OLD);
        new_data_value := to_jsonb(NEW);

    ELSIF TG_OP = 'DELETE' THEN
        -- AFTER DELETE: the lesson row is already gone so the FK on
        -- lesson_history.lesson_id would fail. Best-effort: log and continue.
        BEGIN
            INSERT INTO lesson_history (lesson_id, changed_by, change_type, previous_data, new_data, changed_at)
            VALUES (OLD.id, COALESCE(auth.uid(), OLD.teacher_id), 'deleted', to_jsonb(OLD), to_jsonb(OLD), now());
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'track_lesson_changes DELETE audit skipped for lesson %: %', OLD.id, SQLERRM;
        END;
        RETURN OLD;
    END IF;

    INSERT INTO lesson_history (lesson_id, changed_by, change_type, previous_data, new_data, changed_at)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.teacher_id), change_type_value, previous_data_value, new_data_value, now());

    RETURN NEW;
END;
$$;


--
-- Name: transfer_shadow_profile_references(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_shadow_profile_references(p_old_id uuid, p_new_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

  -- USER DATA (user_id unique-constrained, delete-first pattern) -------------

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
    AND course_id IN (
      SELECT course_id FROM theoretical_course_access WHERE user_id = p_new_id
    );
  UPDATE theoretical_course_access SET user_id = p_new_id WHERE user_id = p_old_id;
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
    UPDATE system_logs SET user_id = p_new_id WHERE user_id = p_old_id;
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
$$;


--
-- Name: FUNCTION transfer_shadow_profile_references(p_old_id uuid, p_new_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.transfer_shadow_profile_references(p_old_id uuid, p_new_id uuid) IS 'Transfers all FK references from one profile ID to another. Used during shadow user linking (both the handle_new_user trigger and the admin link-shadow-user route). Returns JSONB with row counts per table. Extended 2026-07-19 (IDA-8) with chord_quiz_attempts, chord_srs, song_status_history, and the changed_by/user_id audit columns on assignment_history/lesson_history/system_logs/user_history; restricted to service_role (IDA-7).';


--
-- Name: update_notification_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notification_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_song_progress_from_practice(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_song_progress_from_practice(p_session_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session FROM practice_sessions WHERE id = p_session_id;

    IF v_session.song_id IS NOT NULL THEN
        INSERT INTO student_song_progress (student_id, song_id)
        VALUES (v_session.student_id, v_session.song_id)
        ON CONFLICT (student_id, song_id) DO NOTHING;

        UPDATE student_song_progress
        SET
            total_practice_minutes = total_practice_minutes + v_session.duration_minutes,
            practice_session_count = practice_session_count + 1,
            last_practiced_at = v_session.created_at,
            started_at = COALESCE(started_at, v_session.created_at)
        WHERE student_id = v_session.student_id
        AND song_id = v_session.song_id;
    END IF;
END;
$$;


--
-- Name: FUNCTION update_song_progress_from_practice(p_session_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_song_progress_from_practice(p_session_id uuid) IS 'Update song progress metrics after practice session';


--
-- Name: update_song_requests_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_song_requests_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_sync_conflicts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_sync_conflicts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_user_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: agent_execution_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_execution_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id character varying(255) NOT NULL,
    request_id character varying(255) NOT NULL,
    user_id uuid,
    successful boolean NOT NULL,
    execution_time integer NOT NULL,
    input_hash character varying(64) NOT NULL,
    error_code character varying(100),
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE agent_execution_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_execution_logs IS 'Tracks AI agent execution for monitoring and analytics';


--
-- Name: COLUMN agent_execution_logs.execution_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_execution_logs.execution_time IS 'Execution time in milliseconds';


--
-- Name: COLUMN agent_execution_logs.input_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_execution_logs.input_hash IS 'Hash of input data for deduplication analysis';


--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255),
    model_id character varying(255) NOT NULL,
    context_type public.ai_context_type DEFAULT 'general'::public.ai_context_type NOT NULL,
    context_id uuid,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ai_conversations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_conversations IS 'Chat sessions between users and AI assistant';


--
-- Name: COLUMN ai_conversations.context_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_conversations.context_type IS 'Type of entity this conversation relates to';


--
-- Name: COLUMN ai_conversations.context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_conversations.context_id IS 'UUID of the related entity';


--
-- Name: ai_generations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_generations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    generation_type public.ai_generation_type NOT NULL,
    agent_id character varying(255),
    model_id character varying(255),
    provider character varying(100),
    input_params jsonb NOT NULL,
    output_content text NOT NULL,
    is_successful boolean DEFAULT true NOT NULL,
    error_message text,
    context_entity_type character varying(50),
    context_entity_id uuid,
    is_starred boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ai_generations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_generations IS 'Stores structured AI generation outputs with input params, model info, and status';


--
-- Name: COLUMN ai_generations.agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_generations.agent_id IS 'Agent ID used for the generation (null for direct provider calls)';


--
-- Name: COLUMN ai_generations.input_params; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_generations.input_params IS 'JSON object of input parameters passed to the generation';


--
-- Name: COLUMN ai_generations.output_content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_generations.output_content IS 'Full text output of the generation';


--
-- Name: COLUMN ai_generations.context_entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_generations.context_entity_type IS 'Type of related entity (student, lesson, etc.)';


--
-- Name: COLUMN ai_generations.context_entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_generations.context_entity_id IS 'UUID of the related entity';


--
-- Name: COLUMN ai_generations.is_starred; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_generations.is_starred IS 'User-starred for quick access';


--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role public.ai_message_role NOT NULL,
    content text NOT NULL,
    model_id character varying(255),
    tokens_used integer,
    latency_ms integer,
    is_helpful boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ai_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_messages IS 'Individual messages within AI conversations';


--
-- Name: COLUMN ai_messages.tokens_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_messages.tokens_used IS 'Number of tokens consumed';


--
-- Name: COLUMN ai_messages.latency_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_messages.latency_ms IS 'Response generation time in milliseconds';


--
-- Name: COLUMN ai_messages.is_helpful; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_messages.is_helpful IS 'User feedback: true=helpful, false=not helpful, null=no feedback';


--
-- Name: ai_prompt_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_prompt_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description public.medium_text,
    category public.ai_prompt_category DEFAULT 'custom'::public.ai_prompt_category NOT NULL,
    prompt_template text NOT NULL,
    variables jsonb,
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ai_prompt_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_prompt_templates IS 'Reusable prompt templates for common AI tasks';


--
-- Name: COLUMN ai_prompt_templates.prompt_template; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_prompt_templates.prompt_template IS 'Template text with {{placeholder}} variables';


--
-- Name: COLUMN ai_prompt_templates.variables; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_prompt_templates.variables IS 'JSON array of expected variable names';


--
-- Name: COLUMN ai_prompt_templates.is_system; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_prompt_templates.is_system IS 'System-provided template (not deletable by users)';


--
-- Name: ai_usage_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    model_id character varying(255) NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    total_latency_ms integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ai_usage_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_usage_stats IS 'Daily aggregated AI usage for analytics and rate limiting';


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    key_hash character varying(64) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone
);


--
-- Name: TABLE api_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.api_keys IS 'Bearer token API keys for external API authentication';


--
-- Name: COLUMN api_keys.key_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.api_keys.key_hash IS 'SHA-256 hash of the API key (actual key never stored)';


--
-- Name: COLUMN api_keys.last_used_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.api_keys.last_used_at IS 'Last successful authentication with this key';


--
-- Name: COLUMN api_keys.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.api_keys.expires_at IS 'When this key expires. NULL means no expiration.';


--
-- Name: apple_shortcut_song_import_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.apple_shortcut_song_import_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    spotify_url text,
    spotify_track_id text,
    song_title text,
    song_artist text,
    song_id uuid,
    status text NOT NULL,
    error_message text,
    http_status integer,
    source text DEFAULT 'shortcut'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT apple_shortcut_song_import_log_source_check CHECK ((source = ANY (ARRAY['shortcut'::text, 'api'::text, 'debug-page'::text]))),
    CONSTRAINT apple_shortcut_song_import_log_status_check CHECK ((status = ANY (ARRAY['success'::text, 'duplicate'::text, 'error'::text])))
);


--
-- Name: assignment_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    changed_by uuid,
    change_type text NOT NULL,
    previous_data jsonb,
    new_data jsonb NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assignment_history_change_type_check CHECK ((change_type = ANY (ARRAY['created'::text, 'status_changed'::text])))
);


--
-- Name: TABLE assignment_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.assignment_history IS 'Status-change timeline for assignments (ASG-2). Populated only by
   tr_assignment_history_status; not a general-purpose audit log.';


--
-- Name: COLUMN assignment_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assignment_history.changed_by IS 'Holds a public.profiles(id) value (the actor who triggered the change), written by tr_assignment_history_status() via current_profile_id(). Write-only column (no app reader today) — nullable, intentionally no FK. Fixed 2026-07-27: previously stored auth.uid() (identity-model split, finding 1).';


--
-- Name: assignment_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(500) NOT NULL,
    description public.medium_text,
    teacher_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    checklist jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT assignment_templates_checklist_is_array CHECK (((jsonb_typeof(checklist) = 'array'::text) AND (jsonb_array_length(checklist) <= 20)))
);


--
-- Name: TABLE assignment_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.assignment_templates IS 'Reusable assignment templates owned by teachers';


--
-- Name: COLUMN assignment_templates.teacher_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assignment_templates.teacher_id IS 'Teacher who owns this template';


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (created_at);


--
-- Name: TABLE audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_log IS 'Unified audit log for entity changes, partitioned by month. Restored 2026-06-19 (legacy design; live audit data lives in *_history tables).';


--
-- Name: COLUMN audit_log.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.entity_type IS 'Type of entity changed: profile, lesson, assignment, song, song_progress';


--
-- Name: COLUMN audit_log.entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.entity_id IS 'UUID of the entity that was changed';


--
-- Name: COLUMN audit_log.actor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.actor_id IS 'User who made the change (null for system changes)';


--
-- Name: COLUMN audit_log.action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.action IS 'Type of action: created, updated, deleted, status_changed, etc.';


--
-- Name: COLUMN audit_log.changes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.changes IS 'JSON delta of changed fields (not full record)';


--
-- Name: COLUMN audit_log.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.metadata IS 'Additional context (source, IP, etc.)';


--
-- Name: audit_log_2026_01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_01 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_02 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_03 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_04 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_05 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_06 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_07; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_07 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_08; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_08 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_09 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_10 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_11 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_2026_12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_2026_12 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_default (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.audit_entity NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    changes jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type public.auth_event_type NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    user_email text,
    user_id uuid,
    actor_id uuid,
    ip_address text,
    success boolean NOT NULL,
    error_message text,
    email_status public.auth_email_status DEFAULT 'not_applicable'::public.auth_email_status NOT NULL,
    email_error text,
    metadata jsonb
);


--
-- Name: auth_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    operation text NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE auth_rate_limits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auth_rate_limits IS 'Tracks auth operation attempts for rate limiting';


--
-- Name: chord_quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chord_quiz_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    chord_id text NOT NULL,
    selected_answer text NOT NULL,
    is_correct boolean NOT NULL,
    response_time_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chord_quiz_attempts_response_time_ms_check CHECK (((response_time_ms IS NULL) OR (response_time_ms >= 0)))
);


--
-- Name: chord_srs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chord_srs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    chord_id text NOT NULL,
    repetitions smallint DEFAULT 0 NOT NULL,
    interval_days real DEFAULT 1 NOT NULL,
    ease_factor real DEFAULT 2.5 NOT NULL,
    next_review_at timestamp with time zone DEFAULT now() NOT NULL,
    last_reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_post_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_post_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    views_count integer DEFAULT 0 NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL,
    shares_count integer DEFAULT 0 NOT NULL,
    saves_count integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE content_post_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.content_post_metrics IS 'Time-series snapshots of content_posts engagement metrics';


--
-- Name: content_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    song_id uuid NOT NULL,
    song_video_id uuid,
    platform text NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    scheduled_at timestamp with time zone,
    published_at timestamp with time zone,
    hook text,
    caption text,
    hashtag_set_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    extra_hashtags text[] DEFAULT ARRAY[]::text[] NOT NULL,
    stories jsonb DEFAULT '{}'::jsonb NOT NULL,
    external_url text,
    external_post_id text,
    views_count integer DEFAULT 0 NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL,
    shares_count integer DEFAULT 0 NOT NULL,
    saves_count integer DEFAULT 0 NOT NULL,
    engagement_rate numeric(5,2),
    metrics_updated_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT content_posts_platform_check CHECK ((platform = ANY (ARRAY['tiktok'::text, 'instagram'::text, 'youtube_shorts'::text]))),
    CONSTRAINT content_posts_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'scheduled'::text, 'published'::text, 'archived'::text, 'failed'::text])))
);


--
-- Name: TABLE content_posts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.content_posts IS 'Per-platform distribution slot for a song video — calendar, caption, metrics';


--
-- Name: COLUMN content_posts.hashtag_set_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.content_posts.hashtag_set_ids IS 'FK array into hashtag_sets — combined per post';


--
-- Name: COLUMN content_posts.stories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.content_posts.stories IS 'JSONB { morning?, afternoon?, evening? } — story copy for the day';


--
-- Name: drive_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drive_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploaded_by uuid,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    google_drive_file_id text NOT NULL,
    google_drive_folder_id text,
    file_type character varying(50) NOT NULL,
    filename text NOT NULL,
    title text,
    description text,
    mime_type text NOT NULL,
    file_size_bytes bigint,
    metadata jsonb DEFAULT '{}'::jsonb,
    visibility character varying(20) DEFAULT 'private'::character varying NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT drive_files_entity_type_check CHECK (((entity_type)::text = ANY (ARRAY[('song'::character varying)::text, ('lesson'::character varying)::text, ('assignment'::character varying)::text, ('profile'::character varying)::text]))),
    CONSTRAINT drive_files_file_type_check CHECK (((file_type)::text = ANY (ARRAY[('audio'::character varying)::text, ('pdf'::character varying)::text, ('video'::character varying)::text, ('document'::character varying)::text, ('image'::character varying)::text]))),
    CONSTRAINT drive_files_visibility_check CHECK (((visibility)::text = ANY (ARRAY[('private'::character varying)::text, ('students'::character varying)::text, ('public'::character varying)::text])))
);


--
-- Name: TABLE drive_files; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.drive_files IS 'Unified storage for all Google Drive files (audio, PDF, video, document, image) attached to lessons, songs, assignments, or profiles';


--
-- Name: COLUMN drive_files.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.drive_files.entity_type IS 'Type of entity the file is attached to: song, lesson, assignment, profile';


--
-- Name: COLUMN drive_files.entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.drive_files.entity_id IS 'UUID of the entity (not a foreign key to allow polymorphic relationships)';


--
-- Name: COLUMN drive_files.google_drive_file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.drive_files.google_drive_file_id IS 'Unique identifier in Google Drive';


--
-- Name: COLUMN drive_files.file_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.drive_files.file_type IS 'Type of file: audio, pdf, video, document, image';


--
-- Name: COLUMN drive_files.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.drive_files.metadata IS 'Type-specific metadata stored as JSONB (duration, page_count, thumbnail_url, etc.)';


--
-- Name: COLUMN drive_files.visibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.drive_files.visibility IS 'Who can view the file: private (staff only), students (enrolled students), public (anyone)';


--
-- Name: COLUMN drive_files.display_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.drive_files.display_order IS 'Order in which files are displayed in UI (lower = first)';


--
-- Name: COLUMN drive_files.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.drive_files.deleted_at IS 'Soft delete timestamp';


--
-- Name: hashtag_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hashtag_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    hashtags text[] DEFAULT ARRAY[]::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE hashtag_sets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hashtag_sets IS 'Reusable hashtag bundles (e.g. core, specific, trending) for content posts';


--
-- Name: in_app_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.in_app_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notification_type public.notification_type NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    icon text,
    variant text DEFAULT 'default'::text,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    action_url text,
    action_label text,
    entity_type text,
    entity_id text,
    priority integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    CONSTRAINT ck_in_app_notifications_priority_range CHECK (((priority >= 1) AND (priority <= 10)))
);


--
-- Name: TABLE in_app_notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.in_app_notifications IS 'In-app notifications shown in notification bell and center';


--
-- Name: COLUMN in_app_notifications.variant; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.in_app_notifications.variant IS 'Visual variant: default, success, warning, error, info';


--
-- Name: COLUMN in_app_notifications.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.in_app_notifications.entity_type IS 'Polymorphic reference: lesson, assignment, song, etc.';


--
-- Name: COLUMN in_app_notifications.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.in_app_notifications.expires_at IS 'Auto-cleanup after 30 days for read notifications';


--
-- Name: CONSTRAINT ck_in_app_notifications_priority_range ON in_app_notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT ck_in_app_notifications_priority_range ON public.in_app_notifications IS 'Enforce priority range: 1 (lowest) to 10 (highest)';


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    student_id uuid NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    title text,
    notes text,
    status public.lesson_status DEFAULT 'SCHEDULED'::public.lesson_status NOT NULL,
    lesson_teacher_number integer,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    google_event_id text,
    duration_minutes integer,
    format text,
    CONSTRAINT lessons_duration_minutes_check CHECK (((duration_minutes IS NULL) OR ((duration_minutes >= 15) AND (duration_minutes <= 180)))),
    CONSTRAINT lessons_format_check CHECK (((format IS NULL) OR (format = ANY (ARRAY['in_person'::text, 'video'::text]))))
);


--
-- Name: TABLE lessons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lessons IS 'Guitar lessons between teachers and students';


--
-- Name: COLUMN lessons.lesson_teacher_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.lesson_teacher_number IS 'Sequential lesson number per teacher-student pair (auto-set by trigger)';


--
-- Name: COLUMN lessons.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lessons.deleted_at IS 'Soft delete timestamp (null = active)';


--
-- Name: lesson_counts_per_student; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lesson_counts_per_student AS
 SELECT student_id,
    count(*) AS total_lessons
   FROM public.lessons
  GROUP BY student_id;


--
-- Name: lesson_counts_per_teacher; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lesson_counts_per_teacher AS
 SELECT teacher_id,
    count(*) AS total_lessons
   FROM public.lessons
  GROUP BY teacher_id;


--
-- Name: lesson_songs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_songs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    song_id uuid NOT NULL,
    status public.lesson_song_status DEFAULT 'to_learn'::public.lesson_song_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    repertoire_id uuid
);


--
-- Name: TABLE lesson_songs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lesson_songs IS 'Junction table linking songs to lessons with progress tracking';


--
-- Name: COLUMN lesson_songs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lesson_songs.status IS 'Learning status: to_learn -> started -> remembered -> with_author -> mastered';


--
-- Name: COLUMN lesson_songs.repertoire_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lesson_songs.repertoire_id IS 'Links to student_repertoire entry for this student+song pair';


--
-- Name: songs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.songs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    author text,
    level public.difficulty_level,
    key public.music_key,
    chords text,
    short_title text,
    ultimate_guitar_link text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    capo_fret integer,
    strumming_pattern text,
    tempo integer,
    time_signature integer,
    duration_ms integer,
    release_year integer,
    category text,
    youtube_url text,
    spotify_link_url text,
    tiktok_short_url text,
    cover_image_url text,
    gallery_images text[],
    audio_files jsonb DEFAULT '{}'::jsonb,
    is_draft boolean DEFAULT false NOT NULL,
    notes text,
    lyrics_with_chords text,
    recording_queued_at timestamp with time zone,
    recorded_at timestamp with time zone,
    search_vector tsvector GENERATED ALWAYS AS ((setweight(to_tsvector('simple'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, COALESCE(author, ''::text)), 'B'::"char"))) STORED,
    priority_bucket text,
    CONSTRAINT songs_capo_fret_check CHECK (((capo_fret >= 0) AND (capo_fret <= 20))),
    CONSTRAINT songs_duration_ms_check CHECK ((duration_ms > 0)),
    CONSTRAINT songs_priority_bucket_check CHECK ((priority_bucket = ANY (ARRAY['done'::text, 'may'::text, 'june'::text, 'later'::text, 'backlog'::text]))),
    CONSTRAINT songs_release_year_check CHECK (((release_year >= 1900) AND (release_year <= 2100))),
    CONSTRAINT songs_tempo_check CHECK (((tempo >= 20) AND (tempo <= 300))),
    CONSTRAINT songs_time_signature_check CHECK (((time_signature >= 1) AND (time_signature <= 16)))
);


--
-- Name: TABLE songs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.songs IS 'Song library with music attributes and external links';


--
-- Name: COLUMN songs.short_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.short_title IS 'Optional abbreviated title for display in compact views';


--
-- Name: COLUMN songs.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.deleted_at IS 'Soft delete timestamp (null = active)';


--
-- Name: COLUMN songs.capo_fret; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.capo_fret IS 'Capo position (0-20), null means no capo';


--
-- Name: COLUMN songs.strumming_pattern; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.strumming_pattern IS 'Strumming pattern description (e.g., D-DU-UDU)';


--
-- Name: COLUMN songs.tempo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.tempo IS 'Song tempo in BPM';


--
-- Name: COLUMN songs.time_signature; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.time_signature IS 'Time signature numerator (e.g., 4 for 4/4)';


--
-- Name: COLUMN songs.duration_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.duration_ms IS 'Song duration in milliseconds';


--
-- Name: COLUMN songs.release_year; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.release_year IS 'Year the song was released';


--
-- Name: COLUMN songs.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.category IS 'Song category or genre';


--
-- Name: COLUMN songs.spotify_link_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.spotify_link_url IS 'Spotify track URL';


--
-- Name: COLUMN songs.cover_image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.cover_image_url IS 'URL to song cover image';


--
-- Name: COLUMN songs.audio_files; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.audio_files IS 'JSONB object mapping audio type to URL';


--
-- Name: COLUMN songs.is_draft; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.is_draft IS 'True if song is saved as draft (incomplete). Drafts are not visible to students and can be completed later by teachers.';


--
-- Name: COLUMN songs.recording_queued_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.recording_queued_at IS 'When this song was added to the recording queue. NULL = not queued.';


--
-- Name: COLUMN songs.recorded_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.recorded_at IS 'When this song was marked as recorded. NULL = not recorded yet.';


--
-- Name: COLUMN songs.search_vector; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.search_vector IS 'Generated tsvector for full-text search';


--
-- Name: COLUMN songs.priority_bucket; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.songs.priority_bucket IS 'Content-plan grouping (done/may/june/later/backlog)';


--
-- Name: student_repertoire; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_repertoire (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    song_id uuid NOT NULL,
    preferred_key public.music_key,
    capo_fret smallint,
    custom_strumming character varying(255),
    student_notes text,
    teacher_notes text,
    current_status public.song_progress_status DEFAULT 'to_learn'::public.song_progress_status NOT NULL,
    started_at timestamp with time zone,
    mastered_at timestamp with time zone,
    difficulty_rating smallint,
    total_practice_minutes integer DEFAULT 0,
    practice_session_count integer DEFAULT 0,
    last_practiced_at timestamp with time zone,
    assigned_by uuid,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    priority character varying(20) DEFAULT 'normal'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    self_rating integer,
    self_rating_updated_at timestamp with time zone,
    CONSTRAINT student_repertoire_capo_fret_check CHECK (((capo_fret IS NULL) OR ((capo_fret >= 0) AND (capo_fret <= 20)))),
    CONSTRAINT student_repertoire_difficulty_rating_check CHECK (((difficulty_rating IS NULL) OR ((difficulty_rating >= 1) AND (difficulty_rating <= 5)))),
    CONSTRAINT student_repertoire_practice_session_count_check CHECK ((practice_session_count >= 0)),
    CONSTRAINT student_repertoire_priority_check CHECK (((priority)::text = ANY (ARRAY[('high'::character varying)::text, ('normal'::character varying)::text, ('low'::character varying)::text, ('archived'::character varying)::text]))),
    CONSTRAINT student_repertoire_self_rating_check CHECK (((self_rating IS NULL) OR ((self_rating >= 1) AND (self_rating <= 5)))),
    CONSTRAINT student_repertoire_total_practice_minutes_check CHECK ((total_practice_minutes >= 0))
);


--
-- Name: TABLE student_repertoire; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_repertoire IS 'Direct student-to-song relationship with per-student configuration and progress tracking';


--
-- Name: COLUMN student_repertoire.preferred_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.preferred_key IS 'Student plays this song in a different key than the global default';


--
-- Name: COLUMN student_repertoire.capo_fret; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.capo_fret IS 'Student-specific capo position (0-20)';


--
-- Name: COLUMN student_repertoire.custom_strumming; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.custom_strumming IS 'Student-specific strumming pattern override';


--
-- Name: COLUMN student_repertoire.current_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.current_status IS 'Song learning progress: to_learn -> started -> remembered -> with_author -> mastered';


--
-- Name: COLUMN student_repertoire.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.started_at IS 'When the student first started learning this song';


--
-- Name: COLUMN student_repertoire.mastered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.mastered_at IS 'When the student achieved mastered status';


--
-- Name: COLUMN student_repertoire.difficulty_rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.difficulty_rating IS 'Student self-reported difficulty (1=easy, 5=hard)';


--
-- Name: COLUMN student_repertoire.assigned_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.assigned_by IS 'Teacher who added this song to the student repertoire';


--
-- Name: COLUMN student_repertoire.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.sort_order IS 'Custom ordering within priority group';


--
-- Name: COLUMN student_repertoire.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.is_active IS 'Whether this song is in the active practice rotation';


--
-- Name: COLUMN student_repertoire.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.priority IS 'Repertoire priority: high, normal, low, or archived';


--
-- Name: COLUMN student_repertoire.self_rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.self_rating IS 'Student self-assessed confidence: 1=struggling, 2=needs work, 3=okay, 4=comfortable, 5=mastered';


--
-- Name: COLUMN student_repertoire.self_rating_updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_repertoire.self_rating_updated_at IS 'When the student last updated their self-rating';


--
-- Name: mv_song_engagement; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_song_engagement AS
 SELECT s.id AS song_id,
    s.title,
    s.author,
    (s.level)::text AS level,
    (s.key)::text AS key,
    s.category,
    count(DISTINCT sr.student_id) AS total_students,
    count(DISTINCT sr.student_id) FILTER (WHERE (sr.current_status = 'mastered'::public.song_progress_status)) AS mastered_count,
    count(DISTINCT sr.student_id) FILTER (WHERE (sr.is_active = true)) AS active_learners,
    COALESCE((avg(sr.total_practice_minutes))::integer, 0) AS avg_practice_minutes,
    COALESCE(round(avg(sr.difficulty_rating), 1), (0)::numeric) AS avg_difficulty,
    count(DISTINCT ls.lesson_id) AS lesson_appearances,
    max(GREATEST(sr.updated_at, ls.updated_at)) AS last_activity
   FROM ((public.songs s
     LEFT JOIN public.student_repertoire sr ON ((sr.song_id = s.id)))
     LEFT JOIN public.lesson_songs ls ON ((ls.song_id = s.id)))
  WHERE (s.deleted_at IS NULL)
  GROUP BY s.id, s.title, s.author, s.level, s.key, s.category
  WITH NO DATA;


--
-- Name: mv_song_popularity; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_song_popularity AS
 SELECT s.id AS song_id,
    s.title,
    s.author,
    (s.level)::text AS level,
    count(DISTINCT sr.student_id) AS times_assigned,
    count(DISTINCT sr.student_id) AS unique_students,
    count(DISTINCT sr.student_id) FILTER (WHERE (sr.current_status = 'mastered'::public.song_progress_status)) AS mastery_count,
        CASE
            WHEN (count(DISTINCT sr.student_id) > 0) THEN round((((count(DISTINCT sr.student_id) FILTER (WHERE (sr.current_status = 'mastered'::public.song_progress_status)))::numeric / (count(DISTINCT sr.student_id))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS mastery_rate,
    COALESCE(round(avg(sr.difficulty_rating), 1), (0)::numeric) AS avg_difficulty_rating
   FROM (public.songs s
     LEFT JOIN public.student_repertoire sr ON ((sr.song_id = s.id)))
  WHERE (s.deleted_at IS NULL)
  GROUP BY s.id, s.title, s.author, s.level
  WITH NO DATA;


--
-- Name: notification_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_type public.notification_type NOT NULL,
    recipient_user_id uuid NOT NULL,
    recipient_email text NOT NULL,
    status public.notification_status DEFAULT 'pending'::public.notification_status NOT NULL,
    subject text NOT NULL,
    template_data jsonb,
    sent_at timestamp with time zone,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 5 NOT NULL,
    entity_type text,
    entity_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE notification_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_log IS 'Audit trail for all notification delivery attempts';


--
-- Name: COLUMN notification_log.retry_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_log.retry_count IS 'Number of retry attempts (max 5 with exponential backoff)';


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notification_type public.notification_type NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    delivery_channel public.notification_delivery_channel DEFAULT 'email'::public.notification_delivery_channel NOT NULL
);


--
-- Name: TABLE notification_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_preferences IS 'User-level notification opt-in/opt-out settings';


--
-- Name: COLUMN notification_preferences.delivery_channel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.delivery_channel IS 'Delivery channel: email (2 types), in_app (16 types), or both (future)';


--
-- Name: notification_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_type public.notification_type NOT NULL,
    recipient_user_id uuid NOT NULL,
    template_data jsonb NOT NULL,
    scheduled_for timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    status public.notification_status DEFAULT 'pending'::public.notification_status NOT NULL,
    priority integer DEFAULT 5 NOT NULL,
    entity_type text,
    entity_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE notification_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_queue IS 'Queue for scheduled and delayed notifications';


--
-- Name: COLUMN notification_queue.scheduled_for; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_queue.scheduled_for IS 'When to send this notification (allows scheduling future notifications)';


--
-- Name: COLUMN notification_queue.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_queue.priority IS 'Higher priority notifications processed first (1-10, default 5)';


--
-- Name: practice_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    song_id uuid,
    duration_minutes smallint NOT NULL,
    notes public.medium_text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    bpm_practiced smallint,
    CONSTRAINT practice_sessions_bpm_practiced_check CHECK (((bpm_practiced IS NULL) OR ((bpm_practiced >= 20) AND (bpm_practiced <= 300)))),
    CONSTRAINT practice_sessions_duration_minutes_check CHECK (((duration_minutes > 0) AND (duration_minutes <= 480)))
);


--
-- Name: TABLE practice_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.practice_sessions IS 'Individual practice session records';


--
-- Name: COLUMN practice_sessions.duration_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.practice_sessions.duration_minutes IS 'Practice duration (1-480 minutes)';


--
-- Name: COLUMN practice_sessions.bpm_practiced; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.practice_sessions.bpm_practiced IS 'BPM practiced at (NULL = no specific tempo); enables tempo ladder tracking';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email public.citext,
    full_name text,
    first_name text,
    last_name text,
    avatar_url text,
    notes text,
    phone text,
    is_admin boolean DEFAULT false NOT NULL,
    is_teacher boolean DEFAULT false NOT NULL,
    is_student boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_development boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_id uuid,
    is_parent boolean DEFAULT false NOT NULL,
    onboarding_completed boolean DEFAULT false NOT NULL,
    is_shadow boolean DEFAULT false NOT NULL,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    deletion_requested_at timestamp with time zone,
    invite_email text,
    deleted_at timestamp with time zone,
    student_status public.student_status DEFAULT 'archived'::public.student_status NOT NULL,
    status_changed_at timestamp with time zone DEFAULT now(),
    skill_level text,
    instrument text,
    start_date date,
    avatar_color text,
    parent_name text,
    parent_email text,
    lesson_duration_minutes integer,
    lesson_rate numeric(10,2),
    billing_cycle text,
    lesson_day_of_week smallint,
    lesson_time_local time without time zone,
    CONSTRAINT no_self_parent CHECK ((parent_id <> id)),
    CONSTRAINT profiles_billing_cycle_check CHECK (((billing_cycle IS NULL) OR (billing_cycle = ANY (ARRAY['per_lesson'::text, 'weekly'::text, 'monthly'::text])))),
    CONSTRAINT profiles_lesson_day_of_week_check CHECK (((lesson_day_of_week IS NULL) OR ((lesson_day_of_week >= 1) AND (lesson_day_of_week <= 7)))),
    CONSTRAINT profiles_lesson_duration_check CHECK (((lesson_duration_minutes IS NULL) OR (lesson_duration_minutes > 0))),
    CONSTRAINT profiles_lesson_rate_check CHECK (((lesson_rate IS NULL) OR (lesson_rate >= (0)::numeric))),
    CONSTRAINT profiles_skill_level_check CHECK (((skill_level IS NULL) OR (skill_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))))
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'User profiles linked 1:1 with auth.users - stores user details and role flags';


--
-- Name: COLUMN profiles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.id IS 'Same UUID as auth.users.id for direct RLS comparison';


--
-- Name: COLUMN profiles.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.user_id IS 'References auth.users(id). NULL for shadow profiles (is_shadow=true). For real users, this equals profiles.id.';


--
-- Name: COLUMN profiles.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.email IS 'User email address - must be unique';


--
-- Name: COLUMN profiles.full_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.full_name IS 'Display name shown in UI';


--
-- Name: COLUMN profiles.is_admin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.is_admin IS 'Has full system access';


--
-- Name: COLUMN profiles.is_teacher; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.is_teacher IS 'Can teach students and manage lessons';


--
-- Name: COLUMN profiles.is_student; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.is_student IS 'Takes lessons from teachers';


--
-- Name: COLUMN profiles.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.is_active IS 'Active account - false disables login';


--
-- Name: COLUMN profiles.is_development; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.is_development IS 'Development/test account flag';


--
-- Name: COLUMN profiles.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.parent_id IS 'For student profiles: references the parent/guardian profile';


--
-- Name: COLUMN profiles.is_parent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.is_parent IS 'This profile belongs to a parent/guardian of a student';


--
-- Name: COLUMN profiles.onboarding_completed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether user has completed the onboarding flow';


--
-- Name: COLUMN profiles.is_shadow; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.is_shadow IS 'True for teacher-created placeholder profiles with no auth account yet (user_id is null); cleared when claimed at signup';


--
-- Name: COLUMN profiles.invite_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.invite_email IS 'Real email address for a shadow profile; matched at signup to claim the profile';


--
-- Name: COLUMN profiles.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.deleted_at IS 'Soft-delete timestamp; set alongside is_active=false on deactivation';


--
-- Name: COLUMN profiles.student_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.student_status IS 'Student engagement status: active (taking lessons) or archived (not currently engaged)';


--
-- Name: COLUMN profiles.status_changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.status_changed_at IS 'Timestamp when the student_status was last updated';


--
-- Name: COLUMN profiles.skill_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.skill_level IS 'Student skill level: beginner | intermediate | advanced';


--
-- Name: COLUMN profiles.instrument; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.instrument IS 'Primary instrument the student is learning (e.g. Guitar)';


--
-- Name: COLUMN profiles.start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.start_date IS 'Date the student began lessons';


--
-- Name: COLUMN profiles.avatar_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.avatar_color IS 'Hex colour for the student avatar chip (e.g. #c89523)';


--
-- Name: COLUMN profiles.parent_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.parent_name IS 'Free-text parent/guardian name (for students under 18)';


--
-- Name: COLUMN profiles.parent_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.parent_email IS 'Free-text parent/guardian email';


--
-- Name: COLUMN profiles.lesson_duration_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.lesson_duration_minutes IS 'Recurring lesson length in minutes (e.g. 45)';


--
-- Name: COLUMN profiles.lesson_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.lesson_rate IS 'BILLING (product review): rate charged per lesson';


--
-- Name: COLUMN profiles.billing_cycle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.billing_cycle IS 'BILLING (product review): per_lesson | weekly | monthly';


--
-- Name: COLUMN profiles.lesson_day_of_week; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.lesson_day_of_week IS 'Recurring lesson day of week — ISO 8601 numbering, 1 = Monday … 7 = Sunday';


--
-- Name: COLUMN profiles.lesson_time_local; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.lesson_time_local IS 'Recurring lesson start time (studio-local, no timezone)';


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: song_of_the_week; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_of_the_week (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    song_id uuid NOT NULL,
    selected_by uuid,
    teacher_message text,
    active_from date DEFAULT CURRENT_DATE NOT NULL,
    active_until date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'student'::text NOT NULL,
    CONSTRAINT chk_sotw_category CHECK ((category = ANY (ARRAY['student'::text, 'teacher'::text])))
);


--
-- Name: song_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    title text NOT NULL,
    artist text,
    notes text,
    url text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    review_notes text,
    song_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT song_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: song_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    song_id uuid NOT NULL,
    previous_status text,
    new_status text NOT NULL,
    changed_at timestamp with time zone DEFAULT now(),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE song_status_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.song_status_history IS 'Audit log tracking all song learning status changes per student';


--
-- Name: song_usage_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.song_usage_stats AS
 SELECT s.id AS song_id,
    s.title,
    count(ls.id) AS times_assigned
   FROM (public.songs s
     LEFT JOIN public.lesson_songs ls ON ((ls.song_id = s.id)))
  GROUP BY s.id, s.title;


--
-- Name: song_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    song_id uuid,
    uploaded_by uuid NOT NULL,
    google_drive_file_id text NOT NULL,
    google_drive_folder_id text,
    title text DEFAULT ''::text NOT NULL,
    filename text NOT NULL,
    mime_type text NOT NULL,
    file_size_bytes bigint,
    duration_seconds numeric(8,2),
    thumbnail_url text,
    display_order integer DEFAULT 0 NOT NULL,
    published_to_instagram boolean DEFAULT false NOT NULL,
    published_to_tiktok boolean DEFAULT false NOT NULL,
    published_to_youtube_shorts boolean DEFAULT false NOT NULL,
    instagram_media_id text,
    tiktok_media_id text,
    youtube_shorts_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    match_confidence integer,
    match_source character varying(20),
    video_type public.video_type DEFAULT 'tutorial'::public.video_type NOT NULL,
    is_recording_correct boolean DEFAULT false NOT NULL,
    is_well_lit boolean DEFAULT false NOT NULL,
    mic_type character varying(20),
    is_audio_mixed boolean DEFAULT false NOT NULL,
    is_video_edited boolean DEFAULT false NOT NULL,
    production_status text DEFAULT 'idea'::text NOT NULL,
    CONSTRAINT song_videos_match_confidence_check CHECK (((match_confidence >= 0) AND (match_confidence <= 100))),
    CONSTRAINT song_videos_match_source_check CHECK (((match_source)::text = ANY (ARRAY[('auto'::character varying)::text, ('manual'::character varying)::text, ('spotify'::character varying)::text]))),
    CONSTRAINT song_videos_mic_type_check CHECK (((mic_type)::text = ANY (ARRAY[('iphone'::character varying)::text, ('external'::character varying)::text]))),
    CONSTRAINT song_videos_production_status_check CHECK ((production_status = ANY (ARRAY['idea'::text, 'recording'::text, 'edited'::text, 'ready'::text])))
);


--
-- Name: COLUMN song_videos.match_confidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.song_videos.match_confidence IS 'Confidence score (0-100) from the matching algorithm. Higher scores indicate better matches.';


--
-- Name: COLUMN song_videos.match_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.song_videos.match_source IS 'Source of the match: auto (algorithm), manual (admin override), spotify (created from Spotify track).';


--
-- Name: COLUMN song_videos.is_recording_correct; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.song_videos.is_recording_correct IS 'Whether the recording has no performance mistakes';


--
-- Name: COLUMN song_videos.is_well_lit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.song_videos.is_well_lit IS 'Whether the video has good lighting';


--
-- Name: COLUMN song_videos.mic_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.song_videos.mic_type IS 'Microphone used: iphone (built-in) or external';


--
-- Name: COLUMN song_videos.is_audio_mixed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.song_videos.is_audio_mixed IS 'Whether the audio has been mixed/mastered';


--
-- Name: COLUMN song_videos.is_video_edited; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.song_videos.is_video_edited IS 'Whether the video has been edited (cuts, transitions, etc.)';


--
-- Name: COLUMN song_videos.production_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.song_videos.production_status IS 'Recording lifecycle: idea -> recording -> edited -> ready';


--
-- Name: spotify_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spotify_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    song_id uuid NOT NULL,
    track_id character varying(255) NOT NULL,
    track_name character varying(500) NOT NULL,
    artist_name character varying(500) NOT NULL,
    album_name character varying(500),
    url public.url NOT NULL,
    preview_url public.url,
    cover_image_url public.url,
    duration_ms public.positive_int,
    release_date character varying(50),
    popularity smallint,
    confidence_score public.percentage NOT NULL,
    search_query text NOT NULL,
    match_reason public.medium_text,
    ai_reasoning public.medium_text,
    status public.spotify_match_status DEFAULT 'pending'::public.spotify_match_status NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes public.medium_text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT spotify_matches_popularity_check CHECK (((popularity IS NULL) OR ((popularity >= 0) AND (popularity <= 100))))
);


--
-- Name: TABLE spotify_matches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.spotify_matches IS 'Potential Spotify matches awaiting review';


--
-- Name: COLUMN spotify_matches.confidence_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.spotify_matches.confidence_score IS 'AI confidence score (0-100)';


--
-- Name: COLUMN spotify_matches.match_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.spotify_matches.match_reason IS 'Brief explanation of why this was considered a match';


--
-- Name: COLUMN spotify_matches.ai_reasoning; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.spotify_matches.ai_reasoning IS 'Detailed AI reasoning for the match';


--
-- Name: COLUMN spotify_matches.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.spotify_matches.status IS 'Review status: pending, approved, rejected, auto_applied';


--
-- Name: student_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    status text NOT NULL,
    notes text,
    last_assessed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_skills_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'mastered'::text])))
);


--
-- Name: sync_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    google_event_id character varying(255) NOT NULL,
    conflict_data jsonb NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    resolution character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_sync_conflicts_resolution CHECK (((resolution IS NULL) OR ((resolution)::text = ANY (ARRAY[('use_local'::character varying)::text, ('use_remote'::character varying)::text])))),
    CONSTRAINT check_sync_conflicts_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('resolved'::character varying)::text, ('ignored'::character varying)::text])))
);


--
-- Name: TABLE sync_conflicts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sync_conflicts IS 'Tracks conflicts between Strummy and Google Calendar for manual resolution';


--
-- Name: COLUMN sync_conflicts.lesson_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sync_conflicts.lesson_id IS 'Reference to the conflicted lesson';


--
-- Name: COLUMN sync_conflicts.google_event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sync_conflicts.google_event_id IS 'Google Calendar event ID';


--
-- Name: COLUMN sync_conflicts.conflict_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sync_conflicts.conflict_data IS 'JSON containing remote event data (title, time, notes, etc.)';


--
-- Name: COLUMN sync_conflicts.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sync_conflicts.status IS 'Conflict status: pending, resolved, or ignored';


--
-- Name: COLUMN sync_conflicts.resolution; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sync_conflicts.resolution IS 'How the conflict was resolved: use_local or use_remote';


--
-- Name: COLUMN sync_conflicts.resolved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sync_conflicts.resolved_at IS 'Timestamp when conflict was resolved';


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    level public.log_level NOT NULL,
    prefix text NOT NULL,
    message text NOT NULL,
    request_id text,
    user_id uuid,
    context jsonb,
    error jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE system_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_logs IS 'Persisted warn/error log stream for the admin UI. Phase 2.5 of ADR 0003.';


--
-- Name: COLUMN system_logs.prefix; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_logs.prefix IS 'createLogger() namespace, e.g. "API", "cron:lesson-reminders".';


--
-- Name: COLUMN system_logs.context; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_logs.context IS 'Merged request-scope + log-call context (redacted before insert).';


--
-- Name: COLUMN system_logs.error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_logs.error IS 'Serialized Error object: { type, message, stack }. NULL for non-error levels.';


--
-- Name: task_management; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_management (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    priority public.task_priority DEFAULT 'MEDIUM'::public.task_priority NOT NULL,
    status public.task_status DEFAULT 'OPEN'::public.task_status NOT NULL,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teacher_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    display_name text,
    instrument text,
    years_experience integer,
    studio_name text,
    tagline text,
    city text,
    timezone text,
    teaches text[] DEFAULT '{}'::text[] NOT NULL,
    default_lesson_minutes integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT teacher_settings_default_lesson_minutes_check CHECK (((default_lesson_minutes IS NULL) OR (default_lesson_minutes > 0))),
    CONSTRAINT teacher_settings_years_experience_check CHECK (((years_experience IS NULL) OR (years_experience >= 0)))
);


--
-- Name: TABLE teacher_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teacher_settings IS 'Per-teacher studio profile captured during onboarding (public-facing studio identity).';


--
-- Name: COLUMN teacher_settings.display_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_settings.display_name IS 'Owner display name shown to students/parents.';


--
-- Name: COLUMN teacher_settings.instrument; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_settings.instrument IS 'Primary instrument the teacher teaches (e.g. Guitar).';


--
-- Name: COLUMN teacher_settings.years_experience; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_settings.years_experience IS 'Years of teaching experience.';


--
-- Name: COLUMN teacher_settings.studio_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_settings.studio_name IS 'Public studio name (e.g. "Sarah Chen Guitar Studio").';


--
-- Name: COLUMN teacher_settings.tagline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_settings.tagline IS 'One-line studio tagline.';


--
-- Name: COLUMN teacher_settings.city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_settings.city IS 'Studio city / location label.';


--
-- Name: COLUMN teacher_settings.timezone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_settings.timezone IS 'Studio timezone label (e.g. "Pacific (UTC-7)").';


--
-- Name: COLUMN teacher_settings.teaches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_settings.teaches IS 'Styles/instruments taught (e.g. {Acoustic,Electric,Classical}).';


--
-- Name: COLUMN teacher_settings.default_lesson_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_settings.default_lesson_minutes IS 'Default lesson length in minutes (e.g. 45).';


--
-- Name: teacher_students; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.teacher_students WITH (security_invoker='true') AS
 SELECT DISTINCT teacher_id,
    student_id
   FROM public.lessons
  WHERE (deleted_at IS NULL);


--
-- Name: VIEW teacher_students; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.teacher_students IS 'Derived teacher-student pairs from lessons. A student appears here once they have at least one lesson with a teacher.';


--
-- Name: theoretical_course_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.theoretical_course_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL,
    granted_by uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE theoretical_course_access; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.theoretical_course_access IS 'Per-user access control for theory courses';


--
-- Name: theoretical_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.theoretical_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description public.medium_text,
    cover_image_url public.url,
    level public.theoretical_course_level DEFAULT 'beginner'::public.theoretical_course_level NOT NULL,
    created_by uuid NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE theoretical_courses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.theoretical_courses IS 'Structured theory courses (book-like containers)';


--
-- Name: COLUMN theoretical_courses.is_published; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.theoretical_courses.is_published IS 'Whether the course is visible to students with access';


--
-- Name: COLUMN theoretical_courses.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.theoretical_courses.sort_order IS 'Display ordering in catalog';


--
-- Name: theoretical_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.theoretical_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    excerpt public.short_text,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE theoretical_lessons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.theoretical_lessons IS 'Individual chapters within a theory course';


--
-- Name: COLUMN theoretical_lessons.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.theoretical_lessons.content IS 'Markdown content for the chapter';


--
-- Name: COLUMN theoretical_lessons.excerpt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.theoretical_lessons.excerpt IS 'Short preview text shown in chapter lists';


--
-- Name: COLUMN theoretical_lessons.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.theoretical_lessons.sort_order IS 'Chapter ordering within the course';


--
-- Name: user_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_integrations (
    user_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    access_token text,
    refresh_token text,
    expires_at bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE user_integrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_integrations IS 'OAuth tokens for external service integrations';


--
-- Name: COLUMN user_integrations.provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_integrations.provider IS 'Provider name (e.g., google, spotify)';


--
-- Name: COLUMN user_integrations.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_integrations.expires_at IS 'Token expiration in Unix milliseconds';


--
-- Name: user_overview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_overview AS
 SELECT id AS user_id,
    email,
    created_at,
    updated_at,
    is_admin,
    is_teacher,
    is_student
   FROM public.profiles p;


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    goals text[] DEFAULT '{}'::text[] NOT NULL,
    learning_style text[] DEFAULT '{}'::text[] NOT NULL,
    instrument_preference text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    daily_goal_minutes integer,
    CONSTRAINT user_preferences_daily_goal_minutes_check CHECK (((daily_goal_minutes IS NULL) OR (daily_goal_minutes > 0)))
);


--
-- Name: TABLE user_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_preferences IS 'Stores user onboarding preferences: goals, skill level, learning style, instruments';


--
-- Name: COLUMN user_preferences.goals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_preferences.goals IS 'Array of learning goal IDs selected during onboarding';


--
-- Name: COLUMN user_preferences.learning_style; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_preferences.learning_style IS 'Preferred learning methods: video, sheet-music, tabs, all';


--
-- Name: COLUMN user_preferences.instrument_preference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_preferences.instrument_preference IS 'Preferred instrument types: acoustic, electric, classical, bass';


--
-- Name: COLUMN user_preferences.daily_goal_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_preferences.daily_goal_minutes IS 'Student daily practice target in minutes, set during onboarding.';


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.user_role NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: v_assignment_overview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_assignment_overview WITH (security_invoker='true') AS
 SELECT a.id,
    a.title,
    a.status,
    a.due_date,
    a.teacher_id,
    a.student_id,
    t.full_name AS teacher_name,
    s.full_name AS student_name,
        CASE
            WHEN (a.status = 'completed'::public.assignment_status) THEN false
            WHEN (a.status = 'cancelled'::public.assignment_status) THEN false
            WHEN (a.due_date < now()) THEN true
            ELSE false
        END AS is_overdue
   FROM ((public.assignments a
     JOIN public.profiles t ON ((t.id = a.teacher_id)))
     JOIN public.profiles s ON ((s.id = a.student_id)))
  WHERE (a.deleted_at IS NULL);


--
-- Name: VIEW v_assignment_overview; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_assignment_overview IS 'Assignment list with teacher/student names and overdue status';


--
-- Name: v_song_usage_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_song_usage_stats WITH (security_invoker='true') AS
 SELECT s.id AS song_id,
    s.title,
    s.author,
    count(DISTINCT ls.id) AS times_assigned,
    count(DISTINCT l.student_id) AS unique_students,
    count(DISTINCT ls.id) FILTER (WHERE (ls.status = 'mastered'::public.lesson_song_status)) AS times_mastered
   FROM ((public.songs s
     LEFT JOIN public.lesson_songs ls ON ((ls.song_id = s.id)))
     LEFT JOIN public.lessons l ON (((l.id = ls.lesson_id) AND (l.deleted_at IS NULL))))
  WHERE (s.deleted_at IS NULL)
  GROUP BY s.id, s.title, s.author;


--
-- Name: VIEW v_song_usage_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_song_usage_stats IS 'Song assignment frequency and mastery statistics';


--
-- Name: webhook_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    channel_id character varying(255) NOT NULL,
    resource_id character varying(255) NOT NULL,
    expiration bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE webhook_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_subscriptions IS 'External webhook subscriptions for push notifications';


--
-- Name: COLUMN webhook_subscriptions.channel_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_subscriptions.channel_id IS 'Unique channel ID for receiving callbacks';


--
-- Name: COLUMN webhook_subscriptions.resource_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_subscriptions.resource_id IS 'External resource ID being watched';


--
-- Name: COLUMN webhook_subscriptions.expiration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_subscriptions.expiration IS 'Subscription expiration in Unix milliseconds';


--
-- Name: audit_log_2026_01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_01 FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');


--
-- Name: audit_log_2026_02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_02 FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');


--
-- Name: audit_log_2026_03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_03 FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');


--
-- Name: audit_log_2026_04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_04 FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');


--
-- Name: audit_log_2026_05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_05 FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');


--
-- Name: audit_log_2026_06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_06 FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');


--
-- Name: audit_log_2026_07; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_07 FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');


--
-- Name: audit_log_2026_08; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_08 FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');


--
-- Name: audit_log_2026_09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_09 FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');


--
-- Name: audit_log_2026_10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_10 FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');


--
-- Name: audit_log_2026_11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_11 FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');


--
-- Name: audit_log_2026_12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_2026_12 FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');


--
-- Name: audit_log_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ATTACH PARTITION public.audit_log_default DEFAULT;


--
-- Name: agent_execution_logs agent_execution_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_execution_logs
    ADD CONSTRAINT agent_execution_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_generations ai_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generations
    ADD CONSTRAINT ai_generations_pkey PRIMARY KEY (id);


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_prompt_templates ai_prompt_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_stats ai_usage_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_stats
    ADD CONSTRAINT ai_usage_stats_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: apple_shortcut_song_import_log apple_shortcut_song_import_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apple_shortcut_song_import_log
    ADD CONSTRAINT apple_shortcut_song_import_log_pkey PRIMARY KEY (id);


--
-- Name: assignment_history assignment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_history
    ADD CONSTRAINT assignment_history_pkey PRIMARY KEY (id);


--
-- Name: assignment_templates assignment_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_templates
    ADD CONSTRAINT assignment_templates_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_01 audit_log_2026_01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_01
    ADD CONSTRAINT audit_log_2026_01_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_02 audit_log_2026_02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_02
    ADD CONSTRAINT audit_log_2026_02_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_03 audit_log_2026_03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_03
    ADD CONSTRAINT audit_log_2026_03_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_04 audit_log_2026_04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_04
    ADD CONSTRAINT audit_log_2026_04_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_05 audit_log_2026_05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_05
    ADD CONSTRAINT audit_log_2026_05_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_06 audit_log_2026_06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_06
    ADD CONSTRAINT audit_log_2026_06_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_07 audit_log_2026_07_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_07
    ADD CONSTRAINT audit_log_2026_07_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_08 audit_log_2026_08_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_08
    ADD CONSTRAINT audit_log_2026_08_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_09 audit_log_2026_09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_09
    ADD CONSTRAINT audit_log_2026_09_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_10 audit_log_2026_10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_10
    ADD CONSTRAINT audit_log_2026_10_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_11 audit_log_2026_11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_11
    ADD CONSTRAINT audit_log_2026_11_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_2026_12 audit_log_2026_12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_2026_12
    ADD CONSTRAINT audit_log_2026_12_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_log_default audit_log_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log_default
    ADD CONSTRAINT audit_log_default_pkey PRIMARY KEY (id, created_at);


--
-- Name: auth_events auth_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_events
    ADD CONSTRAINT auth_events_pkey PRIMARY KEY (id);


--
-- Name: auth_rate_limits auth_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_rate_limits
    ADD CONSTRAINT auth_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: chord_quiz_attempts chord_quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chord_quiz_attempts
    ADD CONSTRAINT chord_quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: chord_srs chord_srs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chord_srs
    ADD CONSTRAINT chord_srs_pkey PRIMARY KEY (id);


--
-- Name: profiles ck_shadow_user_id; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.profiles
    ADD CONSTRAINT ck_shadow_user_id CHECK (((is_shadow = true) OR (user_id IS NOT NULL))) NOT VALID;


--
-- Name: content_post_metrics content_post_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_post_metrics
    ADD CONSTRAINT content_post_metrics_pkey PRIMARY KEY (id);


--
-- Name: content_posts content_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_posts
    ADD CONSTRAINT content_posts_pkey PRIMARY KEY (id);


--
-- Name: content_posts content_posts_unique_slot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_posts
    ADD CONSTRAINT content_posts_unique_slot UNIQUE (song_id, platform, scheduled_at);


--
-- Name: drive_files drive_files_google_drive_file_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_files
    ADD CONSTRAINT drive_files_google_drive_file_id_key UNIQUE (google_drive_file_id);


--
-- Name: drive_files drive_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_files
    ADD CONSTRAINT drive_files_pkey PRIMARY KEY (id);


--
-- Name: hashtag_sets hashtag_sets_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hashtag_sets
    ADD CONSTRAINT hashtag_sets_name_key UNIQUE (name);


--
-- Name: hashtag_sets hashtag_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hashtag_sets
    ADD CONSTRAINT hashtag_sets_pkey PRIMARY KEY (id);


--
-- Name: in_app_notifications in_app_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_pkey PRIMARY KEY (id);


--
-- Name: lesson_songs lesson_songs_lesson_id_song_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_songs
    ADD CONSTRAINT lesson_songs_lesson_id_song_id_key UNIQUE (lesson_id, song_id);


--
-- Name: lesson_songs lesson_songs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_songs
    ADD CONSTRAINT lesson_songs_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_google_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_google_event_id_key UNIQUE (google_event_id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_teacher_id_student_id_lesson_teacher_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_teacher_id_student_id_lesson_teacher_number_key UNIQUE (teacher_id, student_id, lesson_teacher_number);


--
-- Name: notification_log notification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_notification_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_notification_type_key UNIQUE (user_id, notification_type);


--
-- Name: notification_queue notification_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_pkey PRIMARY KEY (id);


--
-- Name: practice_sessions practice_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_sessions
    ADD CONSTRAINT practice_sessions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: song_of_the_week song_of_the_week_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_of_the_week
    ADD CONSTRAINT song_of_the_week_pkey PRIMARY KEY (id);


--
-- Name: song_requests song_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_requests
    ADD CONSTRAINT song_requests_pkey PRIMARY KEY (id);


--
-- Name: song_status_history song_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_status_history
    ADD CONSTRAINT song_status_history_pkey PRIMARY KEY (id);


--
-- Name: song_videos song_videos_google_drive_file_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_videos
    ADD CONSTRAINT song_videos_google_drive_file_id_key UNIQUE (google_drive_file_id);


--
-- Name: song_videos song_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_videos
    ADD CONSTRAINT song_videos_pkey PRIMARY KEY (id);


--
-- Name: songs songs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.songs
    ADD CONSTRAINT songs_pkey PRIMARY KEY (id);


--
-- Name: spotify_matches spotify_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_matches
    ADD CONSTRAINT spotify_matches_pkey PRIMARY KEY (id);


--
-- Name: student_repertoire student_repertoire_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_repertoire
    ADD CONSTRAINT student_repertoire_pkey PRIMARY KEY (id);


--
-- Name: student_skills student_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_pkey PRIMARY KEY (id);


--
-- Name: student_skills student_skills_student_id_skill_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_student_id_skill_id_key UNIQUE (student_id, skill_id);


--
-- Name: sync_conflicts sync_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_pkey PRIMARY KEY (id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: task_management task_management_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_management
    ADD CONSTRAINT task_management_pkey PRIMARY KEY (id);


--
-- Name: teacher_settings teacher_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_settings
    ADD CONSTRAINT teacher_settings_pkey PRIMARY KEY (id);


--
-- Name: teacher_settings teacher_settings_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_settings
    ADD CONSTRAINT teacher_settings_profile_id_key UNIQUE (profile_id);


--
-- Name: theoretical_course_access theoretical_course_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theoretical_course_access
    ADD CONSTRAINT theoretical_course_access_pkey PRIMARY KEY (id);


--
-- Name: theoretical_courses theoretical_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theoretical_courses
    ADD CONSTRAINT theoretical_courses_pkey PRIMARY KEY (id);


--
-- Name: theoretical_lessons theoretical_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theoretical_lessons
    ADD CONSTRAINT theoretical_lessons_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_stats uq_ai_usage_stats; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_stats
    ADD CONSTRAINT uq_ai_usage_stats UNIQUE (user_id, date, model_id);


--
-- Name: chord_srs uq_chord_srs; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chord_srs
    ADD CONSTRAINT uq_chord_srs UNIQUE (student_id, chord_id);


--
-- Name: theoretical_course_access uq_course_access; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theoretical_course_access
    ADD CONSTRAINT uq_course_access UNIQUE (course_id, user_id);


--
-- Name: lessons uq_lessons_teacher_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT uq_lessons_teacher_number UNIQUE (teacher_id, student_id, lesson_teacher_number);


--
-- Name: spotify_matches uq_spotify_matches; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_matches
    ADD CONSTRAINT uq_spotify_matches UNIQUE (song_id, track_id, status) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: student_repertoire uq_student_repertoire; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_repertoire
    ADD CONSTRAINT uq_student_repertoire UNIQUE (student_id, song_id);


--
-- Name: theoretical_lessons uq_theoretical_lesson_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theoretical_lessons
    ADD CONSTRAINT uq_theoretical_lesson_order UNIQUE (course_id, sort_order) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: user_integrations user_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_integrations
    ADD CONSTRAINT user_integrations_pkey PRIMARY KEY (user_id, provider);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_unique UNIQUE (user_id, role);


--
-- Name: webhook_subscriptions webhook_subscriptions_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_channel_id_key UNIQUE (channel_id);


--
-- Name: webhook_subscriptions webhook_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: ix_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_log_action ON ONLY public.audit_log USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_01_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_01_action_created_at_idx ON public.audit_log_2026_01 USING btree (action, created_at DESC);


--
-- Name: ix_audit_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_log_actor ON ONLY public.audit_log USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_01_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_01_actor_id_created_at_idx ON public.audit_log_2026_01 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: ix_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_log_created_at ON ONLY public.audit_log USING btree (created_at DESC);


--
-- Name: audit_log_2026_01_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_01_created_at_idx ON public.audit_log_2026_01 USING btree (created_at DESC);


--
-- Name: ix_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_log_entity ON ONLY public.audit_log USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_01_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_01_entity_type_entity_id_created_at_idx ON public.audit_log_2026_01 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_02_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_02_action_created_at_idx ON public.audit_log_2026_02 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_02_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_02_actor_id_created_at_idx ON public.audit_log_2026_02 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_02_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_02_created_at_idx ON public.audit_log_2026_02 USING btree (created_at DESC);


--
-- Name: audit_log_2026_02_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_02_entity_type_entity_id_created_at_idx ON public.audit_log_2026_02 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_03_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_03_action_created_at_idx ON public.audit_log_2026_03 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_03_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_03_actor_id_created_at_idx ON public.audit_log_2026_03 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_03_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_03_created_at_idx ON public.audit_log_2026_03 USING btree (created_at DESC);


--
-- Name: audit_log_2026_03_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_03_entity_type_entity_id_created_at_idx ON public.audit_log_2026_03 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_04_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_04_action_created_at_idx ON public.audit_log_2026_04 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_04_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_04_actor_id_created_at_idx ON public.audit_log_2026_04 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_04_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_04_created_at_idx ON public.audit_log_2026_04 USING btree (created_at DESC);


--
-- Name: audit_log_2026_04_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_04_entity_type_entity_id_created_at_idx ON public.audit_log_2026_04 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_05_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_05_action_created_at_idx ON public.audit_log_2026_05 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_05_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_05_actor_id_created_at_idx ON public.audit_log_2026_05 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_05_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_05_created_at_idx ON public.audit_log_2026_05 USING btree (created_at DESC);


--
-- Name: audit_log_2026_05_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_05_entity_type_entity_id_created_at_idx ON public.audit_log_2026_05 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_06_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_06_action_created_at_idx ON public.audit_log_2026_06 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_06_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_06_actor_id_created_at_idx ON public.audit_log_2026_06 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_06_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_06_created_at_idx ON public.audit_log_2026_06 USING btree (created_at DESC);


--
-- Name: audit_log_2026_06_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_06_entity_type_entity_id_created_at_idx ON public.audit_log_2026_06 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_07_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_07_action_created_at_idx ON public.audit_log_2026_07 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_07_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_07_actor_id_created_at_idx ON public.audit_log_2026_07 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_07_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_07_created_at_idx ON public.audit_log_2026_07 USING btree (created_at DESC);


--
-- Name: audit_log_2026_07_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_07_entity_type_entity_id_created_at_idx ON public.audit_log_2026_07 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_08_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_08_action_created_at_idx ON public.audit_log_2026_08 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_08_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_08_actor_id_created_at_idx ON public.audit_log_2026_08 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_08_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_08_created_at_idx ON public.audit_log_2026_08 USING btree (created_at DESC);


--
-- Name: audit_log_2026_08_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_08_entity_type_entity_id_created_at_idx ON public.audit_log_2026_08 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_09_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_09_action_created_at_idx ON public.audit_log_2026_09 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_09_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_09_actor_id_created_at_idx ON public.audit_log_2026_09 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_09_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_09_created_at_idx ON public.audit_log_2026_09 USING btree (created_at DESC);


--
-- Name: audit_log_2026_09_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_09_entity_type_entity_id_created_at_idx ON public.audit_log_2026_09 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_10_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_10_action_created_at_idx ON public.audit_log_2026_10 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_10_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_10_actor_id_created_at_idx ON public.audit_log_2026_10 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_10_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_10_created_at_idx ON public.audit_log_2026_10 USING btree (created_at DESC);


--
-- Name: audit_log_2026_10_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_10_entity_type_entity_id_created_at_idx ON public.audit_log_2026_10 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_11_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_11_action_created_at_idx ON public.audit_log_2026_11 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_11_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_11_actor_id_created_at_idx ON public.audit_log_2026_11 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_11_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_11_created_at_idx ON public.audit_log_2026_11 USING btree (created_at DESC);


--
-- Name: audit_log_2026_11_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_11_entity_type_entity_id_created_at_idx ON public.audit_log_2026_11 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_2026_12_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_12_action_created_at_idx ON public.audit_log_2026_12 USING btree (action, created_at DESC);


--
-- Name: audit_log_2026_12_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_12_actor_id_created_at_idx ON public.audit_log_2026_12 USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_2026_12_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_12_created_at_idx ON public.audit_log_2026_12 USING btree (created_at DESC);


--
-- Name: audit_log_2026_12_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_2026_12_entity_type_entity_id_created_at_idx ON public.audit_log_2026_12 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_log_default_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_default_action_created_at_idx ON public.audit_log_default USING btree (action, created_at DESC);


--
-- Name: audit_log_default_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_default_actor_id_created_at_idx ON public.audit_log_default USING btree (actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: audit_log_default_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_default_created_at_idx ON public.audit_log_default USING btree (created_at DESC);


--
-- Name: audit_log_default_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_default_entity_type_entity_id_created_at_idx ON public.audit_log_default USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: chord_quiz_attempts_chord_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chord_quiz_attempts_chord_idx ON public.chord_quiz_attempts USING btree (chord_id);


--
-- Name: chord_quiz_attempts_student_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chord_quiz_attempts_student_created_idx ON public.chord_quiz_attempts USING btree (student_id, created_at DESC);


--
-- Name: idx_api_keys_key_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_key_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);


--
-- Name: idx_assignment_history_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_history_assignment_id ON public.assignment_history USING btree (assignment_id, changed_at DESC);


--
-- Name: idx_assignment_templates_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_templates_teacher_id ON public.assignment_templates USING btree (teacher_id);


--
-- Name: idx_assignments_status_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_status_due ON public.assignments USING btree (status, due_date);


--
-- Name: idx_auth_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_events_event_type ON public.auth_events USING btree (event_type);


--
-- Name: idx_auth_events_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_events_occurred_at ON public.auth_events USING btree (occurred_at DESC);


--
-- Name: idx_auth_events_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_events_success ON public.auth_events USING btree (success);


--
-- Name: idx_auth_events_user_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_events_user_email ON public.auth_events USING btree (user_email);


--
-- Name: idx_content_post_metrics_post_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_post_metrics_post_time ON public.content_post_metrics USING btree (post_id, captured_at DESC);


--
-- Name: idx_content_posts_platform_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_posts_platform_status ON public.content_posts USING btree (platform, status);


--
-- Name: idx_content_posts_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_posts_scheduled_at ON public.content_posts USING btree (scheduled_at);


--
-- Name: idx_content_posts_song; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_posts_song ON public.content_posts USING btree (song_id);


--
-- Name: idx_content_posts_song_video; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_posts_song_video ON public.content_posts USING btree (song_video_id);


--
-- Name: idx_drive_files_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_display_order ON public.drive_files USING btree (entity_type, entity_id, display_order) WHERE (deleted_at IS NULL);


--
-- Name: idx_drive_files_drive_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_drive_id ON public.drive_files USING btree (google_drive_file_id);


--
-- Name: idx_drive_files_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_entity ON public.drive_files USING btree (entity_type, entity_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_drive_files_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_type ON public.drive_files USING btree (file_type) WHERE (deleted_at IS NULL);


--
-- Name: idx_drive_files_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_uploaded_by ON public.drive_files USING btree (uploaded_by) WHERE (deleted_at IS NULL);


--
-- Name: idx_drive_files_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_visibility ON public.drive_files USING btree (visibility) WHERE (deleted_at IS NULL);


--
-- Name: idx_hashtag_sets_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hashtag_sets_active ON public.hashtag_sets USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_lessons_google_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_google_event_id ON public.lessons USING btree (google_event_id);


--
-- Name: idx_lessons_teacher_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_teacher_scheduled ON public.lessons USING btree (teacher_id, scheduled_at);


--
-- Name: idx_profiles_deletion_requested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_deletion_requested ON public.profiles USING btree (deletion_requested_at) WHERE (deletion_requested_at IS NOT NULL);


--
-- Name: idx_profiles_email_locked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_email_locked ON public.profiles USING btree (email, locked_until) WHERE (locked_until IS NOT NULL);


--
-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);


--
-- Name: idx_shortcut_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shortcut_log_status ON public.apple_shortcut_song_import_log USING btree (status);


--
-- Name: idx_shortcut_log_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shortcut_log_user_created ON public.apple_shortcut_song_import_log USING btree (user_id, created_at DESC);


--
-- Name: idx_song_status_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_song_status_history_changed_at ON public.song_status_history USING btree (changed_at DESC);


--
-- Name: idx_song_status_history_song_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_song_status_history_song_id ON public.song_status_history USING btree (song_id);


--
-- Name: idx_song_status_history_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_song_status_history_student_id ON public.song_status_history USING btree (student_id);


--
-- Name: idx_song_videos_drive_file; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_song_videos_drive_file ON public.song_videos USING btree (google_drive_file_id);


--
-- Name: idx_song_videos_match_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_song_videos_match_confidence ON public.song_videos USING btree (match_confidence);


--
-- Name: idx_song_videos_match_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_song_videos_match_source ON public.song_videos USING btree (match_source);


--
-- Name: idx_song_videos_production_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_song_videos_production_status ON public.song_videos USING btree (production_status);


--
-- Name: idx_song_videos_song_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_song_videos_song_id ON public.song_videos USING btree (song_id);


--
-- Name: idx_song_videos_song_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_song_videos_song_order ON public.song_videos USING btree (song_id, display_order);


--
-- Name: idx_song_videos_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_song_videos_type ON public.song_videos USING btree (video_type);


--
-- Name: idx_songs_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_songs_deleted_at ON public.songs USING btree (deleted_at);


--
-- Name: idx_songs_priority_bucket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_songs_priority_bucket ON public.songs USING btree (priority_bucket) WHERE (priority_bucket IS NOT NULL);


--
-- Name: idx_songs_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_songs_recorded_at ON public.songs USING btree (recorded_at) WHERE (recorded_at IS NOT NULL);


--
-- Name: idx_songs_recording_queued_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_songs_recording_queued_at ON public.songs USING btree (recording_queued_at) WHERE (recording_queued_at IS NOT NULL);


--
-- Name: idx_sync_conflicts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_conflicts_created_at ON public.sync_conflicts USING btree (created_at DESC);


--
-- Name: idx_sync_conflicts_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_conflicts_lesson_id ON public.sync_conflicts USING btree (lesson_id);


--
-- Name: idx_sync_conflicts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_conflicts_status ON public.sync_conflicts USING btree (status);


--
-- Name: idx_sync_conflicts_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_conflicts_status_created ON public.sync_conflicts USING btree (status, created_at DESC) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_system_logs_level_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_level_occurred_at ON public.system_logs USING btree (level, occurred_at DESC);


--
-- Name: idx_system_logs_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_occurred_at ON public.system_logs USING btree (occurred_at DESC);


--
-- Name: idx_system_logs_prefix_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_prefix_occurred_at ON public.system_logs USING btree (prefix, occurred_at DESC);


--
-- Name: idx_system_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_request_id ON public.system_logs USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: idx_system_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_user_id ON public.system_logs USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_teacher_settings_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_settings_profile_id ON public.teacher_settings USING btree (profile_id);


--
-- Name: ix_agent_logs_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_agent_logs_agent ON public.agent_execution_logs USING btree (agent_id, "timestamp" DESC);


--
-- Name: ix_agent_logs_successful; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_agent_logs_successful ON public.agent_execution_logs USING btree (successful, "timestamp" DESC);


--
-- Name: ix_agent_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_agent_logs_user ON public.agent_execution_logs USING btree (user_id, "timestamp" DESC);


--
-- Name: ix_ai_conversations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_conversations_active ON public.ai_conversations USING btree (user_id, created_at DESC) WHERE (NOT is_archived);


--
-- Name: ix_ai_conversations_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_conversations_context ON public.ai_conversations USING btree (context_type, context_id);


--
-- Name: ix_ai_conversations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_conversations_user ON public.ai_conversations USING btree (user_id, created_at DESC);


--
-- Name: ix_ai_generations_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_generations_context ON public.ai_generations USING btree (context_entity_type, context_entity_id) WHERE (context_entity_type IS NOT NULL);


--
-- Name: ix_ai_generations_starred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_generations_starred ON public.ai_generations USING btree (user_id, created_at DESC) WHERE (is_starred = true);


--
-- Name: ix_ai_generations_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_generations_type_date ON public.ai_generations USING btree (generation_type, created_at DESC);


--
-- Name: ix_ai_generations_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_generations_user_date ON public.ai_generations USING btree (user_id, created_at DESC);


--
-- Name: ix_ai_generations_user_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_generations_user_type_date ON public.ai_generations USING btree (user_id, generation_type, created_at DESC);


--
-- Name: ix_ai_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_messages_conversation ON public.ai_messages USING btree (conversation_id, created_at);


--
-- Name: ix_ai_prompt_templates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_prompt_templates_active ON public.ai_prompt_templates USING btree (is_active, category) WHERE (is_active = true);


--
-- Name: ix_ai_prompt_templates_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_prompt_templates_category ON public.ai_prompt_templates USING btree (category);


--
-- Name: ix_ai_prompt_templates_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_prompt_templates_user ON public.ai_prompt_templates USING btree (created_by) WHERE (created_by IS NOT NULL);


--
-- Name: ix_ai_usage_stats_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_usage_stats_date ON public.ai_usage_stats USING btree (date DESC);


--
-- Name: ix_ai_usage_stats_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_usage_stats_user_date ON public.ai_usage_stats USING btree (user_id, date DESC);


--
-- Name: ix_api_keys_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_api_keys_active ON public.api_keys USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: ix_api_keys_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_api_keys_hash ON public.api_keys USING btree (key_hash);


--
-- Name: ix_api_keys_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_api_keys_user ON public.api_keys USING btree (user_id);


--
-- Name: ix_assignment_templates_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignment_templates_teacher ON public.assignment_templates USING btree (teacher_id);


--
-- Name: ix_assignments_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignments_deleted_at ON public.assignments USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: ix_assignments_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignments_due_date ON public.assignments USING btree (due_date) WHERE ((deleted_at IS NULL) AND (status <> ALL (ARRAY['completed'::public.assignment_status, 'cancelled'::public.assignment_status])));


--
-- Name: ix_assignments_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignments_lesson ON public.assignments USING btree (lesson_id) WHERE (lesson_id IS NOT NULL);


--
-- Name: ix_assignments_song; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignments_song ON public.assignments USING btree (song_id) WHERE (song_id IS NOT NULL);


--
-- Name: ix_assignments_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignments_student ON public.assignments USING btree (student_id) WHERE (deleted_at IS NULL);


--
-- Name: ix_assignments_student_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignments_student_status ON public.assignments USING btree (student_id, status, due_date) WHERE (deleted_at IS NULL);


--
-- Name: ix_assignments_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignments_teacher ON public.assignments USING btree (teacher_id) WHERE (deleted_at IS NULL);


--
-- Name: ix_assignments_teacher_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignments_teacher_status ON public.assignments USING btree (teacher_id, status, due_date) WHERE (deleted_at IS NULL);


--
-- Name: ix_auth_rate_limits_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_auth_rate_limits_lookup ON public.auth_rate_limits USING btree (identifier, operation, attempted_at DESC);


--
-- Name: ix_chord_srs_student_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_chord_srs_student_due ON public.chord_srs USING btree (student_id, next_review_at);


--
-- Name: ix_in_app_notifications_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_in_app_notifications_entity ON public.in_app_notifications USING btree (entity_type, entity_id) WHERE (entity_type IS NOT NULL);


--
-- Name: ix_in_app_notifications_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_in_app_notifications_expires ON public.in_app_notifications USING btree (expires_at) WHERE (is_read = true);


--
-- Name: ix_in_app_notifications_user_all; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_in_app_notifications_user_all ON public.in_app_notifications USING btree (user_id, created_at DESC);


--
-- Name: ix_in_app_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_in_app_notifications_user_unread ON public.in_app_notifications USING btree (user_id, created_at DESC) WHERE (is_read = false);


--
-- Name: ix_lesson_songs_repertoire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lesson_songs_repertoire ON public.lesson_songs USING btree (repertoire_id) WHERE (repertoire_id IS NOT NULL);


--
-- Name: ix_lesson_songs_song; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lesson_songs_song ON public.lesson_songs USING btree (song_id);


--
-- Name: ix_lesson_songs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lesson_songs_status ON public.lesson_songs USING btree (status);


--
-- Name: ix_lessons_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lessons_deleted_at ON public.lessons USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: ix_lessons_student_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lessons_student_scheduled ON public.lessons USING btree (student_id, scheduled_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: ix_lessons_student_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lessons_student_status ON public.lessons USING btree (student_id, status, scheduled_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: ix_lessons_teacher_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lessons_teacher_scheduled ON public.lessons USING btree (teacher_id, scheduled_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: ix_lessons_teacher_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lessons_teacher_status ON public.lessons USING btree (teacher_id, status, scheduled_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: ix_mv_song_engagement_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_mv_song_engagement_pk ON public.mv_song_engagement USING btree (song_id);


--
-- Name: ix_mv_song_engagement_popularity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mv_song_engagement_popularity ON public.mv_song_engagement USING btree (total_students DESC);


--
-- Name: ix_notification_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_log_entity ON public.notification_log USING btree (entity_type, entity_id) WHERE (entity_type IS NOT NULL);


--
-- Name: ix_notification_log_rate_limit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_log_rate_limit ON public.notification_log USING btree (created_at DESC) WHERE (status = ANY (ARRAY['sent'::public.notification_status, 'pending'::public.notification_status]));


--
-- Name: ix_notification_log_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_log_retry ON public.notification_log USING btree (status, retry_count) WHERE (status = 'failed'::public.notification_status);


--
-- Name: ix_notification_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_log_status ON public.notification_log USING btree (status, created_at DESC);


--
-- Name: ix_notification_log_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_log_type ON public.notification_log USING btree (notification_type, created_at DESC);


--
-- Name: ix_notification_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_log_user ON public.notification_log USING btree (recipient_user_id, created_at DESC);


--
-- Name: ix_notification_preferences_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_preferences_enabled ON public.notification_preferences USING btree (user_id, enabled) WHERE (enabled = true);


--
-- Name: ix_notification_preferences_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_preferences_type ON public.notification_preferences USING btree (notification_type);


--
-- Name: ix_notification_preferences_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_preferences_user ON public.notification_preferences USING btree (user_id);


--
-- Name: ix_notification_queue_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_queue_priority ON public.notification_queue USING btree (priority DESC, scheduled_for) WHERE (status = 'pending'::public.notification_status);


--
-- Name: ix_notification_queue_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_queue_scheduled ON public.notification_queue USING btree (scheduled_for) WHERE (status = 'pending'::public.notification_status);


--
-- Name: ix_notification_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_queue_status ON public.notification_queue USING btree (status);


--
-- Name: ix_notification_queue_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_queue_user ON public.notification_queue USING btree (recipient_user_id);


--
-- Name: ix_practice_sessions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_practice_sessions_date ON public.practice_sessions USING btree (created_at DESC);


--
-- Name: ix_practice_sessions_song; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_practice_sessions_song ON public.practice_sessions USING btree (song_id) WHERE (song_id IS NOT NULL);


--
-- Name: ix_practice_sessions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_practice_sessions_student ON public.practice_sessions USING btree (student_id, created_at DESC);


--
-- Name: ix_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_email ON public.profiles USING btree (email);


--
-- Name: ix_profiles_invite_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_invite_email ON public.profiles USING btree (invite_email) WHERE (invite_email IS NOT NULL);


--
-- Name: ix_profiles_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_is_active ON public.profiles USING btree (is_active) WHERE (is_active = true);


--
-- Name: ix_profiles_is_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_is_admin ON public.profiles USING btree (is_admin) WHERE (is_admin = true);


--
-- Name: ix_profiles_is_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_is_parent ON public.profiles USING btree (is_parent) WHERE (is_parent = true);


--
-- Name: ix_profiles_is_shadow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_is_shadow ON public.profiles USING btree (is_shadow) WHERE (is_shadow = true);


--
-- Name: ix_profiles_is_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_is_student ON public.profiles USING btree (is_student) WHERE (is_student = true);


--
-- Name: ix_profiles_is_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_is_teacher ON public.profiles USING btree (is_teacher) WHERE (is_teacher = true);


--
-- Name: ix_profiles_onboarding_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_onboarding_completed ON public.profiles USING btree (onboarding_completed) WHERE ((onboarding_completed = false) AND (is_student = true));


--
-- Name: ix_profiles_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_parent_id ON public.profiles USING btree (parent_id);


--
-- Name: ix_song_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_song_requests_status ON public.song_requests USING btree (status);


--
-- Name: ix_song_requests_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_song_requests_student_id ON public.song_requests USING btree (student_id);


--
-- Name: ix_songs_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_songs_author ON public.songs USING btree (author);


--
-- Name: ix_songs_author_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_songs_author_trgm ON public.songs USING gin (author public.gin_trgm_ops);


--
-- Name: ix_songs_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_songs_deleted_at ON public.songs USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: ix_songs_is_draft; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_songs_is_draft ON public.songs USING btree (is_draft) WHERE (is_draft = true);


--
-- Name: ix_songs_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_songs_search ON public.songs USING gin (search_vector);


--
-- Name: ix_songs_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_songs_title ON public.songs USING btree (title) WHERE (deleted_at IS NULL);


--
-- Name: ix_songs_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_songs_title_trgm ON public.songs USING gin (title public.gin_trgm_ops);


--
-- Name: ix_sotw_active_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sotw_active_from ON public.song_of_the_week USING btree (active_from DESC);


--
-- Name: ix_sotw_song_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sotw_song_id ON public.song_of_the_week USING btree (song_id);


--
-- Name: ix_spotify_matches_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_spotify_matches_pending ON public.spotify_matches USING btree (created_at DESC) WHERE (status = 'pending'::public.spotify_match_status);


--
-- Name: ix_spotify_matches_song; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_spotify_matches_song ON public.spotify_matches USING btree (song_id);


--
-- Name: ix_spotify_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_spotify_matches_status ON public.spotify_matches USING btree (status);


--
-- Name: ix_spotify_matches_status_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_spotify_matches_status_confidence ON public.spotify_matches USING btree (status, confidence_score DESC);


--
-- Name: ix_student_repertoire_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_repertoire_priority ON public.student_repertoire USING btree (student_id, priority, sort_order);


--
-- Name: ix_student_repertoire_song; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_repertoire_song ON public.student_repertoire USING btree (song_id);


--
-- Name: ix_student_repertoire_song_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_repertoire_song_status ON public.student_repertoire USING btree (song_id, current_status);


--
-- Name: ix_student_repertoire_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_repertoire_student ON public.student_repertoire USING btree (student_id);


--
-- Name: ix_student_repertoire_student_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_repertoire_student_active ON public.student_repertoire USING btree (student_id, is_active) WHERE (is_active = true);


--
-- Name: ix_student_repertoire_student_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_repertoire_student_status ON public.student_repertoire USING btree (student_id, current_status);


--
-- Name: ix_theoretical_course_access_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_theoretical_course_access_course ON public.theoretical_course_access USING btree (course_id);


--
-- Name: ix_theoretical_course_access_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_theoretical_course_access_user ON public.theoretical_course_access USING btree (user_id);


--
-- Name: ix_theoretical_courses_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_theoretical_courses_created_by ON public.theoretical_courses USING btree (created_by) WHERE (deleted_at IS NULL);


--
-- Name: ix_theoretical_courses_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_theoretical_courses_published ON public.theoretical_courses USING btree (is_published, sort_order) WHERE (deleted_at IS NULL);


--
-- Name: ix_theoretical_lessons_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_theoretical_lessons_course ON public.theoretical_lessons USING btree (course_id, sort_order) WHERE (deleted_at IS NULL);


--
-- Name: ix_theoretical_lessons_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_theoretical_lessons_published ON public.theoretical_lessons USING btree (course_id, is_published, sort_order) WHERE (deleted_at IS NULL);


--
-- Name: ix_user_integrations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_integrations_user ON public.user_integrations USING btree (user_id);


--
-- Name: ix_user_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_preferences_user_id ON public.user_preferences USING btree (user_id);


--
-- Name: ix_webhook_subscriptions_expiration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_webhook_subscriptions_expiration ON public.webhook_subscriptions USING btree (expiration);


--
-- Name: ix_webhook_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_webhook_subscriptions_user ON public.webhook_subscriptions USING btree (user_id);


--
-- Name: lesson_songs_lesson_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lesson_songs_lesson_id_idx ON public.lesson_songs USING btree (lesson_id);


--
-- Name: lesson_songs_song_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lesson_songs_song_id_idx ON public.lesson_songs USING btree (song_id);


--
-- Name: lessons_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lessons_student_id_idx ON public.lessons USING btree (student_id);


--
-- Name: lessons_teacher_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lessons_teacher_id_idx ON public.lessons USING btree (teacher_id);


--
-- Name: mv_song_popularity_level_times_assigned_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_song_popularity_level_times_assigned_idx ON public.mv_song_popularity USING btree (level, times_assigned DESC);


--
-- Name: mv_song_popularity_song_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_song_popularity_song_id_idx ON public.mv_song_popularity USING btree (song_id);


--
-- Name: mv_song_popularity_times_assigned_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mv_song_popularity_times_assigned_idx ON public.mv_song_popularity USING btree (times_assigned DESC);


--
-- Name: profiles_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_email_idx ON public.profiles USING btree (email);


--
-- Name: songs_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX songs_author_idx ON public.songs USING btree (author);


--
-- Name: songs_title_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX songs_title_idx ON public.songs USING btree (title);


--
-- Name: uq_profiles_invite_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_profiles_invite_email ON public.profiles USING btree (invite_email) WHERE (invite_email IS NOT NULL);


--
-- Name: INDEX uq_profiles_invite_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.uq_profiles_invite_email IS 'SHADOW-001 / ADR 0002. Guarantees at most one profile per invite_email so shadow→real linking is deterministic.';


--
-- Name: uq_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_profiles_user_id ON public.profiles USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: uq_sotw_active_per_category; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sotw_active_per_category ON public.song_of_the_week USING btree (category, is_active) WHERE (is_active = true);


--
-- Name: user_roles_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_roles_role_idx ON public.user_roles USING btree (role);


--
-- Name: user_roles_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_roles_user_id_idx ON public.user_roles USING btree (user_id);


--
-- Name: audit_log_2026_01_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_01_action_created_at_idx;


--
-- Name: audit_log_2026_01_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_01_actor_id_created_at_idx;


--
-- Name: audit_log_2026_01_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_01_created_at_idx;


--
-- Name: audit_log_2026_01_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_01_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_01_pkey;


--
-- Name: audit_log_2026_02_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_02_action_created_at_idx;


--
-- Name: audit_log_2026_02_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_02_actor_id_created_at_idx;


--
-- Name: audit_log_2026_02_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_02_created_at_idx;


--
-- Name: audit_log_2026_02_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_02_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_02_pkey;


--
-- Name: audit_log_2026_03_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_03_action_created_at_idx;


--
-- Name: audit_log_2026_03_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_03_actor_id_created_at_idx;


--
-- Name: audit_log_2026_03_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_03_created_at_idx;


--
-- Name: audit_log_2026_03_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_03_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_03_pkey;


--
-- Name: audit_log_2026_04_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_04_action_created_at_idx;


--
-- Name: audit_log_2026_04_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_04_actor_id_created_at_idx;


--
-- Name: audit_log_2026_04_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_04_created_at_idx;


--
-- Name: audit_log_2026_04_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_04_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_04_pkey;


--
-- Name: audit_log_2026_05_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_05_action_created_at_idx;


--
-- Name: audit_log_2026_05_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_05_actor_id_created_at_idx;


--
-- Name: audit_log_2026_05_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_05_created_at_idx;


--
-- Name: audit_log_2026_05_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_05_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_05_pkey;


--
-- Name: audit_log_2026_06_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_06_action_created_at_idx;


--
-- Name: audit_log_2026_06_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_06_actor_id_created_at_idx;


--
-- Name: audit_log_2026_06_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_06_created_at_idx;


--
-- Name: audit_log_2026_06_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_06_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_06_pkey;


--
-- Name: audit_log_2026_07_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_07_action_created_at_idx;


--
-- Name: audit_log_2026_07_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_07_actor_id_created_at_idx;


--
-- Name: audit_log_2026_07_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_07_created_at_idx;


--
-- Name: audit_log_2026_07_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_07_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_07_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_07_pkey;


--
-- Name: audit_log_2026_08_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_08_action_created_at_idx;


--
-- Name: audit_log_2026_08_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_08_actor_id_created_at_idx;


--
-- Name: audit_log_2026_08_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_08_created_at_idx;


--
-- Name: audit_log_2026_08_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_08_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_08_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_08_pkey;


--
-- Name: audit_log_2026_09_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_09_action_created_at_idx;


--
-- Name: audit_log_2026_09_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_09_actor_id_created_at_idx;


--
-- Name: audit_log_2026_09_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_09_created_at_idx;


--
-- Name: audit_log_2026_09_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_09_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_09_pkey;


--
-- Name: audit_log_2026_10_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_10_action_created_at_idx;


--
-- Name: audit_log_2026_10_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_10_actor_id_created_at_idx;


--
-- Name: audit_log_2026_10_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_10_created_at_idx;


--
-- Name: audit_log_2026_10_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_10_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_10_pkey;


--
-- Name: audit_log_2026_11_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_11_action_created_at_idx;


--
-- Name: audit_log_2026_11_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_11_actor_id_created_at_idx;


--
-- Name: audit_log_2026_11_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_11_created_at_idx;


--
-- Name: audit_log_2026_11_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_11_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_11_pkey;


--
-- Name: audit_log_2026_12_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_2026_12_action_created_at_idx;


--
-- Name: audit_log_2026_12_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_2026_12_actor_id_created_at_idx;


--
-- Name: audit_log_2026_12_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_2026_12_created_at_idx;


--
-- Name: audit_log_2026_12_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_2026_12_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_2026_12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_2026_12_pkey;


--
-- Name: audit_log_default_action_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_action ATTACH PARTITION public.audit_log_default_action_created_at_idx;


--
-- Name: audit_log_default_actor_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_actor ATTACH PARTITION public.audit_log_default_actor_id_created_at_idx;


--
-- Name: audit_log_default_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_created_at ATTACH PARTITION public.audit_log_default_created_at_idx;


--
-- Name: audit_log_default_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.ix_audit_log_entity ATTACH PARTITION public.audit_log_default_entity_type_entity_id_created_at_idx;


--
-- Name: audit_log_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_log_pkey ATTACH PARTITION public.audit_log_default_pkey;


--
-- Name: content_posts content_posts_sync_published_flag; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER content_posts_sync_published_flag AFTER INSERT OR DELETE OR UPDATE OF status, song_video_id, platform ON public.content_posts FOR EACH ROW EXECUTE FUNCTION public.sync_song_video_published_flag();


--
-- Name: song_of_the_week handle_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.song_of_the_week FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_integrations handle_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: webhook_subscriptions handle_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_posts set_content_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_content_posts_updated_at BEFORE UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hashtag_sets set_hashtag_sets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_hashtag_sets_updated_at BEFORE UPDATE ON public.hashtag_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: song_videos set_song_videos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_song_videos_updated_at BEFORE UPDATE ON public.song_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_conversations tr_ai_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ai_prompt_templates tr_ai_prompt_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_ai_prompt_templates_updated_at BEFORE UPDATE ON public.ai_prompt_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ai_usage_stats tr_ai_usage_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_ai_usage_stats_updated_at BEFORE UPDATE ON public.ai_usage_stats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: api_keys tr_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: assignments tr_assignment_history_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_assignment_history_status AFTER INSERT OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.tr_assignment_history_status();


--
-- Name: assignment_templates tr_assignment_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_assignment_templates_updated_at BEFORE UPDATE ON public.assignment_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: assignments tr_assignments_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_assignments_audit AFTER INSERT OR DELETE OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.tr_audit_assignments();


--
-- Name: assignments tr_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: in_app_notifications tr_in_app_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_in_app_notifications_updated_at BEFORE UPDATE ON public.in_app_notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles tr_initialize_notification_preferences; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_initialize_notification_preferences AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.initialize_notification_preferences();


--
-- Name: lesson_songs tr_lesson_songs_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lesson_songs_audit AFTER INSERT OR UPDATE ON public.lesson_songs FOR EACH ROW EXECUTE FUNCTION public.tr_audit_song_progress();


--
-- Name: lesson_songs tr_lesson_songs_notify_mastery; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lesson_songs_notify_mastery AFTER UPDATE ON public.lesson_songs FOR EACH ROW EXECUTE FUNCTION public.tr_notify_song_mastery();


--
-- Name: lesson_songs tr_lesson_songs_sync_on_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lesson_songs_sync_on_insert BEFORE INSERT ON public.lesson_songs FOR EACH ROW EXECUTE FUNCTION public.fn_sync_lesson_song_to_repertoire();


--
-- Name: lesson_songs tr_lesson_songs_sync_on_status_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lesson_songs_sync_on_status_update BEFORE UPDATE OF status ON public.lesson_songs FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION public.fn_sync_lesson_song_to_repertoire();


--
-- Name: lesson_songs tr_lesson_songs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lesson_songs_updated_at BEFORE UPDATE ON public.lesson_songs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lessons tr_lessons_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lessons_audit AFTER INSERT OR DELETE OR UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.tr_audit_lessons();


--
-- Name: lessons tr_lessons_notify_cancelled; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lessons_notify_cancelled AFTER UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.tr_notify_lesson_cancelled();


--
-- Name: lessons tr_lessons_notify_completed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lessons_notify_completed AFTER UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.tr_notify_lesson_completed();


--
-- Name: lessons tr_lessons_notify_rescheduled; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lessons_notify_rescheduled AFTER UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.tr_notify_lesson_rescheduled();


--
-- Name: lessons tr_lessons_set_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lessons_set_number BEFORE INSERT ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_lesson_number();


--
-- Name: lessons tr_lessons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notification_log tr_notification_log_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_notification_log_updated BEFORE UPDATE ON public.notification_log FOR EACH ROW EXECUTE FUNCTION public.update_notification_timestamp();


--
-- Name: notification_preferences tr_notification_preferences_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_notification_preferences_updated BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_timestamp();


--
-- Name: notification_queue tr_notification_queue_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_notification_queue_updated BEFORE UPDATE ON public.notification_queue FOR EACH ROW EXECUTE FUNCTION public.update_notification_timestamp();


--
-- Name: practice_sessions tr_practice_sessions_aggregate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_practice_sessions_aggregate AFTER INSERT ON public.practice_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_aggregate_practice_to_repertoire();


--
-- Name: TRIGGER tr_practice_sessions_aggregate ON practice_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER tr_practice_sessions_aggregate ON public.practice_sessions IS 'Aggregates practice session metrics into student_repertoire (the SSOT table).';


--
-- Name: practice_sessions tr_practice_sessions_reverse_progress; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_practice_sessions_reverse_progress AFTER DELETE ON public.practice_sessions FOR EACH ROW EXECUTE FUNCTION public.reverse_song_progress_from_practice();


--
-- Name: practice_sessions tr_practice_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_practice_sessions_updated_at BEFORE UPDATE ON public.practice_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles tr_profiles_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_profiles_audit AFTER INSERT OR DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tr_audit_profiles();


--
-- Name: profiles tr_profiles_notify_welcome; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_profiles_notify_welcome AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tr_notify_student_welcome();


--
-- Name: profiles tr_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: songs tr_songs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_songs_updated_at BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: spotify_matches tr_spotify_matches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_spotify_matches_updated_at BEFORE UPDATE ON public.spotify_matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: student_repertoire tr_student_repertoire_record_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_student_repertoire_record_history AFTER UPDATE OF current_status ON public.student_repertoire FOR EACH ROW EXECUTE FUNCTION public.fn_record_progress_history();


--
-- Name: student_repertoire tr_student_repertoire_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_student_repertoire_updated_at BEFORE UPDATE ON public.student_repertoire FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: theoretical_courses tr_theoretical_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_theoretical_courses_updated_at BEFORE UPDATE ON public.theoretical_courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: theoretical_lessons tr_theoretical_lessons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_theoretical_lessons_updated_at BEFORE UPDATE ON public.theoretical_lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_integrations tr_user_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_user_integrations_updated_at BEFORE UPDATE ON public.user_integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: webhook_subscriptions tr_webhook_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_webhook_subscriptions_updated_at BEFORE UPDATE ON public.webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: assignment_templates trg_assignment_templates_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assignment_templates_set_updated_at BEFORE UPDATE ON public.assignment_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: assignments trg_assignments_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assignments_set_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lesson_songs trg_lesson_songs_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lesson_songs_set_updated_at BEFORE UPDATE ON public.lesson_songs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lessons trg_lessons_set_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lessons_set_number BEFORE INSERT ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_lesson_number();


--
-- Name: lessons trg_lessons_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lessons_set_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles trg_profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: song_requests trg_song_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_song_requests_updated_at BEFORE UPDATE ON public.song_requests FOR EACH ROW EXECUTE FUNCTION public.update_song_requests_updated_at();


--
-- Name: songs trg_songs_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_songs_set_updated_at BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: teacher_settings trg_teacher_settings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_teacher_settings_set_updated_at BEFORE UPDATE ON public.teacher_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lessons trigger_set_lesson_numbers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_lesson_numbers BEFORE INSERT ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_lesson_numbers();


--
-- Name: sync_conflicts trigger_update_sync_conflicts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_sync_conflicts_updated_at BEFORE UPDATE ON public.sync_conflicts FOR EACH ROW EXECUTE FUNCTION public.update_sync_conflicts_updated_at();


--
-- Name: ai_generations trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.ai_generations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lesson_songs trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.lesson_songs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lessons trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: songs trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_management trigger_update_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.task_management FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assignment_templates update_assignment_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assignment_templates_updated_at BEFORE UPDATE ON public.assignment_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: skills update_skills_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: student_skills update_student_skills_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_student_skills_updated_at BEFORE UPDATE ON public.student_skills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: agent_execution_logs agent_execution_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_execution_logs
    ADD CONSTRAINT agent_execution_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ai_conversations ai_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ai_generations ai_generations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generations
    ADD CONSTRAINT ai_generations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ai_messages ai_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;


--
-- Name: ai_prompt_templates ai_prompt_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_usage_stats ai_usage_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_stats
    ADD CONSTRAINT ai_usage_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: apple_shortcut_song_import_log apple_shortcut_song_import_log_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apple_shortcut_song_import_log
    ADD CONSTRAINT apple_shortcut_song_import_log_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE SET NULL;


--
-- Name: apple_shortcut_song_import_log apple_shortcut_song_import_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apple_shortcut_song_import_log
    ADD CONSTRAINT apple_shortcut_song_import_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: assignment_history assignment_history_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_history
    ADD CONSTRAINT assignment_history_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_templates assignment_templates_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_templates
    ADD CONSTRAINT assignment_templates_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;


--
-- Name: assignments assignments_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE SET NULL;


--
-- Name: assignments assignments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignments assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: chord_quiz_attempts chord_quiz_attempts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chord_quiz_attempts
    ADD CONSTRAINT chord_quiz_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: chord_srs chord_srs_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chord_srs
    ADD CONSTRAINT chord_srs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: content_post_metrics content_post_metrics_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_post_metrics
    ADD CONSTRAINT content_post_metrics_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.content_posts(id) ON DELETE CASCADE;


--
-- Name: content_posts content_posts_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_posts
    ADD CONSTRAINT content_posts_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;


--
-- Name: content_posts content_posts_song_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_posts
    ADD CONSTRAINT content_posts_song_video_id_fkey FOREIGN KEY (song_video_id) REFERENCES public.song_videos(id) ON DELETE SET NULL;


--
-- Name: drive_files drive_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_files
    ADD CONSTRAINT drive_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: in_app_notifications in_app_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: lesson_songs lesson_songs_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_songs
    ADD CONSTRAINT lesson_songs_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_songs lesson_songs_repertoire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_songs
    ADD CONSTRAINT lesson_songs_repertoire_id_fkey FOREIGN KEY (repertoire_id) REFERENCES public.student_repertoire(id) ON DELETE SET NULL;


--
-- Name: lesson_songs lesson_songs_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_songs
    ADD CONSTRAINT lesson_songs_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lessons lessons_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notification_log notification_log_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notification_queue notification_queue_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: practice_sessions practice_sessions_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_sessions
    ADD CONSTRAINT practice_sessions_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE SET NULL;


--
-- Name: practice_sessions practice_sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_sessions
    ADD CONSTRAINT practice_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: song_of_the_week song_of_the_week_selected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_of_the_week
    ADD CONSTRAINT song_of_the_week_selected_by_fkey FOREIGN KEY (selected_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: song_of_the_week song_of_the_week_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_of_the_week
    ADD CONSTRAINT song_of_the_week_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;


--
-- Name: song_requests song_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_requests
    ADD CONSTRAINT song_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: song_requests song_requests_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_requests
    ADD CONSTRAINT song_requests_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id);


--
-- Name: song_requests song_requests_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_requests
    ADD CONSTRAINT song_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: song_status_history song_status_history_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_status_history
    ADD CONSTRAINT song_status_history_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;


--
-- Name: song_status_history song_status_history_student_id_profiles_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_status_history
    ADD CONSTRAINT song_status_history_student_id_profiles_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: song_videos song_videos_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_videos
    ADD CONSTRAINT song_videos_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;


--
-- Name: song_videos song_videos_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_videos
    ADD CONSTRAINT song_videos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: spotify_matches spotify_matches_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_matches
    ADD CONSTRAINT spotify_matches_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: spotify_matches spotify_matches_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spotify_matches
    ADD CONSTRAINT spotify_matches_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;


--
-- Name: student_repertoire student_repertoire_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_repertoire
    ADD CONSTRAINT student_repertoire_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: student_repertoire student_repertoire_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_repertoire
    ADD CONSTRAINT student_repertoire_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;


--
-- Name: student_repertoire student_repertoire_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_repertoire
    ADD CONSTRAINT student_repertoire_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: student_skills student_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: student_skills student_skills_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sync_conflicts sync_conflicts_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: system_logs system_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: task_management task_management_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_management
    ADD CONSTRAINT task_management_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: teacher_settings teacher_settings_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_settings
    ADD CONSTRAINT teacher_settings_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: theoretical_course_access theoretical_course_access_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theoretical_course_access
    ADD CONSTRAINT theoretical_course_access_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.theoretical_courses(id) ON DELETE CASCADE;


--
-- Name: theoretical_course_access theoretical_course_access_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theoretical_course_access
    ADD CONSTRAINT theoretical_course_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: theoretical_course_access theoretical_course_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theoretical_course_access
    ADD CONSTRAINT theoretical_course_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: theoretical_courses theoretical_courses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theoretical_courses
    ADD CONSTRAINT theoretical_courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: theoretical_lessons theoretical_lessons_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theoretical_lessons
    ADD CONSTRAINT theoretical_lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.theoretical_courses(id) ON DELETE CASCADE;


--
-- Name: user_integrations user_integrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_integrations
    ADD CONSTRAINT user_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: webhook_subscriptions webhook_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: skills Admins and teachers can manage skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and teachers can manage skills" ON public.skills USING (public.is_admin_or_teacher());


--
-- Name: student_skills Admins and teachers can manage student skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and teachers can manage student skills" ON public.student_skills USING (public.is_admin_or_teacher());


--
-- Name: chord_quiz_attempts Admins and teachers can view all chord quiz attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and teachers can view all chord quiz attempts" ON public.chord_quiz_attempts FOR SELECT USING (public.is_admin_or_teacher());


--
-- Name: student_skills Admins and teachers can view all student skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and teachers can view all student skills" ON public.student_skills FOR SELECT USING (public.is_admin_or_teacher());


--
-- Name: song_of_the_week Admins can delete SOTW; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete SOTW" ON public.song_of_the_week FOR DELETE TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: song_of_the_week Admins can insert SOTW; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert SOTW" ON public.song_of_the_week FOR INSERT TO authenticated WITH CHECK (( SELECT public.is_admin() AS is_admin));


--
-- Name: user_preferences Admins can read all preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all preferences" ON public.user_preferences FOR SELECT TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: song_of_the_week Admins can update SOTW; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update SOTW" ON public.song_of_the_week FOR UPDATE TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: auth_events Admins can view auth events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view auth events" ON public.auth_events FOR SELECT USING (public.is_admin());


--
-- Name: song_of_the_week Authenticated users can view SOTW; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view SOTW" ON public.song_of_the_week FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: skills Everyone can view skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view skills" ON public.skills FOR SELECT USING (true);


--
-- Name: chord_srs Staff read all SRS state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read all SRS state" ON public.chord_srs FOR SELECT USING (public.is_admin_or_teacher());


--
-- Name: song_requests Students can create requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can create requests" ON public.song_requests FOR INSERT TO authenticated WITH CHECK ((( SELECT public.current_profile_id() AS current_profile_id) = student_id));


--
-- Name: chord_quiz_attempts Students can insert their own chord quiz attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can insert their own chord quiz attempts" ON public.chord_quiz_attempts FOR INSERT TO authenticated WITH CHECK ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: song_status_history Students can insert their own song status changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can insert their own song status changes" ON public.song_status_history FOR INSERT TO authenticated WITH CHECK ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: song_requests Students can read own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can read own requests" ON public.song_requests FOR SELECT TO authenticated USING ((( SELECT public.current_profile_id() AS current_profile_id) = student_id));


--
-- Name: chord_quiz_attempts Students can view their own chord quiz attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own chord quiz attempts" ON public.chord_quiz_attempts FOR SELECT TO authenticated USING ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: student_skills Students can view their own skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own skills" ON public.student_skills FOR SELECT TO authenticated USING ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: song_status_history Students can view their own song status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own song status history" ON public.song_status_history FOR SELECT TO authenticated USING ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: chord_srs Students insert own SRS state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students insert own SRS state" ON public.chord_srs FOR INSERT TO authenticated WITH CHECK ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: chord_srs Students read own SRS state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students read own SRS state" ON public.chord_srs FOR SELECT TO authenticated USING ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: chord_srs Students update own SRS state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students update own SRS state" ON public.chord_srs FOR UPDATE TO authenticated USING ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: song_status_history Teachers and admins can view all song status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers and admins can view all song status history" ON public.song_status_history FOR SELECT TO authenticated USING (( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher));


--
-- Name: song_requests Teachers can read all requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can read all requests" ON public.song_requests FOR SELECT TO authenticated USING (( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher));


--
-- Name: song_requests Teachers can update requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can update requests" ON public.song_requests FOR UPDATE TO authenticated USING (( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher));


--
-- Name: api_keys Users can create their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own API keys" ON public.api_keys FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: api_keys Users can delete their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own API keys" ON public.api_keys FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_integrations Users can delete their own integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own integrations" ON public.user_integrations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: webhook_subscriptions Users can delete their own webhook subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own webhook subscriptions" ON public.webhook_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: apple_shortcut_song_import_log Users can insert own import logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own import logs" ON public.apple_shortcut_song_import_log FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_preferences Users can insert own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK ((( SELECT public.current_profile_id() AS current_profile_id) = user_id));


--
-- Name: user_integrations Users can insert their own integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own integrations" ON public.user_integrations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: webhook_subscriptions Users can insert their own webhook subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own webhook subscriptions" ON public.webhook_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: apple_shortcut_song_import_log Users can read own import logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own import logs" ON public.apple_shortcut_song_import_log FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users can read own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own preferences" ON public.user_preferences FOR SELECT TO authenticated USING ((( SELECT public.current_profile_id() AS current_profile_id) = user_id));


--
-- Name: user_preferences Users can update own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE TO authenticated USING ((( SELECT public.current_profile_id() AS current_profile_id) = user_id)) WITH CHECK ((( SELECT public.current_profile_id() AS current_profile_id) = user_id));


--
-- Name: api_keys Users can update their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own API keys" ON public.api_keys FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_integrations Users can update their own integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own integrations" ON public.user_integrations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: webhook_subscriptions Users can update their own webhook subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own webhook subscriptions" ON public.webhook_subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: api_keys Users can view their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own API keys" ON public.api_keys FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_integrations Users can view their own integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own integrations" ON public.user_integrations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: webhook_subscriptions Users can view their own webhook subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own webhook subscriptions" ON public.webhook_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: agent_execution_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_execution_logs agent_logs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_logs_insert ON public.agent_execution_logs FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: agent_execution_logs agent_logs_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_logs_select_admin ON public.agent_execution_logs FOR SELECT USING (public.is_admin());


--
-- Name: agent_execution_logs agent_logs_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_logs_select_own ON public.agent_execution_logs FOR SELECT TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_conversations ai_conversations_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_conversations_delete ON public.ai_conversations FOR DELETE TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_conversations ai_conversations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_conversations_insert ON public.ai_conversations FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_conversations ai_conversations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_conversations_select ON public.ai_conversations FOR SELECT TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_conversations ai_conversations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_conversations_update ON public.ai_conversations FOR UPDATE TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_generations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_generations ai_generations_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_generations_delete_admin ON public.ai_generations FOR DELETE USING (public.is_admin());


--
-- Name: ai_generations ai_generations_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_generations_delete_own ON public.ai_generations FOR DELETE TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_generations ai_generations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_generations_insert ON public.ai_generations FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_generations ai_generations_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_generations_select_admin ON public.ai_generations FOR SELECT USING (public.is_admin());


--
-- Name: ai_generations ai_generations_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_generations_select_own ON public.ai_generations FOR SELECT TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_generations ai_generations_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_generations_update_own ON public.ai_generations FOR UPDATE TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_messages ai_messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_messages_insert ON public.ai_messages FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ai_conversations
  WHERE ((ai_conversations.id = ai_messages.conversation_id) AND (ai_conversations.user_id = ( SELECT public.current_profile_id() AS current_profile_id))))));


--
-- Name: ai_messages ai_messages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_messages_select ON public.ai_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.ai_conversations
  WHERE ((ai_conversations.id = ai_messages.conversation_id) AND (ai_conversations.user_id = ( SELECT public.current_profile_id() AS current_profile_id))))));


--
-- Name: ai_messages ai_messages_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_messages_update ON public.ai_messages FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.ai_conversations
  WHERE ((ai_conversations.id = ai_messages.conversation_id) AND (ai_conversations.user_id = ( SELECT public.current_profile_id() AS current_profile_id))))));


--
-- Name: ai_prompt_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_prompt_templates ai_prompt_templates_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_prompt_templates_delete ON public.ai_prompt_templates FOR DELETE TO authenticated USING ((((created_by = ( SELECT public.current_profile_id() AS current_profile_id)) AND (is_system = false)) OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: ai_prompt_templates ai_prompt_templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_prompt_templates_insert ON public.ai_prompt_templates FOR INSERT TO authenticated WITH CHECK (((created_by = ( SELECT public.current_profile_id() AS current_profile_id)) AND (is_system = false)));


--
-- Name: ai_prompt_templates ai_prompt_templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_prompt_templates_select ON public.ai_prompt_templates FOR SELECT TO authenticated USING (((is_system = true) OR (created_by = ( SELECT public.current_profile_id() AS current_profile_id)) OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: ai_prompt_templates ai_prompt_templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_prompt_templates_update ON public.ai_prompt_templates FOR UPDATE TO authenticated USING ((((created_by = ( SELECT public.current_profile_id() AS current_profile_id)) AND (is_system = false)) OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: ai_usage_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage_stats ai_usage_stats_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_usage_stats_insert ON public.ai_usage_stats FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_usage_stats ai_usage_stats_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_usage_stats_select_admin ON public.ai_usage_stats FOR SELECT USING (public.is_admin());


--
-- Name: ai_usage_stats ai_usage_stats_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_usage_stats_select_own ON public.ai_usage_stats FOR SELECT TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: ai_usage_stats ai_usage_stats_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_usage_stats_update ON public.ai_usage_stats FOR UPDATE TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys api_keys_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY api_keys_delete ON public.api_keys FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: api_keys api_keys_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY api_keys_insert ON public.api_keys FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: api_keys api_keys_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY api_keys_select ON public.api_keys FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: api_keys api_keys_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY api_keys_update ON public.api_keys FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: apple_shortcut_song_import_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.apple_shortcut_song_import_log ENABLE ROW LEVEL SECURITY;

--
-- Name: assignment_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;

--
-- Name: assignment_history assignment_history_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignment_history_select_own ON public.assignment_history FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (EXISTS ( SELECT 1
   FROM public.assignments a
  WHERE ((a.id = assignment_history.assignment_id) AND ((a.teacher_id = ( SELECT public.current_profile_id() AS current_profile_id)) OR (a.student_id = ( SELECT public.current_profile_id() AS current_profile_id))))))));


--
-- Name: assignment_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: assignment_templates assignment_templates_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignment_templates_delete ON public.assignment_templates FOR DELETE TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: assignment_templates assignment_templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignment_templates_insert ON public.assignment_templates FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (( SELECT public.is_teacher() AS is_teacher) AND (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id)))));


--
-- Name: assignment_templates assignment_templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignment_templates_select ON public.assignment_templates FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: assignment_templates assignment_templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignment_templates_update ON public.assignment_templates FOR UPDATE TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id)))) WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: assignments assignments_delete_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignments_delete_teacher ON public.assignments FOR DELETE TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: assignments assignments_insert_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignments_insert_teacher ON public.assignments FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (( SELECT public.is_teacher() AS is_teacher) AND (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id)))));


--
-- Name: assignments assignments_select_parent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignments_select_parent ON public.assignments FOR SELECT TO authenticated USING (public.is_child_of_parent(student_id));


--
-- Name: assignments assignments_select_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignments_select_participant ON public.assignments FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id)) OR (student_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: assignments assignments_update_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assignments_update_teacher ON public.assignments FOR UPDATE TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id)))) WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_01; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_01 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_02; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_02 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_03; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_03 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_04; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_04 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_05; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_05 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_06; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_06 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_07; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_07 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_08; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_08 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_09; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_09 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_10; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_10 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_11; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_11 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_2026_12; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_2026_12 ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log_default; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log_default ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_log_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_log_select_admin ON public.audit_log FOR SELECT USING (public.is_admin());


--
-- Name: audit_log audit_log_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_log_select_own ON public.audit_log FOR SELECT TO authenticated USING ((actor_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: auth_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_rate_limits auth_rate_limits_service_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_rate_limits_service_only ON public.auth_rate_limits USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: chord_quiz_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chord_quiz_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: chord_srs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chord_srs ENABLE ROW LEVEL SECURITY;

--
-- Name: content_post_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_post_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: content_post_metrics content_post_metrics_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY content_post_metrics_delete ON public.content_post_metrics FOR DELETE TO authenticated USING (public.is_admin_or_teacher());


--
-- Name: content_post_metrics content_post_metrics_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY content_post_metrics_insert ON public.content_post_metrics FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_teacher());


--
-- Name: content_post_metrics content_post_metrics_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY content_post_metrics_select ON public.content_post_metrics FOR SELECT TO authenticated USING (public.is_admin_or_teacher());


--
-- Name: content_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: content_posts content_posts_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY content_posts_delete ON public.content_posts FOR DELETE TO authenticated USING (public.is_admin_or_teacher());


--
-- Name: content_posts content_posts_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY content_posts_insert ON public.content_posts FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_teacher());


--
-- Name: content_posts content_posts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY content_posts_select ON public.content_posts FOR SELECT TO authenticated USING (public.is_admin_or_teacher());


--
-- Name: content_posts content_posts_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY content_posts_update ON public.content_posts FOR UPDATE TO authenticated USING (public.is_admin_or_teacher()) WITH CHECK (public.is_admin_or_teacher());


--
-- Name: task_management delete_task_management_user_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delete_task_management_user_or_admin ON public.task_management FOR DELETE TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (user_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: drive_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;

--
-- Name: drive_files drive_files_delete_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drive_files_delete_staff ON public.drive_files FOR DELETE TO authenticated USING (( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher));


--
-- Name: drive_files drive_files_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drive_files_insert_staff ON public.drive_files FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher) AND (uploaded_by = ( SELECT auth.uid() AS uid))));


--
-- Name: drive_files drive_files_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drive_files_select_staff ON public.drive_files FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND ( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher)));


--
-- Name: drive_files drive_files_select_student; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drive_files_select_student ON public.drive_files FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND ( SELECT public.is_student() AS is_student) AND (((visibility)::text = 'public'::text) OR (((visibility)::text = 'students'::text) AND ((((entity_type)::text = 'lesson'::text) AND (EXISTS ( SELECT 1
   FROM public.lessons
  WHERE ((lessons.id = drive_files.entity_id) AND (lessons.student_id = ( SELECT public.current_profile_id() AS current_profile_id)) AND (lessons.deleted_at IS NULL))))) OR (((entity_type)::text = 'assignment'::text) AND (EXISTS ( SELECT 1
   FROM public.assignments
  WHERE ((assignments.id = drive_files.entity_id) AND (assignments.student_id = ( SELECT public.current_profile_id() AS current_profile_id)))))) OR (((entity_type)::text = 'song'::text) AND (EXISTS ( SELECT 1
   FROM (public.lesson_songs ls
     JOIN public.lessons l ON ((ls.lesson_id = l.id)))
  WHERE ((ls.song_id = drive_files.entity_id) AND (l.student_id = ( SELECT public.current_profile_id() AS current_profile_id)) AND (l.deleted_at IS NULL))))) OR (((entity_type)::text = 'profile'::text) AND (entity_id = ( SELECT public.current_profile_id() AS current_profile_id))))))));


--
-- Name: drive_files drive_files_update_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drive_files_update_staff ON public.drive_files FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND ( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher)));


--
-- Name: hashtag_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hashtag_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: hashtag_sets hashtag_sets_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hashtag_sets_delete ON public.hashtag_sets FOR DELETE TO authenticated USING (public.is_admin_or_teacher());


--
-- Name: hashtag_sets hashtag_sets_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hashtag_sets_insert ON public.hashtag_sets FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_teacher());


--
-- Name: hashtag_sets hashtag_sets_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hashtag_sets_select ON public.hashtag_sets FOR SELECT TO authenticated USING (public.is_admin_or_teacher());


--
-- Name: hashtag_sets hashtag_sets_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hashtag_sets_update ON public.hashtag_sets FOR UPDATE TO authenticated USING (public.is_admin_or_teacher()) WITH CHECK (public.is_admin_or_teacher());


--
-- Name: in_app_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: in_app_notifications in_app_notifications_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY in_app_notifications_admin_all ON public.in_app_notifications TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: in_app_notifications in_app_notifications_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY in_app_notifications_select_own ON public.in_app_notifications FOR SELECT TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: in_app_notifications in_app_notifications_service_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY in_app_notifications_service_insert ON public.in_app_notifications FOR INSERT WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: in_app_notifications in_app_notifications_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY in_app_notifications_update_own ON public.in_app_notifications FOR UPDATE TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: task_management insert_task_management_user_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_task_management_user_or_admin ON public.task_management FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (user_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: lesson_songs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_songs ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_songs lesson_songs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_songs_delete ON public.lesson_songs FOR DELETE TO authenticated USING (( SELECT public.can_manage_lesson(lesson_songs.lesson_id) AS can_manage_lesson));


--
-- Name: lesson_songs lesson_songs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_songs_insert ON public.lesson_songs FOR INSERT TO authenticated WITH CHECK (( SELECT public.can_manage_lesson(lesson_songs.lesson_id) AS can_manage_lesson));


--
-- Name: lesson_songs lesson_songs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_songs_select ON public.lesson_songs FOR SELECT TO authenticated USING (( SELECT public.can_access_lesson(lesson_songs.lesson_id) AS can_access_lesson));


--
-- Name: lesson_songs lesson_songs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_songs_update ON public.lesson_songs FOR UPDATE TO authenticated USING (( SELECT public.can_manage_lesson(lesson_songs.lesson_id) AS can_manage_lesson)) WITH CHECK (( SELECT public.can_manage_lesson(lesson_songs.lesson_id) AS can_manage_lesson));


--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons lessons_delete_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_delete_teacher ON public.lessons FOR DELETE TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: lessons lessons_insert_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_insert_teacher ON public.lessons FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (( SELECT public.is_teacher() AS is_teacher) AND (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id)))));


--
-- Name: lessons lessons_select_parent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_select_parent ON public.lessons FOR SELECT TO authenticated USING (public.is_child_of_parent(student_id));


--
-- Name: lessons lessons_select_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_select_participant ON public.lessons FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id)) OR (student_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: lessons lessons_update_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_update_teacher ON public.lessons FOR UPDATE TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id)))) WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (teacher_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: notification_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_log notification_log_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_log_select_admin ON public.notification_log FOR SELECT TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: notification_log notification_log_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_log_select_own ON public.notification_log FOR SELECT TO authenticated USING ((recipient_user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: notification_log notification_log_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_log_service_all ON public.notification_log USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences notification_preferences_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_preferences_select_admin ON public.notification_preferences FOR SELECT TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: notification_preferences notification_preferences_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_preferences_select_own ON public.notification_preferences FOR SELECT TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: notification_preferences notification_preferences_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_preferences_update_own ON public.notification_preferences FOR UPDATE TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: notification_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_queue notification_queue_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_queue_select_admin ON public.notification_queue FOR SELECT TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: notification_queue notification_queue_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_queue_select_own ON public.notification_queue FOR SELECT TO authenticated USING ((recipient_user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: notification_queue notification_queue_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_queue_service_all ON public.notification_queue USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: practice_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: practice_sessions practice_sessions_delete_own_today; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practice_sessions_delete_own_today ON public.practice_sessions FOR DELETE TO authenticated USING (((student_id = ( SELECT public.current_profile_id() AS current_profile_id)) AND ((created_at)::date = CURRENT_DATE)));


--
-- Name: practice_sessions practice_sessions_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practice_sessions_insert_own ON public.practice_sessions FOR INSERT TO authenticated WITH CHECK ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: practice_sessions practice_sessions_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practice_sessions_select_own ON public.practice_sessions FOR SELECT TO authenticated USING ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: practice_sessions practice_sessions_select_parent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practice_sessions_select_parent ON public.practice_sessions FOR SELECT TO authenticated USING (public.is_child_of_parent(student_id));


--
-- Name: practice_sessions practice_sessions_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practice_sessions_select_staff ON public.practice_sessions FOR SELECT USING (public.is_admin_or_teacher());


--
-- Name: practice_sessions practice_sessions_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY practice_sessions_update_own ON public.practice_sessions FOR UPDATE TO authenticated USING ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_delete ON public.profiles FOR DELETE TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: profiles profiles_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_staff ON public.profiles FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (( SELECT public.is_teacher() AS is_teacher) AND (user_id IS NULL) AND (is_student = true) AND (is_admin = false) AND (is_teacher = false))));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: profiles profiles_select_parent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_parent ON public.profiles FOR SELECT TO authenticated USING ((( SELECT public.is_parent() AS is_parent) AND (parent_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: profiles profiles_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_staff ON public.profiles FOR SELECT TO authenticated USING (( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: task_management select_task_management_user_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_task_management_user_or_admin ON public.task_management FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (user_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

--
-- Name: song_of_the_week; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.song_of_the_week ENABLE ROW LEVEL SECURITY;

--
-- Name: song_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.song_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: song_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.song_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: song_videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.song_videos ENABLE ROW LEVEL SECURITY;

--
-- Name: song_videos song_videos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY song_videos_delete ON public.song_videos FOR DELETE TO authenticated USING (public.is_admin_or_teacher());


--
-- Name: song_videos song_videos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY song_videos_insert ON public.song_videos FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_teacher());


--
-- Name: song_videos song_videos_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY song_videos_select_staff ON public.song_videos FOR SELECT TO authenticated USING (public.is_admin_or_teacher());


--
-- Name: song_videos song_videos_select_student; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY song_videos_select_student ON public.song_videos FOR SELECT TO authenticated USING ((( SELECT public.is_student() AS is_student) AND ((EXISTS ( SELECT 1
   FROM public.student_repertoire sr
  WHERE ((sr.song_id = song_videos.song_id) AND (sr.student_id = ( SELECT public.current_profile_id() AS current_profile_id))))) OR (EXISTS ( SELECT 1
   FROM (public.lesson_songs ls
     JOIN public.lessons l ON ((l.id = ls.lesson_id)))
  WHERE ((ls.song_id = song_videos.song_id) AND (l.student_id = ( SELECT public.current_profile_id() AS current_profile_id)) AND (l.deleted_at IS NULL)))))));


--
-- Name: song_videos song_videos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY song_videos_update ON public.song_videos FOR UPDATE TO authenticated USING (public.is_admin_or_teacher());


--
-- Name: songs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

--
-- Name: songs songs_delete_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY songs_delete_staff ON public.songs FOR DELETE TO authenticated USING (( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher));


--
-- Name: songs songs_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY songs_insert_staff ON public.songs FOR INSERT TO authenticated WITH CHECK (( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher));


--
-- Name: songs songs_select_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY songs_select_active ON public.songs FOR SELECT TO authenticated USING (((deleted_at IS NULL) OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: songs songs_select_parent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY songs_select_parent ON public.songs FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (public.lesson_songs ls
     JOIN public.lessons l ON ((ls.lesson_id = l.id)))
  WHERE ((ls.song_id = songs.id) AND public.is_child_of_parent(l.student_id) AND (l.deleted_at IS NULL))))));


--
-- Name: songs songs_update_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY songs_update_staff ON public.songs FOR UPDATE TO authenticated USING (( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher)) WITH CHECK (( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher));


--
-- Name: spotify_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.spotify_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: spotify_matches spotify_matches_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spotify_matches_delete ON public.spotify_matches FOR DELETE USING (public.is_admin());


--
-- Name: spotify_matches spotify_matches_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spotify_matches_insert ON public.spotify_matches FOR INSERT WITH CHECK (public.is_admin_or_teacher());


--
-- Name: spotify_matches spotify_matches_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spotify_matches_select ON public.spotify_matches FOR SELECT USING (public.is_admin_or_teacher());


--
-- Name: spotify_matches spotify_matches_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spotify_matches_update ON public.spotify_matches FOR UPDATE USING (public.is_admin_or_teacher());


--
-- Name: student_repertoire sr_delete_admin_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sr_delete_admin_teacher ON public.student_repertoire FOR DELETE USING (public.is_admin_or_teacher());


--
-- Name: student_repertoire sr_insert_admin_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sr_insert_admin_teacher ON public.student_repertoire FOR INSERT WITH CHECK (public.is_admin_or_teacher());


--
-- Name: student_repertoire sr_select_admin_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sr_select_admin_teacher ON public.student_repertoire FOR SELECT USING (public.is_admin_or_teacher());


--
-- Name: student_repertoire sr_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sr_select_own ON public.student_repertoire FOR SELECT TO authenticated USING ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: student_repertoire sr_select_parent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sr_select_parent ON public.student_repertoire FOR SELECT TO authenticated USING (public.is_child_of_parent(student_id));


--
-- Name: student_repertoire sr_update_admin_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sr_update_admin_teacher ON public.student_repertoire FOR UPDATE USING (public.is_admin_or_teacher());


--
-- Name: student_repertoire sr_update_own_notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sr_update_own_notes ON public.student_repertoire FOR UPDATE TO authenticated USING ((student_id = ( SELECT public.current_profile_id() AS current_profile_id))) WITH CHECK ((student_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: student_repertoire; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_repertoire ENABLE ROW LEVEL SECURITY;

--
-- Name: student_skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_conflicts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_conflicts sync_conflicts_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sync_conflicts_delete_own ON public.sync_conflicts FOR DELETE TO authenticated USING ((((status)::text = 'resolved'::text) AND (EXISTS ( SELECT 1
   FROM public.lessons
  WHERE ((lessons.id = sync_conflicts.lesson_id) AND (lessons.teacher_id = ( SELECT public.current_profile_id() AS current_profile_id)))))));


--
-- Name: sync_conflicts sync_conflicts_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sync_conflicts_insert_staff ON public.sync_conflicts FOR INSERT WITH CHECK (public.is_admin_or_teacher());


--
-- Name: sync_conflicts sync_conflicts_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sync_conflicts_select_own ON public.sync_conflicts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.lessons
  WHERE ((lessons.id = sync_conflicts.lesson_id) AND (lessons.teacher_id = ( SELECT public.current_profile_id() AS current_profile_id))))));


--
-- Name: sync_conflicts sync_conflicts_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sync_conflicts_update_own ON public.sync_conflicts FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.lessons
  WHERE ((lessons.id = sync_conflicts.lesson_id) AND (lessons.teacher_id = ( SELECT public.current_profile_id() AS current_profile_id))))));


--
-- Name: system_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_logs system_logs_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_logs_select_admin ON public.system_logs FOR SELECT USING (public.is_admin());


--
-- Name: task_management; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_management ENABLE ROW LEVEL SECURITY;

--
-- Name: theoretical_courses tc_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_delete ON public.theoretical_courses FOR DELETE TO authenticated USING (((created_by = ( SELECT public.current_profile_id() AS current_profile_id)) OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: theoretical_courses tc_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_insert ON public.theoretical_courses FOR INSERT WITH CHECK (public.is_admin_or_teacher());


--
-- Name: theoretical_courses tc_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_select_admin ON public.theoretical_courses FOR SELECT USING (((deleted_at IS NULL) AND public.is_admin()));


--
-- Name: theoretical_courses tc_select_student; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_select_student ON public.theoretical_courses FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (is_published = true) AND ( SELECT public.is_student() AS is_student) AND (EXISTS ( SELECT 1
   FROM public.theoretical_course_access tca
  WHERE ((tca.course_id = theoretical_courses.id) AND (tca.user_id = ( SELECT public.current_profile_id() AS current_profile_id)))))));


--
-- Name: theoretical_courses tc_select_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_select_teacher ON public.theoretical_courses FOR SELECT USING (((deleted_at IS NULL) AND public.is_teacher()));


--
-- Name: theoretical_courses tc_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_update ON public.theoretical_courses FOR UPDATE TO authenticated USING (((created_by = ( SELECT public.current_profile_id() AS current_profile_id)) OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: theoretical_course_access tca_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tca_delete ON public.theoretical_course_access FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.theoretical_courses tc
  WHERE ((tc.id = theoretical_course_access.course_id) AND ((tc.created_by = ( SELECT public.current_profile_id() AS current_profile_id)) OR ( SELECT public.is_admin() AS is_admin))))));


--
-- Name: theoretical_course_access tca_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tca_insert ON public.theoretical_course_access FOR INSERT WITH CHECK (public.is_admin_or_teacher());


--
-- Name: theoretical_course_access tca_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tca_select_admin ON public.theoretical_course_access FOR SELECT USING (public.is_admin());


--
-- Name: theoretical_course_access tca_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tca_select_own ON public.theoretical_course_access FOR SELECT TO authenticated USING ((user_id = ( SELECT public.current_profile_id() AS current_profile_id)));


--
-- Name: theoretical_course_access tca_select_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tca_select_teacher ON public.theoretical_course_access FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.theoretical_courses tc
  WHERE ((tc.id = theoretical_course_access.course_id) AND (tc.created_by = ( SELECT public.current_profile_id() AS current_profile_id))))));


--
-- Name: teacher_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_settings teacher_settings_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_settings_delete ON public.teacher_settings FOR DELETE TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (profile_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: teacher_settings teacher_settings_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_settings_insert ON public.teacher_settings FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (( SELECT public.is_teacher() AS is_teacher) AND (profile_id = ( SELECT public.current_profile_id() AS current_profile_id)))));


--
-- Name: teacher_settings teacher_settings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_settings_select ON public.teacher_settings FOR SELECT TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR ( SELECT public.is_teacher() AS is_teacher) OR (profile_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: teacher_settings teacher_settings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_settings_update ON public.teacher_settings FOR UPDATE TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (profile_id = ( SELECT public.current_profile_id() AS current_profile_id)))) WITH CHECK ((( SELECT public.is_admin() AS is_admin) OR (profile_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: theoretical_course_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.theoretical_course_access ENABLE ROW LEVEL SECURITY;

--
-- Name: theoretical_courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.theoretical_courses ENABLE ROW LEVEL SECURITY;

--
-- Name: theoretical_lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.theoretical_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: theoretical_lessons tl_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tl_delete ON public.theoretical_lessons FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.theoretical_courses tc
  WHERE ((tc.id = theoretical_lessons.course_id) AND ((tc.created_by = ( SELECT public.current_profile_id() AS current_profile_id)) OR ( SELECT public.is_admin() AS is_admin))))));


--
-- Name: theoretical_lessons tl_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tl_insert ON public.theoretical_lessons FOR INSERT WITH CHECK (public.is_admin_or_teacher());


--
-- Name: theoretical_lessons tl_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tl_select_admin ON public.theoretical_lessons FOR SELECT USING (((deleted_at IS NULL) AND public.is_admin()));


--
-- Name: theoretical_lessons tl_select_student; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tl_select_student ON public.theoretical_lessons FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (is_published = true) AND ( SELECT public.is_student() AS is_student) AND (EXISTS ( SELECT 1
   FROM public.theoretical_course_access tca
  WHERE ((tca.course_id = theoretical_lessons.course_id) AND (tca.user_id = ( SELECT public.current_profile_id() AS current_profile_id)))))));


--
-- Name: theoretical_lessons tl_select_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tl_select_teacher ON public.theoretical_lessons FOR SELECT USING (((deleted_at IS NULL) AND public.is_teacher()));


--
-- Name: theoretical_lessons tl_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tl_update ON public.theoretical_lessons FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.theoretical_courses tc
  WHERE ((tc.id = theoretical_lessons.course_id) AND ((tc.created_by = ( SELECT public.current_profile_id() AS current_profile_id)) OR ( SELECT public.is_admin() AS is_admin))))));


--
-- Name: task_management update_task_management_user_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_task_management_user_or_admin ON public.task_management FOR UPDATE TO authenticated USING ((( SELECT public.is_admin() AS is_admin) OR (user_id = ( SELECT public.current_profile_id() AS current_profile_id))));


--
-- Name: user_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_integrations user_integrations_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_integrations_delete ON public.user_integrations FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: user_integrations user_integrations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_integrations_insert ON public.user_integrations FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_integrations user_integrations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_integrations_select ON public.user_integrations FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_integrations user_integrations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_integrations_update ON public.user_integrations FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences user_preferences_select_parent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_select_parent ON public.user_preferences FOR SELECT TO authenticated USING (public.is_child_of_parent(user_id));


--
-- Name: user_preferences user_preferences_select_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_select_teacher ON public.user_preferences FOR SELECT TO authenticated USING (( SELECT public.is_admin_or_teacher() AS is_admin_or_teacher));


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_subscriptions webhook_subscriptions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_subscriptions_delete ON public.webhook_subscriptions FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: webhook_subscriptions webhook_subscriptions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_subscriptions_insert ON public.webhook_subscriptions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: webhook_subscriptions webhook_subscriptions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_subscriptions_select ON public.webhook_subscriptions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: webhook_subscriptions webhook_subscriptions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_subscriptions_update ON public.webhook_subscriptions FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;


--
-- Name: FUNCTION archive_old_audit_partitions(months_to_keep integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.archive_old_audit_partitions(months_to_keep integer) TO service_role;
GRANT ALL ON FUNCTION public.archive_old_audit_partitions(months_to_keep integer) TO anon;
GRANT ALL ON FUNCTION public.archive_old_audit_partitions(months_to_keep integer) TO authenticated;


--
-- Name: FUNCTION audit_log_changes(p_entity_type public.audit_entity, p_entity_id uuid, p_action public.audit_action, p_changes jsonb, p_metadata jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.audit_log_changes(p_entity_type public.audit_entity, p_entity_id uuid, p_action public.audit_action, p_changes jsonb, p_metadata jsonb) TO service_role;
GRANT ALL ON FUNCTION public.audit_log_changes(p_entity_type public.audit_entity, p_entity_id uuid, p_action public.audit_action, p_changes jsonb, p_metadata jsonb) TO anon;
GRANT ALL ON FUNCTION public.audit_log_changes(p_entity_type public.audit_entity, p_entity_id uuid, p_action public.audit_action, p_changes jsonb, p_metadata jsonb) TO authenticated;


--
-- Name: FUNCTION can_access_lesson(p_lesson_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_access_lesson(p_lesson_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.can_access_lesson(p_lesson_id uuid) TO anon;
GRANT ALL ON FUNCTION public.can_access_lesson(p_lesson_id uuid) TO authenticated;


--
-- Name: FUNCTION can_manage_lesson(p_lesson_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_manage_lesson(p_lesson_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.can_manage_lesson(p_lesson_id uuid) TO anon;
GRANT ALL ON FUNCTION public.can_manage_lesson(p_lesson_id uuid) TO authenticated;


--
-- Name: FUNCTION check_and_record_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_and_record_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint) TO anon;
GRANT ALL ON FUNCTION public.check_and_record_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint) TO authenticated;
GRANT ALL ON FUNCTION public.check_and_record_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint) TO service_role;


--
-- Name: FUNCTION check_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint) TO service_role;
GRANT ALL ON FUNCTION public.check_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint) TO anon;
GRANT ALL ON FUNCTION public.check_auth_rate_limit(p_identifier text, p_operation text, p_window_ms bigint) TO authenticated;


--
-- Name: FUNCTION cleanup_auth_rate_limits(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cleanup_auth_rate_limits() TO service_role;
GRANT ALL ON FUNCTION public.cleanup_auth_rate_limits() TO anon;
GRANT ALL ON FUNCTION public.cleanup_auth_rate_limits() TO authenticated;


--
-- Name: FUNCTION cleanup_old_in_app_notifications(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cleanup_old_in_app_notifications() TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_in_app_notifications() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_in_app_notifications() TO service_role;


--
-- Name: FUNCTION create_audit_log_partition(year integer, month integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_audit_log_partition(year integer, month integer) TO service_role;
GRANT ALL ON FUNCTION public.create_audit_log_partition(year integer, month integer) TO anon;
GRANT ALL ON FUNCTION public.create_audit_log_partition(year integer, month integer) TO authenticated;


--
-- Name: FUNCTION current_profile_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.current_profile_id() TO service_role;
GRANT ALL ON FUNCTION public.current_profile_id() TO anon;
GRANT ALL ON FUNCTION public.current_profile_id() TO authenticated;


--
-- Name: FUNCTION current_user_roles(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.current_user_roles() TO service_role;
GRANT ALL ON FUNCTION public.current_user_roles() TO anon;
GRANT ALL ON FUNCTION public.current_user_roles() TO authenticated;


--
-- Name: FUNCTION find_similar_songs(search_title text, threshold double precision, max_results integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.find_similar_songs(search_title text, threshold double precision, max_results integer) TO anon;
GRANT ALL ON FUNCTION public.find_similar_songs(search_title text, threshold double precision, max_results integer) TO authenticated;
GRANT ALL ON FUNCTION public.find_similar_songs(search_title text, threshold double precision, max_results integer) TO service_role;


--
-- Name: FUNCTION fn_aggregate_practice_to_repertoire(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_aggregate_practice_to_repertoire() TO anon;
GRANT ALL ON FUNCTION public.fn_aggregate_practice_to_repertoire() TO authenticated;
GRANT ALL ON FUNCTION public.fn_aggregate_practice_to_repertoire() TO service_role;


--
-- Name: FUNCTION fn_record_progress_history(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_record_progress_history() TO anon;
GRANT ALL ON FUNCTION public.fn_record_progress_history() TO authenticated;
GRANT ALL ON FUNCTION public.fn_record_progress_history() TO service_role;


--
-- Name: FUNCTION fn_sync_lesson_song_to_repertoire(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_sync_lesson_song_to_repertoire() TO anon;
GRANT ALL ON FUNCTION public.fn_sync_lesson_song_to_repertoire() TO authenticated;
GRANT ALL ON FUNCTION public.fn_sync_lesson_song_to_repertoire() TO service_role;


--
-- Name: FUNCTION get_bounce_stats(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_bounce_stats() TO authenticated;
GRANT ALL ON FUNCTION public.get_bounce_stats() TO service_role;
GRANT ALL ON FUNCTION public.get_bounce_stats() TO anon;


--
-- Name: FUNCTION get_pending_notifications(batch_size integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_pending_notifications(batch_size integer) TO anon;
GRANT ALL ON FUNCTION public.get_pending_notifications(batch_size integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_pending_notifications(batch_size integer) TO service_role;


--
-- Name: FUNCTION get_system_email_count_last_hour(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_system_email_count_last_hour() TO anon;
GRANT ALL ON FUNCTION public.get_system_email_count_last_hour() TO authenticated;
GRANT ALL ON FUNCTION public.get_system_email_count_last_hour() TO service_role;


--
-- Name: FUNCTION get_user_email_count_last_hour(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_email_count_last_hour(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_email_count_last_hour(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_email_count_last_hour(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION has_active_lesson_assignments(p_song_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_active_lesson_assignments(p_song_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.has_active_lesson_assignments(p_song_id uuid) TO anon;
GRANT ALL ON FUNCTION public.has_active_lesson_assignments(p_song_id uuid) TO authenticated;


--
-- Name: FUNCTION initialize_notification_preferences(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.initialize_notification_preferences() TO anon;
GRANT ALL ON FUNCTION public.initialize_notification_preferences() TO authenticated;
GRANT ALL ON FUNCTION public.initialize_notification_preferences() TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO service_role;
GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;


--
-- Name: FUNCTION is_admin_or_teacher(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin_or_teacher() TO service_role;
GRANT ALL ON FUNCTION public.is_admin_or_teacher() TO anon;
GRANT ALL ON FUNCTION public.is_admin_or_teacher() TO authenticated;


--
-- Name: FUNCTION is_child_of_parent(_student_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_child_of_parent(_student_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.is_child_of_parent(_student_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_child_of_parent(_student_id uuid) TO authenticated;


--
-- Name: FUNCTION is_notification_enabled(p_user_id uuid, p_notification_type public.notification_type); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_notification_enabled(p_user_id uuid, p_notification_type public.notification_type) TO anon;
GRANT ALL ON FUNCTION public.is_notification_enabled(p_user_id uuid, p_notification_type public.notification_type) TO authenticated;
GRANT ALL ON FUNCTION public.is_notification_enabled(p_user_id uuid, p_notification_type public.notification_type) TO service_role;


--
-- Name: FUNCTION is_parent(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_parent() TO service_role;
GRANT ALL ON FUNCTION public.is_parent() TO anon;
GRANT ALL ON FUNCTION public.is_parent() TO authenticated;


--
-- Name: FUNCTION is_student(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_student() TO service_role;
GRANT ALL ON FUNCTION public.is_student() TO anon;
GRANT ALL ON FUNCTION public.is_student() TO authenticated;


--
-- Name: FUNCTION is_teacher(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_teacher() TO service_role;
GRANT ALL ON FUNCTION public.is_teacher() TO anon;
GRANT ALL ON FUNCTION public.is_teacher() TO authenticated;


--
-- Name: FUNCTION jsonb_diff(left_val jsonb, right_val jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jsonb_diff(left_val jsonb, right_val jsonb) TO anon;
GRANT ALL ON FUNCTION public.jsonb_diff(left_val jsonb, right_val jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.jsonb_diff(left_val jsonb, right_val jsonb) TO service_role;


--
-- Name: FUNCTION mark_overdue_assignments(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mark_overdue_assignments() TO service_role;
GRANT ALL ON FUNCTION public.mark_overdue_assignments() TO anon;
GRANT ALL ON FUNCTION public.mark_overdue_assignments() TO authenticated;


--
-- Name: FUNCTION migrate_pending_student(p_pending_id uuid, p_auth_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.migrate_pending_student(p_pending_id uuid, p_auth_user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.migrate_pending_student(p_pending_id uuid, p_auth_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.migrate_pending_student(p_pending_id uuid, p_auth_user_id uuid) TO authenticated;


--
-- Name: FUNCTION refresh_dashboard_stats(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.refresh_dashboard_stats() TO service_role;
GRANT ALL ON FUNCTION public.refresh_dashboard_stats() TO anon;
GRANT ALL ON FUNCTION public.refresh_dashboard_stats() TO authenticated;


--
-- Name: FUNCTION refresh_song_engagement(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.refresh_song_engagement() TO anon;
GRANT ALL ON FUNCTION public.refresh_song_engagement() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_song_engagement() TO service_role;


--
-- Name: FUNCTION refresh_song_popularity(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.refresh_song_popularity() TO service_role;
GRANT ALL ON FUNCTION public.refresh_song_popularity() TO anon;
GRANT ALL ON FUNCTION public.refresh_song_popularity() TO authenticated;


--
-- Name: FUNCTION refresh_teacher_performance(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.refresh_teacher_performance() TO anon;
GRANT ALL ON FUNCTION public.refresh_teacher_performance() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_teacher_performance() TO service_role;


--
-- Name: FUNCTION reverse_song_progress_from_practice(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reverse_song_progress_from_practice() TO anon;
GRANT ALL ON FUNCTION public.reverse_song_progress_from_practice() TO authenticated;
GRANT ALL ON FUNCTION public.reverse_song_progress_from_practice() TO service_role;


--
-- Name: FUNCTION rls_staff_policy_hygiene_check(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.rls_staff_policy_hygiene_check() FROM PUBLIC;
GRANT ALL ON FUNCTION public.rls_staff_policy_hygiene_check() TO service_role;


--
-- Name: FUNCTION set_lesson_number(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_lesson_number() TO service_role;
GRANT ALL ON FUNCTION public.set_lesson_number() TO anon;
GRANT ALL ON FUNCTION public.set_lesson_number() TO authenticated;


--
-- Name: FUNCTION set_lesson_numbers(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_lesson_numbers() TO anon;
GRANT ALL ON FUNCTION public.set_lesson_numbers() TO authenticated;
GRANT ALL ON FUNCTION public.set_lesson_numbers() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;


--
-- Name: FUNCTION soft_delete_song(p_song_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.soft_delete_song(p_song_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.soft_delete_song(p_song_id uuid) TO anon;
GRANT ALL ON FUNCTION public.soft_delete_song(p_song_id uuid) TO authenticated;


--
-- Name: FUNCTION soft_delete_song_with_cascade(song_uuid uuid, user_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.soft_delete_song_with_cascade(song_uuid uuid, user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.soft_delete_song_with_cascade(song_uuid uuid, user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.soft_delete_song_with_cascade(song_uuid uuid, user_uuid uuid) TO service_role;


--
-- Name: TABLE assignments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignments TO authenticated;
GRANT ALL ON TABLE public.assignments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignments TO anon;


--
-- Name: FUNCTION student_complete_chord_drill(p_assignment_id uuid, p_score integer, p_total integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_complete_chord_drill(p_assignment_id uuid, p_score integer, p_total integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_complete_chord_drill(p_assignment_id uuid, p_score integer, p_total integer) TO authenticated;
GRANT ALL ON FUNCTION public.student_complete_chord_drill(p_assignment_id uuid, p_score integer, p_total integer) TO service_role;


--
-- Name: FUNCTION student_toggle_checklist_item(p_assignment_id uuid, p_item_id text, p_done boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_toggle_checklist_item(p_assignment_id uuid, p_item_id text, p_done boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_toggle_checklist_item(p_assignment_id uuid, p_item_id text, p_done boolean) TO authenticated;
GRANT ALL ON FUNCTION public.student_toggle_checklist_item(p_assignment_id uuid, p_item_id text, p_done boolean) TO service_role;


--
-- Name: FUNCTION student_update_assignment_status(p_assignment_id uuid, p_new_status public.assignment_status); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.student_update_assignment_status(p_assignment_id uuid, p_new_status public.assignment_status) FROM PUBLIC;
GRANT ALL ON FUNCTION public.student_update_assignment_status(p_assignment_id uuid, p_new_status public.assignment_status) TO authenticated;
GRANT ALL ON FUNCTION public.student_update_assignment_status(p_assignment_id uuid, p_new_status public.assignment_status) TO service_role;


--
-- Name: FUNCTION sync_song_video_published_flag(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_song_video_published_flag() TO anon;
GRANT ALL ON FUNCTION public.sync_song_video_published_flag() TO authenticated;
GRANT ALL ON FUNCTION public.sync_song_video_published_flag() TO service_role;


--
-- Name: FUNCTION teacher_teaches_student(_teacher_id uuid, _student_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.teacher_teaches_student(_teacher_id uuid, _student_id uuid) TO anon;
GRANT ALL ON FUNCTION public.teacher_teaches_student(_teacher_id uuid, _student_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.teacher_teaches_student(_teacher_id uuid, _student_id uuid) TO service_role;


--
-- Name: FUNCTION tr_audit_assignments(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tr_audit_assignments() TO service_role;
GRANT ALL ON FUNCTION public.tr_audit_assignments() TO anon;
GRANT ALL ON FUNCTION public.tr_audit_assignments() TO authenticated;


--
-- Name: FUNCTION tr_audit_lessons(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tr_audit_lessons() TO service_role;
GRANT ALL ON FUNCTION public.tr_audit_lessons() TO anon;
GRANT ALL ON FUNCTION public.tr_audit_lessons() TO authenticated;


--
-- Name: FUNCTION tr_audit_profiles(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tr_audit_profiles() TO service_role;
GRANT ALL ON FUNCTION public.tr_audit_profiles() TO anon;
GRANT ALL ON FUNCTION public.tr_audit_profiles() TO authenticated;


--
-- Name: FUNCTION tr_audit_song_progress(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tr_audit_song_progress() TO service_role;
GRANT ALL ON FUNCTION public.tr_audit_song_progress() TO anon;
GRANT ALL ON FUNCTION public.tr_audit_song_progress() TO authenticated;


--
-- Name: FUNCTION tr_notify_lesson_cancelled(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tr_notify_lesson_cancelled() TO anon;
GRANT ALL ON FUNCTION public.tr_notify_lesson_cancelled() TO authenticated;
GRANT ALL ON FUNCTION public.tr_notify_lesson_cancelled() TO service_role;


--
-- Name: FUNCTION tr_notify_lesson_completed(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tr_notify_lesson_completed() TO anon;
GRANT ALL ON FUNCTION public.tr_notify_lesson_completed() TO authenticated;
GRANT ALL ON FUNCTION public.tr_notify_lesson_completed() TO service_role;


--
-- Name: FUNCTION tr_notify_lesson_rescheduled(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tr_notify_lesson_rescheduled() TO anon;
GRANT ALL ON FUNCTION public.tr_notify_lesson_rescheduled() TO authenticated;
GRANT ALL ON FUNCTION public.tr_notify_lesson_rescheduled() TO service_role;


--
-- Name: FUNCTION tr_notify_song_mastery(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tr_notify_song_mastery() TO anon;
GRANT ALL ON FUNCTION public.tr_notify_song_mastery() TO authenticated;
GRANT ALL ON FUNCTION public.tr_notify_song_mastery() TO service_role;


--
-- Name: FUNCTION tr_notify_student_welcome(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tr_notify_student_welcome() TO anon;
GRANT ALL ON FUNCTION public.tr_notify_student_welcome() TO authenticated;
GRANT ALL ON FUNCTION public.tr_notify_student_welcome() TO service_role;


--
-- Name: FUNCTION tr_update_song_progress(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tr_update_song_progress() TO service_role;
GRANT ALL ON FUNCTION public.tr_update_song_progress() TO anon;
GRANT ALL ON FUNCTION public.tr_update_song_progress() TO authenticated;


--
-- Name: FUNCTION track_lesson_changes(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.track_lesson_changes() TO anon;
GRANT ALL ON FUNCTION public.track_lesson_changes() TO authenticated;
GRANT ALL ON FUNCTION public.track_lesson_changes() TO service_role;


--
-- Name: FUNCTION transfer_shadow_profile_references(p_old_id uuid, p_new_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.transfer_shadow_profile_references(p_old_id uuid, p_new_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.transfer_shadow_profile_references(p_old_id uuid, p_new_id uuid) TO service_role;


--
-- Name: FUNCTION update_notification_timestamp(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_notification_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_notification_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_notification_timestamp() TO service_role;


--
-- Name: FUNCTION update_song_progress_from_practice(p_session_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_song_progress_from_practice(p_session_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.update_song_progress_from_practice(p_session_id uuid) TO anon;
GRANT ALL ON FUNCTION public.update_song_progress_from_practice(p_session_id uuid) TO authenticated;


--
-- Name: FUNCTION update_song_requests_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_song_requests_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_song_requests_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_song_requests_updated_at() TO service_role;


--
-- Name: FUNCTION update_sync_conflicts_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_sync_conflicts_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.update_sync_conflicts_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_sync_conflicts_updated_at() TO authenticated;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION update_user_settings_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_user_settings_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_user_settings_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_user_settings_updated_at() TO service_role;


--
-- Name: TABLE agent_execution_logs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.agent_execution_logs TO authenticated;
GRANT ALL ON TABLE public.agent_execution_logs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.agent_execution_logs TO anon;


--
-- Name: TABLE ai_conversations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_conversations TO authenticated;
GRANT ALL ON TABLE public.ai_conversations TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_conversations TO anon;


--
-- Name: TABLE ai_generations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_generations TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_generations TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_generations TO service_role;


--
-- Name: TABLE ai_messages; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_messages TO authenticated;
GRANT ALL ON TABLE public.ai_messages TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_messages TO anon;


--
-- Name: TABLE ai_prompt_templates; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_prompt_templates TO authenticated;
GRANT ALL ON TABLE public.ai_prompt_templates TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_prompt_templates TO anon;


--
-- Name: TABLE ai_usage_stats; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_usage_stats TO authenticated;
GRANT ALL ON TABLE public.ai_usage_stats TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_usage_stats TO anon;


--
-- Name: TABLE api_keys; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.api_keys TO authenticated;
GRANT ALL ON TABLE public.api_keys TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.api_keys TO anon;


--
-- Name: TABLE apple_shortcut_song_import_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.apple_shortcut_song_import_log TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.apple_shortcut_song_import_log TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.apple_shortcut_song_import_log TO service_role;


--
-- Name: TABLE assignment_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignment_history TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignment_history TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignment_history TO service_role;


--
-- Name: TABLE assignment_templates; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignment_templates TO authenticated;
GRANT ALL ON TABLE public.assignment_templates TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignment_templates TO anon;


--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log TO anon;


--
-- Name: TABLE audit_log_2026_01; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_01 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_01 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_01 TO authenticated;


--
-- Name: TABLE audit_log_2026_02; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_02 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_02 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_02 TO authenticated;


--
-- Name: TABLE audit_log_2026_03; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_03 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_03 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_03 TO authenticated;


--
-- Name: TABLE audit_log_2026_04; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_04 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_04 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_04 TO authenticated;


--
-- Name: TABLE audit_log_2026_05; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_05 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_05 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_05 TO authenticated;


--
-- Name: TABLE audit_log_2026_06; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_06 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_06 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_06 TO authenticated;


--
-- Name: TABLE audit_log_2026_07; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_07 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_07 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_07 TO authenticated;


--
-- Name: TABLE audit_log_2026_08; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_08 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_08 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_08 TO authenticated;


--
-- Name: TABLE audit_log_2026_09; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_09 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_09 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_09 TO authenticated;


--
-- Name: TABLE audit_log_2026_10; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_10 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_10 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_10 TO authenticated;


--
-- Name: TABLE audit_log_2026_11; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_11 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_11 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_11 TO authenticated;


--
-- Name: TABLE audit_log_2026_12; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_2026_12 TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_12 TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_2026_12 TO authenticated;


--
-- Name: TABLE audit_log_default; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log_default TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_default TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log_default TO authenticated;


--
-- Name: TABLE auth_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.auth_events TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.auth_events TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.auth_events TO service_role;


--
-- Name: TABLE auth_rate_limits; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.auth_rate_limits TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.auth_rate_limits TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.auth_rate_limits TO authenticated;


--
-- Name: TABLE chord_quiz_attempts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.chord_quiz_attempts TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.chord_quiz_attempts TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.chord_quiz_attempts TO service_role;


--
-- Name: TABLE chord_srs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.chord_srs TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.chord_srs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.chord_srs TO service_role;


--
-- Name: TABLE content_post_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.content_post_metrics TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.content_post_metrics TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.content_post_metrics TO service_role;


--
-- Name: TABLE content_posts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.content_posts TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.content_posts TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.content_posts TO service_role;


--
-- Name: TABLE drive_files; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.drive_files TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.drive_files TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.drive_files TO service_role;


--
-- Name: TABLE hashtag_sets; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.hashtag_sets TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.hashtag_sets TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.hashtag_sets TO service_role;


--
-- Name: TABLE in_app_notifications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.in_app_notifications TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.in_app_notifications TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.in_app_notifications TO service_role;


--
-- Name: TABLE lessons; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lessons TO authenticated;
GRANT ALL ON TABLE public.lessons TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lessons TO anon;


--
-- Name: TABLE lesson_counts_per_student; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lesson_counts_per_student TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lesson_counts_per_student TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lesson_counts_per_student TO service_role;


--
-- Name: TABLE lesson_counts_per_teacher; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lesson_counts_per_teacher TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lesson_counts_per_teacher TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lesson_counts_per_teacher TO service_role;


--
-- Name: TABLE lesson_songs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lesson_songs TO authenticated;
GRANT ALL ON TABLE public.lesson_songs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lesson_songs TO anon;


--
-- Name: TABLE songs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.songs TO authenticated;
GRANT ALL ON TABLE public.songs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.songs TO anon;


--
-- Name: TABLE student_repertoire; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_repertoire TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_repertoire TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_repertoire TO service_role;


--
-- Name: TABLE mv_song_engagement; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mv_song_engagement TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mv_song_engagement TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mv_song_engagement TO service_role;


--
-- Name: TABLE mv_song_popularity; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mv_song_popularity TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mv_song_popularity TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mv_song_popularity TO service_role;


--
-- Name: TABLE notification_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_log TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_log TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_log TO service_role;


--
-- Name: TABLE notification_preferences; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_preferences TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_preferences TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_preferences TO service_role;


--
-- Name: TABLE notification_queue; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_queue TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_queue TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_queue TO service_role;


--
-- Name: TABLE practice_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.practice_sessions TO authenticated;
GRANT ALL ON TABLE public.practice_sessions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.practice_sessions TO anon;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profiles TO anon;


--
-- Name: TABLE skills; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.skills TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.skills TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.skills TO service_role;


--
-- Name: TABLE song_of_the_week; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_of_the_week TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_of_the_week TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_of_the_week TO service_role;


--
-- Name: TABLE song_requests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_requests TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_requests TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_requests TO service_role;


--
-- Name: TABLE song_status_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_status_history TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_status_history TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_status_history TO service_role;


--
-- Name: TABLE song_usage_stats; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_usage_stats TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_usage_stats TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_usage_stats TO service_role;


--
-- Name: TABLE song_videos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_videos TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_videos TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.song_videos TO service_role;


--
-- Name: TABLE spotify_matches; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.spotify_matches TO authenticated;
GRANT ALL ON TABLE public.spotify_matches TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.spotify_matches TO anon;


--
-- Name: TABLE student_skills; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_skills TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_skills TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_skills TO service_role;


--
-- Name: TABLE sync_conflicts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sync_conflicts TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sync_conflicts TO authenticated;
GRANT ALL ON TABLE public.sync_conflicts TO service_role;


--
-- Name: TABLE system_logs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.system_logs TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.system_logs TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.system_logs TO service_role;


--
-- Name: TABLE task_management; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_management TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_management TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_management TO service_role;


--
-- Name: TABLE teacher_settings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.teacher_settings TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.teacher_settings TO authenticated;
GRANT ALL ON TABLE public.teacher_settings TO service_role;


--
-- Name: TABLE teacher_students; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.teacher_students TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.teacher_students TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.teacher_students TO service_role;


--
-- Name: TABLE theoretical_course_access; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.theoretical_course_access TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.theoretical_course_access TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.theoretical_course_access TO service_role;


--
-- Name: TABLE theoretical_courses; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.theoretical_courses TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.theoretical_courses TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.theoretical_courses TO service_role;


--
-- Name: TABLE theoretical_lessons; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.theoretical_lessons TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.theoretical_lessons TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.theoretical_lessons TO service_role;


--
-- Name: TABLE user_integrations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_integrations TO authenticated;
GRANT ALL ON TABLE public.user_integrations TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_integrations TO anon;


--
-- Name: TABLE user_overview; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_overview TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_overview TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_overview TO service_role;


--
-- Name: TABLE user_preferences; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_preferences TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_preferences TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_preferences TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_roles TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_roles TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_roles TO service_role;


--
-- Name: TABLE v_assignment_overview; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_assignment_overview TO authenticated;
GRANT ALL ON TABLE public.v_assignment_overview TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_assignment_overview TO anon;


--
-- Name: TABLE v_song_usage_stats; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_song_usage_stats TO authenticated;
GRANT ALL ON TABLE public.v_song_usage_stats TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_song_usage_stats TO anon;


--
-- Name: TABLE webhook_subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.webhook_subscriptions TO authenticated;
GRANT ALL ON TABLE public.webhook_subscriptions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.webhook_subscriptions TO anon;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--


