-- Single source of truth for skill_level: public.profiles.
--
-- Date: 2026-07-27
-- Finding 5, docs/analysis/2026-07-27-migrations-architecture-review.md.
--
-- skill_level previously lived in TWO places:
--   * user_preferences.skill_level — written by the onboarding action
--     (app/actions/onboarding.ts completeOnboarding), read by the teacher
--     detail view (lib/services/student-detail-queries.ts
--     getStudentPreferences);
--   * profiles.skill_level — written by the student intake form / users API
--     (added by 20260723120200_profiles_student_fields.sql).
--
-- profiles.skill_level is now the single home. In the same change, the
-- onboarding writer (completeOnboarding) and the detail-view reader
-- (getStudentPreferences) both move to profiles.skill_level;
-- user_preferences keeps goals / learning_style / daily_goal_minutes.
--
-- user_preferences is NOT created by the active migration chain (it exists
-- only via the baseline dump — finding 3), so every reference to it is
-- guarded with to_regclass + EXECUTE and this file replays cleanly on a
-- stack that never had the table.

-- ---------------------------------------------------------------------------
-- 1) Backfill: copy onboarding-captured levels onto profiles where the
--    profile has none. user_preferences.user_id is PROFILE-id space
--    (FK → public.profiles(id) — despite the name), so the join is on p.id.
--    Guarded on COLUMN existence so a re-run after step 2 is a no-op.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_preferences'
      and column_name = 'skill_level'
  ) then
    execute $sql$
      update public.profiles p
      set skill_level = up.skill_level
      from public.user_preferences up
      where up.user_id = p.id
        and p.skill_level is null
        and up.skill_level is not null
    $sql$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2) Drop the duplicated column (idempotent).
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.user_preferences') is not null then
    execute 'alter table public.user_preferences drop column if exists skill_level';
  end if;
end
$$;
