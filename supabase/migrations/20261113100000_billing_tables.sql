-- Lesson packages (karnety): what a teacher sells, what a student bought, and the ledger the lesson balance is
-- summed from. Blueprint: docs/app-blueprint/12-billing-payments.md.
--
-- Money is integer grosze, PLN only. A student's balance is sum(lesson_credit_entries.delta) — never stored,
-- so it cannot drift from its history. It may go negative: a held lesson with no package left is "to pay".
--
-- Every table here is read-only for `authenticated`. Writes go through server actions and the inFakt sync with
-- the service-role client (the pattern of song_analyses), so a signed-in user can never credit themselves.

-- ---------------------------------------------------------------------------
-- Price list: the packages a teacher offers.
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_packages (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  lesson_count integer not null,
  price_cents integer not null,
  currency text not null default 'PLN',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_packages_name_check check (char_length(btrim(name)) between 1 and 80),
  constraint lesson_packages_lesson_count_check check (lesson_count between 1 and 100),
  constraint lesson_packages_price_cents_check check (price_cents >= 0),
  constraint lesson_packages_currency_check check (currency = 'PLN')
);

create index if not exists lesson_packages_teacher_id_idx on public.lesson_packages (teacher_id);

-- ---------------------------------------------------------------------------
-- One sold package. Name, lesson count and amount are copied at sale time: the price list changes, a sale
-- does not. The invoice lives in inFakt; this row keeps only its id, number and payment link.
-- ---------------------------------------------------------------------------
create table if not exists public.package_purchases (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- Who the invoice is made out to: the student, or a parent paying for a child.
  payer_id uuid references public.profiles (id) on delete set null,
  package_id uuid references public.lesson_packages (id) on delete set null,
  description text not null,
  lesson_count integer not null,
  amount_cents integer not null,
  currency text not null default 'PLN',
  status text not null default 'pending',
  payment_method text,
  due_on date,
  paid_at timestamptz,
  invoice_status text not null default 'pending',
  infakt_invoice_id text,
  invoice_number text,
  payment_url text,
  invoice_error text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint package_purchases_lesson_count_check check (lesson_count between 1 and 100),
  constraint package_purchases_amount_cents_check check (amount_cents >= 0),
  constraint package_purchases_currency_check check (currency = 'PLN'),
  constraint package_purchases_status_check check (status = any (array['pending', 'paid', 'cancelled'])),
  constraint package_purchases_payment_method_check check (
    payment_method is null or payment_method = any (array['infakt', 'transfer', 'cash', 'other'])
  ),
  -- pending: not sent to inFakt yet · issued · failed: inFakt refused, retry · skipped: no inFakt key (dev, CI).
  constraint package_purchases_invoice_status_check check (
    invoice_status = any (array['pending', 'issued', 'failed', 'skipped'])
  ),
  constraint package_purchases_paid_at_check check ((status = 'paid') = (paid_at is not null)),
  constraint package_purchases_infakt_invoice_id_key unique (infakt_invoice_id)
);

create index if not exists package_purchases_student_id_idx on public.package_purchases (student_id);
create index if not exists package_purchases_teacher_id_idx on public.package_purchases (teacher_id);
create index if not exists package_purchases_payer_id_idx on public.package_purchases (payer_id);
create index if not exists package_purchases_open_idx on public.package_purchases (status)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- The ledger. +N when a purchase is paid, -1 for a held lesson, free-form manual corrections and refunds.
-- The two partial unique indexes make "credited twice" and "charged twice" impossible at the database level.
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_credit_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null,
  purchase_id uuid references public.package_purchases (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint lesson_credit_entries_delta_check check (delta <> 0),
  constraint lesson_credit_entries_reason_check check (
    reason = any (array['purchase', 'lesson', 'manual', 'refund'])
  ),
  constraint lesson_credit_entries_source_check check (
    (reason <> 'purchase' or purchase_id is not null) and (reason <> 'lesson' or lesson_id is not null)
  )
);

create unique index if not exists lesson_credit_entries_purchase_once_idx
  on public.lesson_credit_entries (purchase_id) where reason = 'purchase';
create unique index if not exists lesson_credit_entries_lesson_once_idx
  on public.lesson_credit_entries (lesson_id) where reason = 'lesson';
create index if not exists lesson_credit_entries_student_id_idx on public.lesson_credit_entries (student_id);
create index if not exists lesson_credit_entries_teacher_id_idx on public.lesson_credit_entries (teacher_id);

-- ---------------------------------------------------------------------------
-- Per-teacher settings. Lessons before billing_start_on never touch the balance: older COMPLETED rows came
-- from the historical calendar import and say nothing about what was paid.
-- ---------------------------------------------------------------------------
create table if not exists public.billing_settings (
  teacher_id uuid primary key references public.profiles (id) on delete cascade,
  billing_start_on date,
  payment_term_days integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_settings_payment_term_days_check check (payment_term_days between 0 and 90)
);

-- ---------------------------------------------------------------------------
-- A payer's client record in inFakt. Name, address and NIP stay in inFakt; Strummy keeps the id only.
-- A table rather than a profiles column: users update their own profile row, and whoever can change this id
-- decides whose name the next invoice carries.
-- ---------------------------------------------------------------------------
create table if not exists public.billing_customers (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  infakt_client_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_customers_infakt_client_id_key unique (infakt_client_id)
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists trg_lesson_packages_set_updated_at on public.lesson_packages;
create trigger trg_lesson_packages_set_updated_at
  before update on public.lesson_packages
  for each row execute function public.set_updated_at();

drop trigger if exists trg_package_purchases_set_updated_at on public.package_purchases;
create trigger trg_package_purchases_set_updated_at
  before update on public.package_purchases
  for each row execute function public.set_updated_at();

drop trigger if exists trg_billing_settings_set_updated_at on public.billing_settings;
create trigger trg_billing_settings_set_updated_at
  before update on public.billing_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_billing_customers_set_updated_at on public.billing_customers;
create trigger trg_billing_customers_set_updated_at
  before update on public.billing_customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants: signed-in users read; only the service role writes.
-- ---------------------------------------------------------------------------
grant select on public.lesson_packages to authenticated;
grant select on public.package_purchases to authenticated;
grant select on public.lesson_credit_entries to authenticated;
grant select on public.billing_settings to authenticated;
grant select on public.billing_customers to authenticated;

grant all on public.lesson_packages to service_role;
grant all on public.package_purchases to service_role;
grant all on public.lesson_credit_entries to service_role;
grant all on public.billing_settings to service_role;
grant all on public.billing_customers to service_role;

alter table public.lesson_packages enable row level security;
alter table public.package_purchases enable row level security;
alter table public.lesson_credit_entries enable row level security;
alter table public.billing_settings enable row level security;
alter table public.billing_customers enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: select only. Teacher: own rows. Student: own rows. Parent: the child's rows. Admin: everything.
-- ---------------------------------------------------------------------------

-- Price list: the teacher who owns it, and the students that teacher has lessons with (so they can buy).
drop policy if exists lesson_packages_select on public.lesson_packages;
create policy lesson_packages_select on public.lesson_packages
  for select
  to authenticated
  using (
    (select public.is_admin())
    or teacher_id = (select public.current_profile_id())
    or (
      is_active
      and exists (
        select 1
        from public.lessons l
        where l.teacher_id = lesson_packages.teacher_id
          and l.deleted_at is null
          and (l.student_id = (select public.current_profile_id()) or public.is_child_of_parent(l.student_id))
      )
    )
  );

drop policy if exists package_purchases_select on public.package_purchases;
create policy package_purchases_select on public.package_purchases
  for select
  to authenticated
  using (
    (select public.is_admin())
    or teacher_id = (select public.current_profile_id())
    or student_id = (select public.current_profile_id())
    or payer_id = (select public.current_profile_id())
    or public.is_child_of_parent(student_id)
  );

drop policy if exists lesson_credit_entries_select on public.lesson_credit_entries;
create policy lesson_credit_entries_select on public.lesson_credit_entries
  for select
  to authenticated
  using (
    (select public.is_admin())
    or teacher_id = (select public.current_profile_id())
    or student_id = (select public.current_profile_id())
    or public.is_child_of_parent(student_id)
  );

drop policy if exists billing_settings_select on public.billing_settings;
create policy billing_settings_select on public.billing_settings
  for select
  to authenticated
  using ((select public.is_admin()) or teacher_id = (select public.current_profile_id()));

drop policy if exists billing_customers_select on public.billing_customers;
create policy billing_customers_select on public.billing_customers
  for select
  to authenticated
  using ((select public.is_admin_or_teacher()) or profile_id = (select public.current_profile_id()));
