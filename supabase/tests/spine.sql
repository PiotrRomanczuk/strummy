\set ON_ERROR_STOP on
\pset pager off

-- ===================== Phase 1 spine gate tests =====================
-- Steps 2-5: songs, lessons, lesson_songs, assignments.
-- Self-contained fixtures (own auth users). Impersonation pattern:
--   select set_config('request.jwt.claim.sub', '<uuid>', false); set role authenticated; ... reset role;
-- Negative RLS tests look up ids INSIDE the DO block (no psql-var interpolation in $$).

create temp table results (label text, pass boolean);

-- ---- fixtures (run as superuser: bypasses RLS) ----
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','teacher@t.local','{}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','student@t.local','{}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','teacher2@t.local','{}'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','admin@t.local','{}');
update public.profiles set is_teacher=true where user_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update public.profiles set is_student=true where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
update public.profiles set is_teacher=true where user_id='cccccccc-cccc-cccc-cccc-cccccccccccc';
update public.profiles set is_admin=true  where user_id='dddddddd-dddd-dddd-dddd-dddddddddddd';

select id from public.profiles where user_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' \gset teacher_
select id from public.profiles where user_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' \gset student_

-- ===================== SONGS =====================
\echo '== songs =='
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
set role authenticated;
insert into public.songs (title, author, level, key) values ('Wonderwall','Oasis','beginner','Em');
reset role;
insert into results select 'teacher can insert song', exists(select 1 from public.songs where title='Wonderwall');

select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
set role authenticated;
do $$ begin
  insert into public.songs(title) values ('hack-by-student');
  perform set_config('test.r','FAIL',false);
exception when others then perform set_config('test.r','PASS',false);
end $$;
select count(*) as c from public.songs where title='Wonderwall' \gset stud_read_
reset role;
insert into results select 'student cannot insert song', current_setting('test.r')='PASS';
insert into results select 'student can read shared song', :stud_read_c = 1;

select id from public.songs where title='Wonderwall' \gset song_

-- ===================== LESSONS =====================
\echo '== lessons =='
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
set role authenticated;
insert into public.lessons (teacher_id, student_id, scheduled_at) values (:'teacher_id', :'student_id', now());
insert into public.lessons (teacher_id, student_id, scheduled_at) values (:'teacher_id', :'student_id', now() + interval '7 days');
reset role;
insert into results select 'lesson numbers auto-assigned 1..2',
  (select array_agg(lesson_teacher_number order by lesson_teacher_number)
     from public.lessons where teacher_id = :'teacher_id') = array[1,2];

select id from public.lessons where teacher_id = :'teacher_id' order by lesson_teacher_number limit 1 \gset lesson_

-- teacher2 (different teacher) must not be able to modify teacher's lesson
select set_config('request.jwt.claim.sub','cccccccc-cccc-cccc-cccc-cccccccccccc',false);
set role authenticated;
update public.lessons set notes='hax' where id = :'lesson_id';
reset role;
insert into results select 'other teacher cannot modify lesson (IDOR)',
  (select notes is distinct from 'hax' from public.lessons where id = :'lesson_id');

-- student can see own lesson, cannot update it
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
set role authenticated;
select count(*) as c from public.lessons where id = :'lesson_id' \gset stud_lesson_
update public.lessons set notes='stu' where id = :'lesson_id';
reset role;
insert into results select 'student sees own lesson', :stud_lesson_c = 1;
insert into results select 'student cannot update lesson',
  (select notes is distinct from 'stu' from public.lessons where id = :'lesson_id');

-- ===================== LESSON_SONGS =====================
\echo '== lesson_songs =='
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
set role authenticated;
insert into public.lesson_songs (lesson_id, song_id) values (:'lesson_id', :'song_id');
update public.lesson_songs set status='slow_tempo' where lesson_id = :'lesson_id' and song_id = :'song_id';
reset role;
insert into results select 'lesson_song attaches + slow_tempo status ok',
  (select status::text from public.lesson_songs where lesson_id = :'lesson_id') = 'slow_tempo';

select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
set role authenticated;
select count(*) as c from public.lesson_songs where lesson_id = :'lesson_id' \gset stud_ls_
reset role;
insert into results select 'student sees lesson_song of own lesson', :stud_ls_c = 1;

-- ===================== ASSIGNMENTS =====================
\echo '== assignments =='
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
set role authenticated;
insert into public.assignments (teacher_id, student_id, title, status)
  values (:'teacher_id', :'student_id', 'Practice Em', 'not_started');
reset role;
insert into results select 'teacher created assignment', exists(select 1 from public.assignments where title='Practice Em');
select id from public.assignments where title='Practice Em' \gset asg_

-- student updates status via the SECURITY DEFINER function
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
set role authenticated;
select public.set_assignment_status(:'asg_id', 'completed');
reset role;
insert into results select 'student set own status via fn',
  (select status::text from public.assignments where id = :'asg_id') = 'completed';

-- student cannot direct-UPDATE the assignment (RLS: teacher/admin only)
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
set role authenticated;
update public.assignments set title='hax' where id = :'asg_id';
reset role;
insert into results select 'student cannot direct-update assignment',
  (select title from public.assignments where id = :'asg_id') = 'Practice Em';

-- set_assignment_status refuses a non-owned assignment (teacher is not the student)
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
set role authenticated;
do $$
declare v uuid;
begin
  select id into v from public.assignments where title='Practice Em';
  perform public.set_assignment_status(v, 'cancelled');
  perform set_config('test.r','FAIL',false);
exception when others then perform set_config('test.r','PASS',false);
end $$;
reset role;
insert into results select 'set_assignment_status refuses non-owner', current_setting('test.r')='PASS';

-- ===================== report =====================
\echo '== RESULTS =='
select label, pass from results order by label;
select count(*) filter (where not pass) as failing, count(*) as total from results;
