-- Payroll pay packages + snapshot payslips for on-demand PDF generation

-- ---------------------------------------------------------------------------
-- Statutory IDs on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists ssnit_number text,
  add column if not exists tin_number text;

-- ---------------------------------------------------------------------------
-- Bank branch on pay details
-- ---------------------------------------------------------------------------

alter table public.pay_details
  add column if not exists bank_branch text;

-- ---------------------------------------------------------------------------
-- Pay package line kinds
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.pay_line_kind as enum (
    'earning',
    'deduction',
    'employer_contribution'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.payslip_status as enum ('generated');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- HR-maintained pay package lines (template)
-- ---------------------------------------------------------------------------

create table if not exists public.pay_package_lines (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  kind public.pay_line_kind not null,
  code text not null,
  label text not null,
  amount numeric(12, 2) not null default 0,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, code)
);

create index if not exists pay_package_lines_employee_id_idx
  on public.pay_package_lines (employee_id);

create trigger pay_package_lines_set_updated_at
  before update on public.pay_package_lines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Expand payslips for period snapshots
-- ---------------------------------------------------------------------------

alter table public.payslips
  add column if not exists gross_pay numeric(12, 2),
  add column if not exists total_deductions numeric(12, 2),
  add column if not exists net_pay numeric(12, 2),
  add column if not exists currency text not null default 'GHS',
  add column if not exists status public.payslip_status not null default 'generated',
  add column if not exists generated_at timestamptz,
  add column if not exists generated_by uuid references public.profiles (id) on delete set null;

-- One snapshot per employee per period
create unique index if not exists payslips_employee_period_uidx
  on public.payslips (employee_id, period_start, period_end)
  where period_start is not null and period_end is not null;

-- ---------------------------------------------------------------------------
-- Frozen lines for a generated payslip
-- ---------------------------------------------------------------------------

create table if not exists public.payslip_lines (
  id uuid primary key default gen_random_uuid(),
  payslip_id uuid not null references public.payslips (id) on delete cascade,
  kind public.pay_line_kind not null,
  code text not null,
  label text not null,
  amount numeric(12, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists payslip_lines_payslip_id_idx
  on public.payslip_lines (payslip_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on table public.pay_package_lines
  to authenticated, service_role;
grant select, insert, update, delete on table public.payslip_lines
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.pay_package_lines enable row level security;
alter table public.payslip_lines enable row level security;

-- Package lines: self read; org admin write
create policy pay_package_lines_select
  on public.pay_package_lines for select to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin());

create policy pay_package_lines_insert_admin
  on public.pay_package_lines for insert to authenticated
  with check (private.is_org_admin());

create policy pay_package_lines_update_admin
  on public.pay_package_lines for update to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

create policy pay_package_lines_delete_admin
  on public.pay_package_lines for delete to authenticated
  using (private.is_org_admin());

-- Payslips: self or admin can insert (on-demand generate)
drop policy if exists payslips_write_admin on public.payslips;
create policy payslips_insert_self_or_admin
  on public.payslips for insert to authenticated
  with check (employee_id = (select auth.uid()) or private.is_org_admin());

drop policy if exists payslips_update_admin on public.payslips;
create policy payslips_update_self_or_admin
  on public.payslips for update to authenticated
  using (employee_id = (select auth.uid()) or private.is_org_admin())
  with check (employee_id = (select auth.uid()) or private.is_org_admin());

-- Payslip lines follow parent payslip access
create policy payslip_lines_select
  on public.payslip_lines for select to authenticated
  using (
    exists (
      select 1 from public.payslips p
      where p.id = payslip_id
        and (p.employee_id = (select auth.uid()) or private.is_org_admin())
    )
  );

create policy payslip_lines_insert_self_or_admin
  on public.payslip_lines for insert to authenticated
  with check (
    exists (
      select 1 from public.payslips p
      where p.id = payslip_id
        and (p.employee_id = (select auth.uid()) or private.is_org_admin())
    )
  );

create policy payslip_lines_delete_admin
  on public.payslip_lines for delete to authenticated
  using (private.is_org_admin());
