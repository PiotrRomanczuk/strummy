-- Teacher interest leads — the "I'd want this for my studio" form behind the
-- public demo. Filled in by people with no account at all, so the write path
-- is an anon-callable SECURITY DEFINER function rather than a table grant:
-- ADR-0001 keeps the DB as the security boundary, and handing `anon` a direct
-- INSERT on a table would mean trusting the client with the column list.

create table if not exists public.teacher_leads (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  email           citext not null,
  phone           text,
  teaching_context text,
  student_count   text,
  biggest_pain    text,
  wants_contact   boolean not null default true,
  source          text,
  locale          text,
  -- Owner-side triage. Deliberately text + check rather than an enum: this is
  -- a funnel that will be renamed a few times before it settles, and renaming
  -- an enum value in Postgres is a migration; renaming a check is a line.
  status          text not null default 'new'
                  check (status in ('new', 'contacted', 'converted', 'declined')),
  admin_notes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists ix_teacher_leads_created on public.teacher_leads (created_at desc);
create index if not exists ix_teacher_leads_status on public.teacher_leads (status);
create unique index if not exists ux_teacher_leads_email on public.teacher_leads (email);

drop trigger if exists trg_teacher_leads_set_updated_at on public.teacher_leads;
create trigger trg_teacher_leads_set_updated_at
  before update on public.teacher_leads
  for each row execute function public.set_updated_at();

comment on table public.teacher_leads is
  'Interest-form submissions from teachers evaluating Strummy. Written only via public.submit_teacher_lead().';

-- ── Write path ───────────────────────────────────────────────────────────────
-- Idempotent on email: a teacher who submits twice updates their own entry
-- instead of creating a duplicate the owner has to de-dupe by hand. The
-- rate limit is per-email and reuses the existing auth_rate_limits ledger.
create or replace function public.submit_teacher_lead(
  p_full_name        text,
  p_email            text,
  p_phone            text default null,
  p_teaching_context text default null,
  p_student_count    text default null,
  p_biggest_pain     text default null,
  p_wants_contact    boolean default true,
  p_source           text default null,
  p_locale           text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email       citext := nullif(btrim(p_email), '')::citext;
  -- auth_rate_limits keys on text, so fold the case here. teacher_leads.email
  -- is citext and dedups case-insensitively already; without this the cap does
  -- not, and Anna@x.pl gets a fresh five tries straight after anna@x.pl.
  v_rate_key    text;
  v_name        text   := nullif(btrim(p_full_name), '');
  v_recent      integer;
  v_id          uuid;
begin
  v_rate_key := lower(v_email::text);

  if v_name is null then
    raise exception 'full_name is required' using errcode = 'check_violation';
  end if;
  if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'a valid email is required' using errcode = 'check_violation';
  end if;

  -- 5 submissions per address per hour. Generous for a human correcting a
  -- typo, useless for a script.
  select count(*) into v_recent
    from public.auth_rate_limits
   where identifier = v_rate_key
     and operation = 'submit_teacher_lead'
     and attempted_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'too many submissions, try again later' using errcode = 'check_violation';
  end if;

  insert into public.auth_rate_limits (identifier, operation)
  values (v_rate_key, 'submit_teacher_lead');

  insert into public.teacher_leads (
    full_name, email, phone, teaching_context, student_count,
    biggest_pain, wants_contact, source, locale
  ) values (
    v_name, v_email, nullif(btrim(p_phone), ''), nullif(btrim(p_teaching_context), ''),
    nullif(btrim(p_student_count), ''), nullif(btrim(p_biggest_pain), ''),
    coalesce(p_wants_contact, true), nullif(btrim(p_source), ''), nullif(btrim(p_locale), '')
  )
  on conflict (email) do update
    set full_name        = excluded.full_name,
        phone            = coalesce(excluded.phone, public.teacher_leads.phone),
        teaching_context = coalesce(excluded.teaching_context, public.teacher_leads.teaching_context),
        student_count    = coalesce(excluded.student_count, public.teacher_leads.student_count),
        biggest_pain     = coalesce(excluded.biggest_pain, public.teacher_leads.biggest_pain),
        wants_contact    = excluded.wants_contact,
        source           = coalesce(public.teacher_leads.source, excluded.source),
        locale           = coalesce(excluded.locale, public.teacher_leads.locale)
  returning id into v_id;

  return v_id;
end;
$$;

-- ── Grants & RLS ─────────────────────────────────────────────────────────────
revoke all on public.teacher_leads from anon, authenticated;
grant all on public.teacher_leads to service_role;

alter table public.teacher_leads enable row level security;

-- Admins read and triage; nobody else sees the list, and no one writes to the
-- table directly — submit_teacher_lead() is the only door in.
drop policy if exists teacher_leads_select_admin on public.teacher_leads;
create policy teacher_leads_select_admin on public.teacher_leads
  for select to authenticated
  using (public.is_admin());

drop policy if exists teacher_leads_update_admin on public.teacher_leads;
create policy teacher_leads_update_admin on public.teacher_leads
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, update on public.teacher_leads to authenticated;

grant execute on function public.submit_teacher_lead(
  text, text, text, text, text, text, boolean, text, text
) to anon, authenticated;
