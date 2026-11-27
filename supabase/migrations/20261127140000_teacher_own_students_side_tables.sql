-- A teacher sees and changes only their own students' rows in the per-student side tables (owner decision
-- 2026-11-27). Admins keep full access; students keep their own-row policies, which this file does not touch.
-- None of these tables has a parent policy.
--
-- Until now the staff policies on chord_quiz_attempts, chord_srs, student_skills, song_requests and
-- song_status_history checked only is_admin_or_teacher(), so every teacher reached every student's rows.
-- Lessons were narrowed the same way in 20261125200000.
--
-- "Own student" is the one membership definition the app has (Teaches, CONTEXT.md): a non-deleted lesson
-- between the two. public.teacher_teaches_student(teacher, student) is that check (SECURITY DEFINER, so it
-- sees other teachers' lessons too); it is also the first half of may_teach_student(). The second half of
-- may_teach_student() ("nobody teaches this student yet") is right for creating a first lesson and wrong for
-- reading data, so it is not used here.
--
-- Each policy is dropped and recreated under the same name, with the same command and the same role list as
-- before except for `to authenticated` (anon has no profile, so it never passed is_admin_or_teacher()).
-- The skills catalog (public.skills) is shared and is left as it is.

-- chord_quiz_attempts: staff read ------------------------------------------------------------------------------

drop policy if exists "Admins and teachers can view all chord quiz attempts" on public.chord_quiz_attempts;
create policy "Admins and teachers can view all chord quiz attempts" on public.chord_quiz_attempts
  for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_teacher())
        and public.teacher_teaches_student((select public.current_profile_id()), student_id))
  );

-- chord_srs: staff read ----------------------------------------------------------------------------------------

drop policy if exists "Staff read all SRS state" on public.chord_srs;
create policy "Staff read all SRS state" on public.chord_srs
  for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_teacher())
        and public.teacher_teaches_student((select public.current_profile_id()), student_id))
  );

-- student_skills: staff read + manage --------------------------------------------------------------------------

drop policy if exists "Admins and teachers can view all student skills" on public.student_skills;
create policy "Admins and teachers can view all student skills" on public.student_skills
  for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_teacher())
        and public.teacher_teaches_student((select public.current_profile_id()), student_id))
  );

drop policy if exists "Admins and teachers can manage student skills" on public.student_skills;
create policy "Admins and teachers can manage student skills" on public.student_skills
  for all to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_teacher())
        and public.teacher_teaches_student((select public.current_profile_id()), student_id))
  )
  with check (
    (select public.is_admin())
    or ((select public.is_teacher())
        and public.teacher_teaches_student((select public.current_profile_id()), student_id))
  );

-- song_requests: staff read + review ---------------------------------------------------------------------------

drop policy if exists "Teachers can read all requests" on public.song_requests;
create policy "Teachers can read all requests" on public.song_requests
  for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_teacher())
        and public.teacher_teaches_student((select public.current_profile_id()), student_id))
  );

drop policy if exists "Teachers can update requests" on public.song_requests;
create policy "Teachers can update requests" on public.song_requests
  for update to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_teacher())
        and public.teacher_teaches_student((select public.current_profile_id()), student_id))
  )
  with check (
    (select public.is_admin())
    or ((select public.is_teacher())
        and public.teacher_teaches_student((select public.current_profile_id()), student_id))
  );

-- song_status_history: staff read (rows are written by trigger only) -----------------------------------------

drop policy if exists "Teachers and admins can view all song status history" on public.song_status_history;
create policy "Teachers and admins can view all song status history" on public.song_status_history
  for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_teacher())
        and public.teacher_teaches_student((select public.current_profile_id()), student_id))
  );
