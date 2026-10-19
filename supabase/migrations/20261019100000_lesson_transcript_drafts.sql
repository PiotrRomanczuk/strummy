-- Lesson drafts from transcripts (CNT-8, docs/app-blueprint/09-content-production.md).
--
-- The `lesson-transcript-draft` agent reads a lesson's transcript and proposes
-- what to write back: songs + statuses, notes, homework, skills. The proposal
-- is stored next to the transcript and only reaches lessons / lesson_songs /
-- assignments / student_skills when the teacher applies it. One draft per
-- transcript (regenerating overwrites it), so it lives on the same row and
-- inherits its can_manage_lesson RLS — the student never reads it.

alter table public.lesson_transcripts
  add column if not exists draft              jsonb,
  add column if not exists draft_status       text not null default 'none',
  add column if not exists draft_model        text,
  add column if not exists draft_error        text,
  add column if not exists draft_generated_at timestamptz,
  add column if not exists draft_applied_at   timestamptz;

alter table public.lesson_transcripts
  drop constraint if exists lesson_transcripts_draft_status_check;
alter table public.lesson_transcripts
  add constraint lesson_transcripts_draft_status_check
  check (draft_status = any (array['none', 'ready', 'failed', 'applied', 'dismissed']));

alter table public.lesson_transcripts
  drop constraint if exists lesson_transcripts_draft_error_length;
alter table public.lesson_transcripts
  add constraint lesson_transcripts_draft_error_length
  check (draft_error is null or char_length(draft_error) <= 1000);

comment on column public.lesson_transcripts.draft is
  'Resolved LessonDraft (lib/ai/schemas/lesson-transcript-draft.ts) awaiting teacher review.';
comment on column public.lesson_transcripts.draft_status is
  'none → ready|failed → applied|dismissed. Applied drafts are never re-applied.';

-- ai_generations.generation_type is an enum; the draft agent logs under its own type.
alter type public.ai_generation_type add value if not exists 'lesson_transcript_draft';
