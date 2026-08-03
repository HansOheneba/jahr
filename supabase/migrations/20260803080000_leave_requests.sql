-- JA Group HR — leave requests + manager approvals

create type public.leave_type as enum (
  'annual',
  'sick',
  'maternity',
  'paternity',
  'casual',
  'unpaid'
);

create type public.leave_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  manager_id uuid references public.profiles (id) on delete set null,
  type public.leave_type not null,
  start_date date not null,
  end_date date not null,
  working_days numeric(5, 2) not null,
  status public.leave_status not null default 'pending',
  notes text not null default '',
  manager_notes text,
  manager_response_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_valid_range check (end_date >= start_date),
  constraint leave_requests_positive_days check (working_days > 0)
);

create index leave_requests_employee_id_idx on public.leave_requests (employee_id);
create index leave_requests_manager_id_idx on public.leave_requests (manager_id);
create index leave_requests_status_idx on public.leave_requests (status);

create trigger leave_requests_set_updated_at
  before update on public.leave_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert on table public.leave_requests to authenticated;
grant update (status, manager_notes, manager_response_at)
  on table public.leave_requests to authenticated;
grant select, insert, update, delete on table public.leave_requests to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.leave_requests enable row level security;

create policy leave_requests_select_visible
  on public.leave_requests
  for select
  to authenticated
  using (
    employee_id = (select auth.uid())
    or manager_id = (select auth.uid())
    or private.is_org_admin()
  );

create policy leave_requests_insert_self
  on public.leave_requests
  for insert
  to authenticated
  with check (employee_id = (select auth.uid()));

create policy leave_requests_update_manager_or_admin
  on public.leave_requests
  for update
  to authenticated
  using (manager_id = (select auth.uid()) or private.is_org_admin())
  with check (manager_id = (select auth.uid()) or private.is_org_admin());
