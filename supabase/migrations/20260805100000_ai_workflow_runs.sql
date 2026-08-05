-- AI workflow runs: explicit-state orchestrator for multi-step agent
-- pipelines (AIA-3, docs/app-blueprint/08-ai-assistant.md).
--
-- Unlike ai_generations (a log of one-shot agent outputs), a workflow run
-- is a *process in progress*: current_step + step_results are checkpointed
-- after every step so a crash mid-pipeline resumes instead of restarting.
-- Keeping this as its own table (not bolted onto ai_generations) follows
-- structure.md S2/S3 — a log and a process state are different things and
-- mixing them is exactly the duplication pattern that doc warns about.
--
-- Scope: one active run per lesson, teacher/admin only (AI surface has no
-- student access per docs/app-blueprint/08-ai-assistant.md).

create table if not exists public.ai_workflow_runs (
  id             uuid primary key default gen_random_uuid(),
  workflow_type  text not null check (workflow_type in ('post-lesson')),
  lesson_id      uuid not null references public.lessons (id) on delete cascade,
  status         text not null default 'running'
                 check (status in ('running', 'awaiting_review', 'done', 'failed')),
  current_step   text not null,
  input          jsonb not null default '{}'::jsonb,
  step_results   jsonb not null default '{}'::jsonb,
  created_by     uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One in-flight run per lesson: a second start must wait for/replace the
-- first rather than silently racing it.
create unique index if not exists ux_ai_workflow_runs_active_per_lesson
  on public.ai_workflow_runs (lesson_id)
  where status in ('running', 'awaiting_review');

create index if not exists ix_ai_workflow_runs_lesson
  on public.ai_workflow_runs (lesson_id);

drop trigger if exists trg_ai_workflow_runs_set_updated_at on public.ai_workflow_runs;
create trigger trg_ai_workflow_runs_set_updated_at
  before update on public.ai_workflow_runs
  for each row execute function public.set_updated_at();

grant select, insert, update on public.ai_workflow_runs to authenticated;
grant all on public.ai_workflow_runs to service_role;

alter table public.ai_workflow_runs enable row level security;

-- Reuses can_manage_lesson (lessons.sql): admin or the lesson's own teacher.
drop policy if exists ai_workflow_runs_select_manager on public.ai_workflow_runs;
create policy ai_workflow_runs_select_manager on public.ai_workflow_runs
  for select to authenticated
  using (public.can_manage_lesson(lesson_id));

drop policy if exists ai_workflow_runs_insert_manager on public.ai_workflow_runs;
create policy ai_workflow_runs_insert_manager on public.ai_workflow_runs
  for insert to authenticated
  with check (public.can_manage_lesson(lesson_id) and created_by = public.current_profile_id());

drop policy if exists ai_workflow_runs_update_manager on public.ai_workflow_runs;
create policy ai_workflow_runs_update_manager on public.ai_workflow_runs
  for update to authenticated
  using (public.can_manage_lesson(lesson_id))
  with check (public.can_manage_lesson(lesson_id));
