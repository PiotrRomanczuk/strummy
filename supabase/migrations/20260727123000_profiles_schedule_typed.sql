-- Typed recurring-lesson schedule columns on public.profiles.
--
-- Date: 2026-07-27
-- Finding 6, docs/analysis/2026-07-27-migrations-architecture-review.md.
--
-- profiles.lesson_day (text, e.g. 'Thu') and profiles.lesson_time (text,
-- e.g. '4:00 PM') from 20260723120200 were free text: unsortable,
-- unvalidatable, and unusable for conflict detection or reminders. They are
-- replaced by:
--   * lesson_day_of_week smallint — ISO 8601 numbering, 1 = Monday … 7 = Sunday
--   * lesson_time_local  time     — studio-local wall-clock start time
--
-- Backfill parses the legacy text values; anything unparseable is left NULL
-- (never errors). The legacy text columns are then dropped — their
-- column-level constraints (none were defined) go with them.

-- ---------------------------------------------------------------------------
-- 1) New typed columns (idempotent).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists lesson_day_of_week smallint,
  add column if not exists lesson_time_local  time;

alter table public.profiles drop constraint if exists profiles_lesson_day_of_week_check;
alter table public.profiles
  add constraint profiles_lesson_day_of_week_check
  check (lesson_day_of_week is null or lesson_day_of_week between 1 and 7);

comment on column public.profiles.lesson_day_of_week is
  'Recurring lesson day of week — ISO 8601 numbering, 1 = Monday … 7 = Sunday';
comment on column public.profiles.lesson_time_local is
  'Recurring lesson start time (studio-local, no timezone)';

-- ---------------------------------------------------------------------------
-- 2) Backfill day-of-week from the legacy text column (case-insensitive
--    prefix match on Mon(day) … Sun(day)). Guarded so a replay after the
--    legacy column is dropped is a no-op.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'lesson_day'
  ) then
    execute $sql$
      update public.profiles
      set lesson_day_of_week = case lower(left(btrim(lesson_day), 3))
        when 'mon' then 1
        when 'tue' then 2
        when 'wed' then 3
        when 'thu' then 4
        when 'fri' then 5
        when 'sat' then 6
        when 'sun' then 7
      end
      where lesson_day_of_week is null
        and lesson_day is not null
    $sql$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3) Backfill time from the legacy text column. Only values matching
--    h:mm AM/PM (case-insensitive) are parsed; junk stays NULL.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'lesson_time'
  ) then
    execute $sql$
      update public.profiles
      set lesson_time_local = to_timestamp(upper(btrim(lesson_time)), 'HH12:MI AM')::time
      where lesson_time_local is null
        and lesson_time is not null
        and btrim(lesson_time) ~* '^\d{1,2}:\d{2}\s*(AM|PM)$'
    $sql$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4) Drop the legacy free-text columns.
-- ---------------------------------------------------------------------------
alter table public.profiles drop column if exists lesson_day;
alter table public.profiles drop column if exists lesson_time;
