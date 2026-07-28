-- Role helpers + lesson-number trigger: capture un-filed dev changes.
--
-- The 2026-07-28 dev/prod schema parity check found these five functions
-- differed: during the S2 identity work the role helpers were rewritten on the
-- dev stack ad-hoc (profiles.user_id lookup + initplan-wrapped auth.uid()) and
-- set_lesson_number gained an advisory lock + pinned search_path, but no
-- migration file captured either change. This file is that capture — bodies
-- are verbatim pg_get_functiondef() output from StudentDevelopment.
-- Idempotent: CREATE OR REPLACE throughout.

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin);
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_or_teacher()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and (p.is_admin or p.is_teacher));
$function$;

CREATE OR REPLACE FUNCTION public.is_student()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_student);
$function$;

CREATE OR REPLACE FUNCTION public.is_teacher()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_teacher);
$function$;

CREATE OR REPLACE FUNCTION public.set_lesson_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.lesson_teacher_number is null then
    perform pg_advisory_xact_lock(hashtext(new.teacher_id::text || ':' || new.student_id::text));
    select coalesce(max(lesson_teacher_number), 0) + 1
      into new.lesson_teacher_number
      from public.lessons
     where teacher_id = new.teacher_id and student_id = new.student_id;
  end if;
  return new;
end;
$function$;
