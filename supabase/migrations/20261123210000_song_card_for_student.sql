-- A student's song card (SNG-17): the song's recording analysis and the teacher's review, cut to what a student
-- plays from. `song_analyses`, `song_segments` and `song_card_reviews` stay staff-only (RLS); this function is
-- the one way a student reads them, and only for a song in their own repertoire.
--
-- Returned: {analysis, segments, review}
--   analysis  the drawn JSON paths of song_analyses.analysis — bars, chords per bar, key, tempo, the guitar's
--             strum pattern only (no other tracks), no capo advice
--   segments  the parts with their names, bars, times, chords and loop — no degrees, bass, drums or levels
--   review    the teacher's approvals, strums and chord corrections
-- Null when the caller may not see the song's card or the song has no analysis.

create or replace function public.song_card_for_student(p_song_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile uuid := public.current_profile_id();
  v_analysis jsonb;
  v_segments jsonb;
  v_review jsonb;
begin
  if v_profile is null then
    return null;
  end if;
  if not public.is_admin_or_teacher() and not exists (
    select 1 from public.student_repertoire r where r.song_id = p_song_id and r.student_id = v_profile
  ) then
    return null;
  end if;

  select jsonb_build_object(
      'source_url', a.source_url,
      'created', a.analysis -> 'created',
      'duration_s', a.analysis -> 'duration_s',
      'grid', a.analysis -> 'grid',
      'key', a.analysis -> 'key',
      'chords', a.analysis -> 'chords',
      'rhythm', (
        select coalesce(jsonb_agg(t), '[]'::jsonb)
        from jsonb_array_elements(coalesce(a.analysis -> 'rhythm', '[]'::jsonb)) as t
        where t ->> 'track' = 'Gitara'
      ),
      'capo', null
    )
    into v_analysis
  from public.song_analyses a
  where a.song_id = p_song_id;
  if v_analysis is null then
    return null;
  end if;

  select jsonb_build_object(
      'recording_url', s.recording_url,
      'parts', (
        select jsonb_agg(
          jsonb_build_object(
            'n', p -> 'n', 'label', p -> 'label', 'name', p -> 'name', 'repeat_of', p -> 'repeat_of',
            'first_bar', p -> 'first_bar', 'bars', p -> 'bars', 'start_s', p -> 'start_s', 'end_s', p -> 'end_s',
            'bpm', p -> 'bpm', 'vocals', p -> 'vocals', 'chords', p -> 'chords', 'loop', p -> 'loop',
            'roman', '[]'::jsonb, 'drums', null, 'bass', null, 'levels', '{}'::jsonb
          ) order by ord
        )
        from jsonb_array_elements(s.parts) with ordinality as x (p, ord)
      ),
      'bass_bars', (select jsonb_agg(null::jsonb) from jsonb_array_elements(s.parts))
    )
    into v_segments
  from public.song_segments s
  where s.song_id = p_song_id;

  select jsonb_build_object(
      'recording_url', r.recording_url,
      'approved_groups', to_jsonb(r.approved_groups),
      'strums', r.strums,
      'chord_edits', r.chord_edits
    )
    into v_review
  from public.song_card_reviews r
  where r.song_id = p_song_id;

  return jsonb_build_object('analysis', v_analysis, 'segments', v_segments, 'review', v_review);
end;
$$;

revoke all on function public.song_card_for_student(uuid) from public;
revoke all on function public.song_card_for_student(uuid) from anon;
grant execute on function public.song_card_for_student(uuid) to authenticated;
