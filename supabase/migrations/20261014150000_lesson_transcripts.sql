-- Lesson transcripts (CNT-5, docs/app-blueprint/09-content-production.md).
--
-- One speaker-labelled text transcript per lesson, pushed in by an external
-- recorder (Wispr Flow via /api/transcripts/ingest) or pasted/uploaded later.
-- Raw transcripts quote students and third parties by name, so the student
-- role never reads them: every policy goes through can_manage_lesson
-- (lessons.sql — admin or the lesson's own teacher).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'transcript_source') then
    create type public.transcript_source as enum ('wispr', 'paste', 'upload');
  end if;
end
$$;

create table if not exists public.lesson_transcripts (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null unique references public.lessons (id) on delete cascade,
  source       public.transcript_source not null,
  external_id  text,
  recorded_at  timestamptz,
  ended_at     timestamptz,
  summary      text check (summary is null or char_length(summary) <= 20000),
  body         text not null check (char_length(body) <= 100000),
  language     text not null default 'pl',
  share_link   text,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- The recorder's own id makes a second push of the same recording an update,
-- not a duplicate. NULL for pasted/uploaded transcripts.
create unique index if not exists ux_lesson_transcripts_external_id
  on public.lesson_transcripts (external_id)
  where external_id is not null;

drop trigger if exists trg_lesson_transcripts_set_updated_at on public.lesson_transcripts;
create trigger trg_lesson_transcripts_set_updated_at
  before update on public.lesson_transcripts
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.lesson_transcripts to authenticated;
grant all on public.lesson_transcripts to service_role;

alter table public.lesson_transcripts enable row level security;

drop policy if exists lesson_transcripts_select_manager on public.lesson_transcripts;
create policy lesson_transcripts_select_manager on public.lesson_transcripts
  for select to authenticated
  using (public.can_manage_lesson(lesson_id));

drop policy if exists lesson_transcripts_insert_manager on public.lesson_transcripts;
create policy lesson_transcripts_insert_manager on public.lesson_transcripts
  for insert to authenticated
  with check (public.can_manage_lesson(lesson_id));

drop policy if exists lesson_transcripts_update_manager on public.lesson_transcripts;
create policy lesson_transcripts_update_manager on public.lesson_transcripts
  for update to authenticated
  using (public.can_manage_lesson(lesson_id))
  with check (public.can_manage_lesson(lesson_id));

drop policy if exists lesson_transcripts_delete_manager on public.lesson_transcripts;
create policy lesson_transcripts_delete_manager on public.lesson_transcripts
  for delete to authenticated
  using (public.can_manage_lesson(lesson_id));
