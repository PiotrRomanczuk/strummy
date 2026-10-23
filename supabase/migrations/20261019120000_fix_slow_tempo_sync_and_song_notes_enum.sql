-- Two latent bugs found while building CNT-8 (2026-10-19).
--
-- 1) lesson_song_status has 'slow_tempo'; song_progress_status (the
--    repertoire's type) does not. fn_sync_lesson_song_to_repertoire cast one
--    to the other, so ANY insert/update of lesson_songs with 'slow_tempo'
--    raised "invalid input value for enum song_progress_status" and the write
--    was lost. For the repertoire, playing a song at a slow tempo is still
--    'started' — map it there; the lesson keeps its finer status.
--
-- 2) ai_generations.generation_type is an enum without 'song_notes', while
--    the app logs song-notes generations under that type: every such insert
--    failed (silently — saveAIGeneration swallows errors).

create or replace function public.fn_sync_lesson_song_to_repertoire()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_student_id     uuid;
    v_repertoire_id  uuid;
    v_current_status song_progress_status;
    -- The repertoire has no 'slow_tempo': it is still 'started' there.
    v_status_text    text := case NEW.status::text when 'slow_tempo' then 'started' else NEW.status::text end;
    v_new_status     song_progress_status := v_status_text::song_progress_status;
    -- array_position is 1-indexed: to_learn=1, started=2, ..., mastered=5
    v_status_order   text[] := array['to_learn','started','remembered','with_author','mastered'];
    v_new_idx        int;
    v_cur_idx        int;
begin
    -- Look up the student from the parent lesson
    select student_id into v_student_id
    from lessons
    where id = NEW.lesson_id;

    -- Nothing to sync if lesson has no student (shouldn't happen, but be safe)
    if v_student_id is null then
        return NEW;
    end if;

    -- Ensure a student_repertoire entry exists for this student+song pair
    insert into student_repertoire (student_id, song_id, current_status)
    values (v_student_id, NEW.song_id, v_new_status)
    on conflict (student_id, song_id) do nothing;

    -- Fetch the entry (either the one we just created or the pre-existing one)
    select id, current_status
    into v_repertoire_id, v_current_status
    from student_repertoire
    where student_id = v_student_id and song_id = NEW.song_id;

    -- Link lesson_songs.repertoire_id if not already set
    if NEW.repertoire_id is null then
        NEW.repertoire_id := v_repertoire_id;
    end if;

    -- Forward-only status cascade
    v_new_idx := array_position(v_status_order, v_status_text);
    v_cur_idx := array_position(v_status_order, v_current_status::text);

    if v_new_idx > v_cur_idx then
        update student_repertoire
        set
            current_status = v_new_status,
            -- Set started_at the first time the student moves past 'to_learn'
            started_at = case
                when v_cur_idx = 1 and started_at is null then now()
                else started_at
            end,
            -- Set mastered_at the first time 'mastered' is reached
            mastered_at = case
                when v_new_idx = 5 and mastered_at is null then now()
                else mastered_at
            end
        where id = v_repertoire_id;
    end if;

    return NEW;
end;
$function$;

alter type public.ai_generation_type add value if not exists 'song_notes';
