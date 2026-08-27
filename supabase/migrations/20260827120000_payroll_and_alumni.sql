-- Payroll: annual frequency + legal entity paying
-- Alumni: lightweight records for historical leavers without auth accounts

-- ---------------------------------------------------------------------------
-- Pay frequency: add annually
-- ---------------------------------------------------------------------------

alter type public.pay_frequency add value if not exists 'annually';

-- ---------------------------------------------------------------------------
-- Legal entity paying on pay details
-- ---------------------------------------------------------------------------

alter table public.pay_details
  add column if not exists legal_entity_paying text;

comment on column public.pay_details.legal_entity_paying is
  'Legal entity that pays this employee (e.g. JKA Holdings, Celerey Inc.)';

-- ---------------------------------------------------------------------------
-- Alumni records (no auth linkage)
-- ---------------------------------------------------------------------------

create table if not exists public.alumni_records (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  preferred_name text,
  email text,
  phone text,
  personal_email text,
  start_year integer,
  end_year integer,
  start_date date,
  termination_date date,
  placement text,
  job_title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alumni_records_start_year_check
    check (start_year is null or (start_year >= 1900 and start_year <= 2100)),
  constraint alumni_records_end_year_check
    check (end_year is null or (end_year >= 1900 and end_year <= 2100))
);

create index if not exists alumni_records_last_name_idx
  on public.alumni_records (last_name, first_name);

create trigger alumni_records_set_updated_at
  before update on public.alumni_records
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.alumni_records
  to authenticated, service_role;

alter table public.alumni_records enable row level security;

create policy alumni_records_admin_only
  on public.alumni_records for all to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());
