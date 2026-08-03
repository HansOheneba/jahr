-- Company device inventory with assignment history.

create type public.device_status as enum (
  'available',
  'assigned',
  'repair',
  'retired'
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  kind public.asset_kind not null default 'laptop',
  name text not null,
  serial_number text not null,
  manufacturer text,
  model text,
  status public.device_status not null default 'available',
  purchased_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_serial_number_unique unique (serial_number)
);

create index devices_status_idx on public.devices (status);
create index devices_kind_idx on public.devices (kind);

create trigger devices_set_updated_at
  before update on public.devices
  for each row execute function public.set_updated_at();

create table public.device_assignments (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete restrict,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  returned_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  constraint device_assignments_return_after_assign
    check (returned_at is null or returned_at >= assigned_at)
);

create index device_assignments_device_id_idx
  on public.device_assignments (device_id);

create index device_assignments_employee_id_idx
  on public.device_assignments (employee_id);

create index device_assignments_assigned_by_idx
  on public.device_assignments (assigned_by);

-- A device can only have one open assignment at a time.
create unique index device_assignments_one_active_idx
  on public.device_assignments (device_id)
  where returned_at is null;

grant select, insert, update, delete on table public.devices
  to authenticated, service_role;
grant select, insert, update, delete on table public.device_assignments
  to authenticated, service_role;

alter table public.devices enable row level security;
alter table public.device_assignments enable row level security;

-- Inventory: org admins manage; employees can read devices currently/ever assigned to them.
create policy devices_select
  on public.devices for select to authenticated
  using (
    private.is_org_admin()
    or exists (
      select 1
      from public.device_assignments a
      where a.device_id = devices.id
        and a.employee_id = (select auth.uid())
    )
  );

create policy devices_insert_admin
  on public.devices for insert to authenticated
  with check (private.is_org_admin());

create policy devices_update_admin
  on public.devices for update to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

create policy devices_delete_admin
  on public.devices for delete to authenticated
  using (private.is_org_admin());

create policy device_assignments_select
  on public.device_assignments for select to authenticated
  using (
    private.is_org_admin()
    or employee_id = (select auth.uid())
  );

create policy device_assignments_insert_admin
  on public.device_assignments for insert to authenticated
  with check (private.is_org_admin());

create policy device_assignments_update_admin
  on public.device_assignments for update to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

create policy device_assignments_delete_admin
  on public.device_assignments for delete to authenticated
  using (private.is_org_admin());
