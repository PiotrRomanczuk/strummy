-- Migration: teacher_settings (studio profile) + user_preferences.daily_goal_minutes
-- ============================================================================
-- Backs the editorial onboarding wizard (components/v2/onboarding/editorial/*).
--
--   * teacher_settings — one row per teacher profile, captured during the
--     teacher studio-setup flow (About you + Your studio steps): owner display
--     name, instrument, years of experience, studio name, tagline, city,
--     timezone, what they teach, and the default lesson length. This is the
--     public-facing "studio" identity previewed live in the wizard.
--
--   * user_preferences.daily_goal_minutes — the student "daily practice target"
--     picked in the student onboarding step. The rest of the student answers
--     (skill_level / goals / learning_style) already persist to user_preferences.
--
-- Idempotent (`create table if not exists`, `add column if not exists`,
-- `drop policy if exists` before create) so it is safe to replay on a drifted
-- stack. RLS matches this stack's helpers (is_admin / is_teacher /
-- current_profile_id) and the assignment_templates convention.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- teacher_settings
-- ---------------------------------------------------------------------------
create table if not exists public.teacher_settings (
  id                     uuid primary key default gen_random_uuid(),
  profile_id             uuid not null unique references public.profiles (id) on delete cascade,
  display_name           text,
  instrument             text,
  years_experience       integer,
  studio_name            text,
  tagline                text,
  city                   text,
  timezone               text,
  teaches                text[] not null default '{}',
  default_lesson_minutes integer,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Idempotent column adds for DBs where the table pre-exists in an older shape.
alter table public.teacher_settings
  add column if not exists display_name           text,
  add column if not exists instrument             text,
  add column if not exists years_experience       integer,
  add column if not exists studio_name            text,
  add column if not exists tagline                text,
  add column if not exists city                   text,
  add column if not exists timezone               text,
  add column if not exists teaches                text[] not null default '{}',
  add column if not exists default_lesson_minutes integer;

alter table public.teacher_settings
  drop constraint if exists teacher_settings_years_experience_check;
alter table public.teacher_settings
  add constraint teacher_settings_years_experience_check
  check (years_experience is null or years_experience >= 0);

alter table public.teacher_settings
  drop constraint if exists teacher_settings_default_lesson_minutes_check;
alter table public.teacher_settings
  add constraint teacher_settings_default_lesson_minutes_check
  check (default_lesson_minutes is null or default_lesson_minutes > 0);

create index if not exists idx_teacher_settings_profile_id
  on public.teacher_settings (profile_id);

drop trigger if exists trg_teacher_settings_set_updated_at on public.teacher_settings;
create trigger trg_teacher_settings_set_updated_at
  before update on public.teacher_settings
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.teacher_settings to authenticated;
grant all on public.teacher_settings to service_role;

alter table public.teacher_settings enable row level security;

drop policy if exists teacher_settings_select on public.teacher_settings;
create policy teacher_settings_select on public.teacher_settings
  for select to authenticated
  using (public.is_admin() or public.is_teacher() or profile_id = public.current_profile_id());

drop policy if exists teacher_settings_insert on public.teacher_settings;
create policy teacher_settings_insert on public.teacher_settings
  for insert to authenticated
  with check (public.is_admin()
              or (public.is_teacher() and profile_id = public.current_profile_id()));

drop policy if exists teacher_settings_update on public.teacher_settings;
create policy teacher_settings_update on public.teacher_settings
  for update to authenticated
  using (public.is_admin() or profile_id = public.current_profile_id())
  with check (public.is_admin() or profile_id = public.current_profile_id());

drop policy if exists teacher_settings_delete on public.teacher_settings;
create policy teacher_settings_delete on public.teacher_settings
  for delete to authenticated
  using (public.is_admin() or profile_id = public.current_profile_id());

comment on table  public.teacher_settings                        is 'Per-teacher studio profile captured during onboarding (public-facing studio identity).';
comment on column public.teacher_settings.display_name           is 'Owner display name shown to students/parents.';
comment on column public.teacher_settings.instrument             is 'Primary instrument the teacher teaches (e.g. Guitar).';
comment on column public.teacher_settings.years_experience       is 'Years of teaching experience.';
comment on column public.teacher_settings.studio_name            is 'Public studio name (e.g. "Sarah Chen Guitar Studio").';
comment on column public.teacher_settings.tagline                is 'One-line studio tagline.';
comment on column public.teacher_settings.city                   is 'Studio city / location label.';
comment on column public.teacher_settings.timezone               is 'Studio timezone label (e.g. "Pacific (UTC-7)").';
comment on column public.teacher_settings.teaches                is 'Styles/instruments taught (e.g. {Acoustic,Electric,Classical}).';
comment on column public.teacher_settings.default_lesson_minutes is 'Default lesson length in minutes (e.g. 45).';

-- ---------------------------------------------------------------------------
-- user_preferences.daily_goal_minutes (student daily practice target)
-- ---------------------------------------------------------------------------
alter table public.user_preferences
  add column if not exists daily_goal_minutes integer;

alter table public.user_preferences
  drop constraint if exists user_preferences_daily_goal_minutes_check;
alter table public.user_preferences
  add constraint user_preferences_daily_goal_minutes_check
  check (daily_goal_minutes is null or daily_goal_minutes > 0);

comment on column public.user_preferences.daily_goal_minutes is 'Student daily practice target in minutes, set during onboarding.';
