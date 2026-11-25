-- Least privilege for baseline objects that kept the default grants.
--
-- The baseline gave anon and authenticated every right on every view and
-- EXECUTE on every function. Tables are fenced by RLS. A view owned by
-- postgres without security_invoker, and a SECURITY DEFINER function, are
-- not: for them the grant is the only fence, so it has to be narrow.
--
-- Who still reaches what after this file:
--   * The views below: nothing in the app reads them through a user client
--     (grep 2026-11-25); the service role and postgres keep their rights.
--   * The maintenance and notification functions: called by the service role
--     (lib/services/notification-queue-processor.ts, notification-monitoring.ts,
--     lib/email/rate-limiter.ts, lib/auth/rate-limiter.ts) or by pg_cron as
--     supabase_admin. Neither is affected by these revokes.
--   * soft_delete_song_with_cascade: teachers delete songs through it with
--     their own session (app/actions/songs.ts, app/api/song/handlers.ts), so
--     authenticated keeps EXECUTE and the function now checks the caller the
--     way songs_update_staff / songs_delete_staff do. The service role has no
--     auth.uid() and is not checked.
--   * lesson_history: readable by whoever can read the lesson, as the lessons
--     policies decide. It was readable by every signed-in user.
--
-- Additive: revokes, view options, one replaced function, one policy
-- recreated under the same name. Safe to re-run.

-- 1. Views that run with their owner's rights ----------------------------------

alter view public.user_overview set (security_invoker = true);
revoke all on public.user_overview from anon, authenticated;

revoke all on public.lesson_counts_per_student from anon, authenticated;
revoke all on public.lesson_counts_per_teacher from anon, authenticated;
revoke all on public.song_usage_stats from anon, authenticated;
revoke all on public.mv_song_engagement from anon, authenticated;
revoke all on public.mv_song_popularity from anon, authenticated;

-- 2. Functions for the service role and pg_cron only ---------------------------

revoke execute on function public.soft_delete_song(uuid) from public, anon, authenticated;
revoke execute on function public.get_pending_notifications(integer) from public, anon, authenticated;
revoke execute on function public.mark_overdue_assignments() from public, anon, authenticated;
revoke execute on function public.refresh_song_engagement() from public, anon, authenticated;
revoke execute on function public.cleanup_auth_rate_limits() from public, anon, authenticated;
revoke execute on function public.cleanup_old_in_app_notifications() from public, anon, authenticated;
revoke execute on function public.get_bounce_stats() from public, anon, authenticated;
revoke execute on function public.get_user_email_count_last_hour(uuid) from public, anon, authenticated;
revoke execute on function public.get_system_email_count_last_hour() from public, anon, authenticated;

grant execute on function public.soft_delete_song(uuid) to service_role;
grant execute on function public.get_pending_notifications(integer) to service_role;
grant execute on function public.mark_overdue_assignments() to service_role;
grant execute on function public.refresh_song_engagement() to service_role;
grant execute on function public.cleanup_auth_rate_limits() to service_role;
grant execute on function public.cleanup_old_in_app_notifications() to service_role;
grant execute on function public.get_bounce_stats() to service_role;
grant execute on function public.get_user_email_count_last_hour(uuid) to service_role;
grant execute on function public.get_system_email_count_last_hour() to service_role;

-- 3. Song deletion: staff only ------------------------------------------------

create or replace function public.soft_delete_song_with_cascade(song_uuid uuid, user_uuid uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    song_record record;
    lesson_assignments_count integer;
    repertoire_deactivated_count integer;
begin
    -- Same rule as songs_update_staff. A signed-in caller always has a uid;
    -- the service role has none and is trusted.
    if (select auth.uid()) is not null and not (select public.is_admin_or_teacher()) then
        raise exception 'only a teacher or an admin can delete a song'
            using errcode = '42501';
    end if;

    -- Check if song exists and is not already deleted
    select * into song_record from songs where id = song_uuid and deleted_at is null;
    if not found then
        return json_build_object('success', false, 'error', 'Song not found or already deleted');
    end if;

    -- Check for active lesson assignments
    if has_active_lesson_assignments(song_uuid) then
        return json_build_object('success', false, 'error', 'Cannot delete song with active lesson assignments');
    end if;

    -- Count related records before deletion
    select count(*) into lesson_assignments_count from lesson_songs where song_id = song_uuid;

    -- Soft delete the song
    update songs set deleted_at = now() where id = song_uuid;

    -- Cascade: remove lesson song assignments (hard delete, junction records)
    delete from lesson_songs where song_id = song_uuid;

    -- Cascade: deactivate student repertoire entries for this song. Keep the
    -- rows (progress/practice history) but hide them from active views.
    update student_repertoire
        set is_active = false, updated_at = now()
        where song_id = song_uuid and is_active = true;
    get diagnostics repertoire_deactivated_count = row_count;

    return json_build_object(
        'success', true,
        'lesson_assignments_removed', lesson_assignments_count,
        'favorite_assignments_removed', repertoire_deactivated_count
    );
end;
$$;

revoke execute on function public.soft_delete_song_with_cascade(uuid, uuid) from public, anon;
grant execute on function public.soft_delete_song_with_cascade(uuid, uuid) to authenticated, service_role;

-- 4. lesson_history: visible with the lesson ------------------------------------

drop policy if exists "Users can view lesson history" on public.lesson_history;
create policy "Users can view lesson history" on public.lesson_history
  for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_history.lesson_id));
