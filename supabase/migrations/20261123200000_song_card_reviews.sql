-- The teacher's review of a song card (SNG-17): the chords of the recording analysis are a proposal (about 60–65%
-- major/minor agreement on the reference songs), the strum direction is a rule, not heard. One row per song:
--
--   recording_url    the analysed recording the review belongs to; the card ignores a review of another recording
--                    (its bars and groups would not match)
--   approved_groups  groups of parts whose chords the teacher approved — a group is one kind of part built on one
--                    loop, e.g. "chorus:IV-V-I-vi" for every chorus (the card computes the keys)
--   strums           per group, the teacher's strum of a bar: 16 marks, d (down) u (up) m (muted) . (rest)
--   chord_edits      per bar (0-based index of the analysis' bars), the teacher's chord for the whole bar
--
-- Staff read and write (RLS). Students read the approved card through a security definer function (SNG-17 step 6).

create table if not exists public.song_card_reviews (
  song_id uuid primary key references public.songs (id) on delete cascade,
  recording_url text not null,
  approved_groups text[] not null default '{}',
  strums jsonb not null default '{}'::jsonb,
  chord_edits jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint song_card_reviews_strums_object check (jsonb_typeof(strums) = 'object'),
  constraint song_card_reviews_chord_edits_object check (jsonb_typeof(chord_edits) = 'object')
);

drop trigger if exists trg_song_card_reviews_set_updated_at on public.song_card_reviews;
create trigger trg_song_card_reviews_set_updated_at
  before update on public.song_card_reviews
  for each row execute function public.set_updated_at();

grant select, insert, update on public.song_card_reviews to authenticated;
grant all on public.song_card_reviews to service_role;

alter table public.song_card_reviews enable row level security;

drop policy if exists song_card_reviews_select_staff on public.song_card_reviews;
create policy song_card_reviews_select_staff on public.song_card_reviews
  for select
  to authenticated
  using (public.is_admin_or_teacher());

drop policy if exists song_card_reviews_insert_staff on public.song_card_reviews;
create policy song_card_reviews_insert_staff on public.song_card_reviews
  for insert
  to authenticated
  with check (public.is_admin_or_teacher());

drop policy if exists song_card_reviews_update_staff on public.song_card_reviews;
create policy song_card_reviews_update_staff on public.song_card_reviews
  for update
  to authenticated
  using (public.is_admin_or_teacher())
  with check (public.is_admin_or_teacher());
