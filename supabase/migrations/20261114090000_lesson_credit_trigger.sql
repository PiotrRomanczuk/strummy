-- A held lesson takes one lesson off the student's balance (blueprint 12, BIL-10).
--
-- A lesson counts when it is COMPLETED, not soft-deleted, and scheduled on or after the teacher's
-- billing_settings.billing_start_on (Europe/Warsaw calendar day). No start date means nothing counts: older
-- COMPLETED rows came from the historical calendar import and say nothing about what was paid.
--
-- The ledger row is derived state, so both functions converge on "one -1 entry per counted lesson" instead of
-- reacting to individual transitions: re-running them is always safe.

create or replace function public.lesson_counts_toward_balance(
  p_status public.lesson_status,
  p_deleted_at timestamptz,
  p_scheduled_at timestamptz,
  p_billing_start_on date
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select p_status = 'COMPLETED'
    and p_deleted_at is null
    and p_billing_start_on is not null
    and p_scheduled_at is not null
    and (p_scheduled_at at time zone 'Europe/Warsaw')::date >= p_billing_start_on;
$$;

-- Trigger: keep the lesson's ledger entry in step with the lesson row.
create or replace function public.sync_lesson_credit_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_start date;
begin
  select bs.billing_start_on into v_start
  from public.billing_settings bs
  where bs.teacher_id = new.teacher_id;

  if public.lesson_counts_toward_balance(new.status, new.deleted_at, new.scheduled_at, v_start)
     and new.student_id is not null then
    insert into public.lesson_credit_entries (teacher_id, student_id, delta, reason, lesson_id)
    values (new.teacher_id, new.student_id, -1, 'lesson', new.id)
    on conflict (lesson_id) where reason = 'lesson'
    do update set teacher_id = excluded.teacher_id, student_id = excluded.student_id;
  else
    delete from public.lesson_credit_entries
    where lesson_id = new.id and reason = 'lesson';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lessons_sync_credit_entry on public.lessons;
create trigger trg_lessons_sync_credit_entry
  after insert or update of status, deleted_at, scheduled_at, student_id, teacher_id
  on public.lessons
  for each row execute function public.sync_lesson_credit_entry();

-- Rebuild a teacher's lesson entries after billing_start_on changes: lessons that now fall before the start
-- date lose their entry, lessons that now fall after it gain one. Purchases and manual entries are untouched.
create or replace function public.rebuild_lesson_credit_entries(p_teacher_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_start date;
begin
  select bs.billing_start_on into v_start
  from public.billing_settings bs
  where bs.teacher_id = p_teacher_id;

  delete from public.lesson_credit_entries e
  using public.lessons l
  where e.reason = 'lesson'
    and e.lesson_id = l.id
    and l.teacher_id = p_teacher_id
    and not public.lesson_counts_toward_balance(l.status, l.deleted_at, l.scheduled_at, v_start);

  insert into public.lesson_credit_entries (teacher_id, student_id, delta, reason, lesson_id)
  select l.teacher_id, l.student_id, -1, 'lesson', l.id
  from public.lessons l
  where l.teacher_id = p_teacher_id
    and l.student_id is not null
    and public.lesson_counts_toward_balance(l.status, l.deleted_at, l.scheduled_at, v_start)
  on conflict (lesson_id) where reason = 'lesson' do nothing;
end;
$$;

-- Neither function is for signed-in users: the trigger runs on its own, the rebuild is called by the server.
revoke all on function public.sync_lesson_credit_entry() from public, anon, authenticated;
revoke all on function public.rebuild_lesson_credit_entries(uuid) from public, anon, authenticated;
grant execute on function public.rebuild_lesson_credit_entries(uuid) to service_role;
