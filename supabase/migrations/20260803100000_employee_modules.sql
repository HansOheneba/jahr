-- Employee record expansion: related modules for profile, pay, docs, assets, etc.
-- profiles remains the core employee row (1:1 with auth.users).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.employee_category as enum ('employee', 'contractor', 'intern');
create type public.work_type as enum ('onsite', 'hybrid', 'remote');
create type public.employment_type as enum ('full_time', 'part_time');
create type public.pay_frequency as enum ('monthly', 'weekly');
create type public.document_kind as enum (
  'employment_contract',
  'offer_letter',
  'id_card',
  'passport',
  'cv',
  'certificate',
  'tax_form',
  'signed_policy',
  'payslip',
  'other'
);
create type public.asset_kind as enum (
  'laptop',
  'monitor',
  'phone',
  'access_card',
  'other'
);
create type public.hr_note_kind as enum (
  'promotion',
  'warning',
  'recognition',
  'general'
);
create type public.audit_action as enum (
  'joined_company',
  'profile_updated',
  'requested_leave',
  'approved_leave',
  'rejected_leave',
  'downloaded_payslip',
  'uploaded_document',
  'changed_password'
);

-- ---------------------------------------------------------------------------
-- Extend profiles (basic + employment + personal + account meta)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists employee_number text unique,
  add column if not exists personal_email text,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists employee_category public.employee_category
    not null default 'employee',
  add column if not exists work_type public.work_type not null default 'hybrid',
  add column if not exists employment_type public.employment_type
    not null default 'full_time',
  add column if not exists office_location text,
  add column if not exists probation_end_date date,
  add column if not exists termination_date date,
  add column if not exists leaving_reason text,
  add column if not exists cost_centre text,
  add column if not exists nationality text,
  add column if not exists national_id text,
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists country text not null default 'Ghana',
  add column if not exists last_login_at timestamptz;

-- ---------------------------------------------------------------------------
-- Emergency contacts
-- ---------------------------------------------------------------------------

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  relationship text not null default '',
  phone text not null default '',
  email text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index emergency_contacts_employee_id_idx
  on public.emergency_contacts (employee_id);

create trigger emergency_contacts_set_updated_at
  before update on public.emergency_contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Pay details (store salary info — do not process payments)
-- ---------------------------------------------------------------------------

create table public.pay_details (
  employee_id uuid primary key references public.profiles (id) on delete cascade,
  salary numeric(12, 2),
  currency text not null default 'GHS',
  pay_frequency public.pay_frequency not null default 'monthly',
  bank_name text,
  account_name text,
  account_number text,
  payment_method text not null default 'bank_transfer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pay_details_set_updated_at
  before update on public.pay_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payslips (metadata; file_url filled when Cloudinary is wired)
-- ---------------------------------------------------------------------------

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  period_label text not null,
  period_start date,
  period_end date,
  file_url text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index payslips_employee_id_idx on public.payslips (employee_id);

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  kind public.document_kind not null default 'other',
  title text not null,
  file_url text,
  file_name text,
  mime_type text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_employee_id_idx on public.documents (employee_id);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------------

create table public.employee_assets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  kind public.asset_kind not null default 'other',
  label text not null,
  serial_number text,
  assigned_at date,
  returned_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employee_assets_employee_id_idx
  on public.employee_assets (employee_id);

create trigger employee_assets_set_updated_at
  before update on public.employee_assets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- HR notes (never visible to the employee subject)
-- ---------------------------------------------------------------------------

create table public.hr_notes (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  kind public.hr_note_kind not null default 'general',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hr_notes_employee_id_idx on public.hr_notes (employee_id);

create trigger hr_notes_set_updated_at
  before update on public.hr_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Leave balances (per type / year)
-- ---------------------------------------------------------------------------

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  leave_type public.leave_type not null,
  year integer not null,
  entitlement numeric(5, 2) not null default 0,
  used numeric(5, 2) not null default 0,
  pending numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, leave_type, year)
);

create index leave_balances_employee_id_idx
  on public.leave_balances (employee_id);

create trigger leave_balances_set_updated_at
  before update on public.leave_balances
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Announcements + public holidays
-- ---------------------------------------------------------------------------

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  published_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  holiday_date date not null,
  country text not null default 'GH',
  created_at timestamptz not null default now(),
  unique (holiday_date, country, name)
);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  subject_id uuid references public.profiles (id) on delete set null,
  action public.audit_action not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_subject_id_idx on public.audit_logs (subject_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on table public.emergency_contacts to authenticated, service_role;
grant select, insert, update, delete on table public.pay_details to authenticated, service_role;
grant select, insert, update, delete on table public.payslips to authenticated, service_role;
grant select, insert, update, delete on table public.documents to authenticated, service_role;
grant select, insert, update, delete on table public.employee_assets to authenticated, service_role;
grant select, insert, update, delete on table public.hr_notes to authenticated, service_role;
grant select, insert, update, delete on table public.leave_balances to authenticated, service_role;
grant select on table public.announcements to authenticated;
grant select, insert, update, delete on table public.announcements to service_role;
grant insert, update, delete on table public.announcements to authenticated;
grant select on table public.holidays to authenticated;
grant select, insert, update, delete on table public.holidays to service_role;
grant select on table public.audit_logs to authenticated;
grant select, insert, update, delete on table public.audit_logs to service_role;
grant insert on table public.audit_logs to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.emergency_contacts enable row level security;
alter table public.pay_details enable row level security;
alter table public.payslips enable row level security;
alter table public.documents enable row level security;
alter table public.employee_assets enable row level security;
alter table public.hr_notes enable row level security;
alter table public.leave_balances enable row level security;
alter table public.announcements enable row level security;
alter table public.holidays enable row level security;
alter table public.audit_logs enable row level security;

-- Emergency contacts: self or org admin
create policy emergency_contacts_select
  on public.emergency_contacts for select to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin());
create policy emergency_contacts_write_self
  on public.emergency_contacts for insert to authenticated
  with check (employee_id = (select auth.uid()) or private.is_org_admin());
create policy emergency_contacts_update
  on public.emergency_contacts for update to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin())
  with check (employee_id = (select auth.uid()) or private.is_org_admin());
create policy emergency_contacts_delete
  on public.emergency_contacts for delete to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin());

-- Pay details: self or org admin
create policy pay_details_select
  on public.pay_details for select to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin());
create policy pay_details_upsert_admin_or_self
  on public.pay_details for insert to authenticated
  with check (employee_id = (select auth.uid()) or private.is_org_admin());
create policy pay_details_update
  on public.pay_details for update to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

-- Payslips / documents / assets: self or org admin
create policy payslips_select
  on public.payslips for select to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin());
create policy payslips_write_admin
  on public.payslips for insert to authenticated
  with check (private.is_org_admin());
create policy payslips_update_admin
  on public.payslips for update to authenticated
  using (private.is_org_admin()) with check (private.is_org_admin());
create policy payslips_delete_admin
  on public.payslips for delete to authenticated
  using (private.is_org_admin());

create policy documents_select
  on public.documents for select to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin());
create policy documents_insert
  on public.documents for insert to authenticated
  with check (employee_id = (select auth.uid()) or private.is_org_admin());
create policy documents_update
  on public.documents for update to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin())
  with check (employee_id = (select auth.uid()) or private.is_org_admin());
create policy documents_delete
  on public.documents for delete to authenticated
  using (private.is_org_admin() or employee_id = (select auth.uid()));

create policy assets_select
  on public.employee_assets for select to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin());
create policy assets_write_admin
  on public.employee_assets for insert to authenticated
  with check (private.is_org_admin());
create policy assets_update_admin
  on public.employee_assets for update to authenticated
  using (private.is_org_admin()) with check (private.is_org_admin());
create policy assets_delete_admin
  on public.employee_assets for delete to authenticated
  using (private.is_org_admin());

-- HR notes: org admin only (never the subject employee)
create policy hr_notes_admin_only
  on public.hr_notes for all to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

-- Leave balances: self or org admin
create policy leave_balances_select
  on public.leave_balances for select to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin());
create policy leave_balances_write_admin
  on public.leave_balances for insert to authenticated
  with check (private.is_org_admin());
create policy leave_balances_update_admin
  on public.leave_balances for update to authenticated
  using (private.is_org_admin()) with check (private.is_org_admin());

-- Announcements / holidays: all authenticated can read; admins write
create policy announcements_select
  on public.announcements for select to authenticated
  using (is_active = true or private.is_org_admin());
create policy announcements_write_admin
  on public.announcements for all to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

create policy holidays_select
  on public.holidays for select to authenticated
  using (true);
create policy holidays_write_admin
  on public.holidays for all to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

-- Audit: subject can read own; admin reads all; anyone authenticated may insert own actor row
create policy audit_logs_select
  on public.audit_logs for select to authenticated
  using (
    subject_id = (select auth.uid())
    or actor_id = (select auth.uid())
    or private.is_org_admin()
  );
create policy audit_logs_insert
  on public.audit_logs for insert to authenticated
  with check (actor_id = (select auth.uid()) or private.is_org_admin());
