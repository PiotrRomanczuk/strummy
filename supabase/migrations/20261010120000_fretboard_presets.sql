-- Fretboard presets — the Claude Design "Save preset" action on the fretboard
-- explorer. A preset is a named fretboard view (key, mode, scale/chord, CAGED,
-- style) stored as the same query string the shareable link carries, so
-- loading one is just opening that link. Rows are private to their owner.

create table if not exists public.fretboard_presets (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  query       text not null check (char_length(query) between 1 and 300),
  created_at  timestamptz not null default now()
);

create index if not exists ix_fretboard_presets_profile
  on public.fretboard_presets (profile_id, created_at desc);

alter table public.fretboard_presets enable row level security;

drop policy if exists fretboard_presets_select_own on public.fretboard_presets;
create policy fretboard_presets_select_own on public.fretboard_presets
  for select using (profile_id = public.current_profile_id());

drop policy if exists fretboard_presets_insert_own on public.fretboard_presets;
create policy fretboard_presets_insert_own on public.fretboard_presets
  for insert with check (profile_id = public.current_profile_id());

drop policy if exists fretboard_presets_delete_own on public.fretboard_presets;
create policy fretboard_presets_delete_own on public.fretboard_presets
  for delete using (profile_id = public.current_profile_id());

grant select, insert, delete on public.fretboard_presets to authenticated;

comment on table public.fretboard_presets is
  'Saved fretboard explorer views, private to their owner. query = the shareable-link search string.';
