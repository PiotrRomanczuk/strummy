-- Student-initiated "want to learn"
--
-- Until now `student_repertoire` could only be written by an admin or teacher
-- (`sr_insert_admin_teacher`); a student browsing the song library had no way
-- to express interest in a song beyond asking their teacher out of band.
--
-- Students still get NO direct INSERT/DELETE policy. They go through the two
-- SECURITY DEFINER RPCs below, which is the same shape as
-- `set_assignment_status` (20260718090500_assignments.sql): scoped to
-- `current_profile_id()`, touching only the columns the student is allowed to
-- decide. That keeps a student from setting `teacher_notes`, `priority`, or
-- opening at `mastered` — all of which a bare INSERT policy would permit,
-- because RLS gates rows, not columns.

-- Provenance. `assigned_by` is documented as "Teacher who added this song", so
-- reusing it for self-assignment would break every query that joins it to a
-- teacher. An explicit flag keeps both facts true at once.
alter table public.student_repertoire
  add column if not exists added_by_student boolean not null default false;

comment on column public.student_repertoire.added_by_student is
  'True when the student added this song themselves ("want to learn"), rather than a teacher assigning it. Drives the student-picked badge on the teacher''s student-detail view and gates student self-removal.';

-- Add: idempotent on the existing uq_student_repertoire (student_id, song_id).
-- A song the teacher already assigned stays teacher-owned — ON CONFLICT DO
-- NOTHING deliberately does not flip `added_by_student`, so re-marking a song
-- you were already assigned cannot rewrite who chose it.
create or replace function public.add_song_to_my_repertoire(p_song_id uuid)
returns public.student_repertoire language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid;
  v_row public.student_repertoire;
begin
  if not public.is_student() then
    raise exception 'only students can add to their own repertoire' using errcode = 'check_violation';
  end if;

  v_student_id := public.current_profile_id();
  if v_student_id is null then
    raise exception 'no profile for current user' using errcode = 'check_violation';
  end if;

  -- Reject unknown/soft-deleted songs here rather than leaning on the FK: the
  -- FK would accept a soft-deleted song, which would then render as a blank
  -- row in the student's repertoire.
  if not exists (
    select 1 from public.songs
     where id = p_song_id and deleted_at is null
  ) then
    raise exception 'song % not available', p_song_id using errcode = 'check_violation';
  end if;

  insert into public.student_repertoire (student_id, song_id, current_status, added_by_student)
  values (v_student_id, p_song_id, 'to_learn', true)
  on conflict (student_id, song_id) do nothing;

  -- Re-read rather than using RETURNING: on conflict the insert returns no
  -- row, and the caller still wants the existing entry back so the UI can
  -- reflect the true state instead of reporting a failure.
  select * into v_row
    from public.student_repertoire
   where student_id = v_student_id and song_id = p_song_id;

  return v_row;
end;
$$;

-- Remove: only a student's own untouched pick. Once the status has moved past
-- `to_learn` or any practice has landed, the row represents real work (and may
-- have teacher lessons built around it), so this refuses rather than deleting.
-- Teacher-assigned rows are never removable this way.
create or replace function public.remove_song_from_my_repertoire(p_song_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid;
begin
  if not public.is_student() then
    raise exception 'only students can remove from their own repertoire' using errcode = 'check_violation';
  end if;

  v_student_id := public.current_profile_id();

  delete from public.student_repertoire
   where student_id = v_student_id
     and song_id = p_song_id
     and added_by_student = true
     and current_status = 'to_learn'
     and coalesce(practice_session_count, 0) = 0
     and coalesce(total_practice_minutes, 0) = 0;

  if not found then
    raise exception 'song % not removable by current student', p_song_id using errcode = 'check_violation';
  end if;
end;
$$;

grant execute on function public.add_song_to_my_repertoire(uuid) to authenticated;
grant execute on function public.remove_song_from_my_repertoire(uuid) to authenticated;
