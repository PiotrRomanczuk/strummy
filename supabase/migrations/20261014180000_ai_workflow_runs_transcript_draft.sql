-- Transcript → lesson draft (CNT-6 / CNT-8) persists its reviewable draft as
-- an `ai_workflow_runs` row with `workflow_type = 'transcript-draft'` and
-- status `awaiting_review` (docs/app-blueprint/09-content-production.md).
--
-- Two changes:
-- 1. widen the workflow_type check to admit the new type;
-- 2. scope the "one active run per lesson" index per workflow type — a
--    post-lesson run awaiting review must not block a transcript draft on the
--    same lesson (and vice versa). One active run per (lesson, type) stays.

alter table public.ai_workflow_runs
  drop constraint if exists ai_workflow_runs_workflow_type_check;

alter table public.ai_workflow_runs
  add constraint ai_workflow_runs_workflow_type_check
  check (workflow_type in ('post-lesson', 'transcript-draft'));

drop index if exists public.ux_ai_workflow_runs_active_per_lesson;

create unique index if not exists ux_ai_workflow_runs_active_per_lesson_type
  on public.ai_workflow_runs (lesson_id, workflow_type)
  where status in ('running', 'awaiting_review');
