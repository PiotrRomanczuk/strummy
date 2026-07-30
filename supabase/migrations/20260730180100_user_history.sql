-- Restore public.user_history (student status-change audit trail).
--
-- lib/services/student-activity-service.ts and student-activity-helpers.ts
-- both insert into user_history on every automatic student status change, but
-- the table was not carried into the rebuilt schema — one call site logged the
-- resulting error daily, the other swallowed it, and the audit trail was lost.
--
-- Shape matches exactly what those two call sites already insert.
--
-- Writes come from the daily cron via the service-role client (which bypasses
-- RLS), so no INSERT policy for `authenticated` is granted here — nothing in a
-- user-facing path writes history. Reads are admin-only, matching the existing
-- auth_events audit-table precedent.

create table if not exists public.user_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  changed_by    uuid references public.profiles (id) on delete set null,
  change_type   text not null,
  previous_data jsonb,
  new_data      jsonb,
  notes         text,
  changed_at    timestamptz not null default now()
);

comment on table public.user_history is
  'Audit trail of profile/status changes. Written by system jobs via the service role; admin-readable only.';
comment on column public.user_history.changed_by is
  'Profile that made the change; null means a system-initiated change (e.g. the daily status cron).';

create index if not exists idx_user_history_user_id
  on public.user_history (user_id);
create index if not exists idx_user_history_changed_at
  on public.user_history (changed_at desc);

alter table public.user_history enable row level security;

-- Admin-only read. No authenticated INSERT/UPDATE/DELETE policies: an audit
-- trail users can write or edit is not an audit trail.
drop policy if exists user_history_select_admin on public.user_history;
create policy user_history_select_admin on public.user_history
  for select to authenticated
  using (public.is_admin());
