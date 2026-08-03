-- JA Group HR — initial org + profiles schema

create extension if not exists "pgcrypto";

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

create type public.app_role as enum (
  'employee',
  'manager',
  'business_unit_md',
  'ceo',
  'hr_admin'
);

create type public.employment_status as enum (
  'active',
  'inactive',
  'onboarding',
  'terminated'
);

-- ---------------------------------------------------------------------------
-- Org structure (fully configurable — no hardcoded wings in app code)
-- ---------------------------------------------------------------------------

create table public.business_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units (id) on delete restrict,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_unit_id, slug)
);

create index departments_business_unit_id_idx on public.departments (business_unit_id);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete restrict,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, slug)
);

create index teams_department_id_idx on public.teams (department_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  preferred_name text,
  job_title text,
  role public.app_role not null default 'employee',
  status public.employment_status not null default 'active',
  business_unit_id uuid references public.business_units (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  manager_id uuid references public.profiles (id) on delete set null,
  phone text,
  avatar_url text,
  start_date date,
  annual_leave_entitlement numeric(5, 2) not null default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_no_self_manager check (manager_id is distinct from id)
);

create index profiles_business_unit_id_idx on public.profiles (business_unit_id);
create index profiles_department_id_idx on public.profiles (department_id);
create index profiles_manager_id_idx on public.profiles (manager_id);
create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger business_units_set_updated_at
  before update on public.business_units
  for each row execute function public.set_updated_at();

create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth → profile bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  full_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  first_part text;
  last_part text;
begin
  first_part := nullif(split_part(full_name, ' ', 1), '');
  last_part := nullif(trim(both from substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), '');

  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(first_part, ''),
    coalesce(last_part, ''),
    'employee'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helpers (private schema — not exposed via Data API)
-- ---------------------------------------------------------------------------

create or replace function private.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.profiles
  where id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.current_profile() from public;

create or replace function private.has_any_role(allowed public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (allowed)
      and p.status = 'active'
  );
$$;

revoke all on function private.has_any_role(public.app_role[]) from public;

create or replace function private.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_any_role(array['ceo', 'hr_admin']::public.app_role[]);
$$;

revoke all on function private.is_org_admin() from public;

create or replace function private.can_view_profile(target public.profiles)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when (select auth.uid()) is null then false
      when target.id = (select auth.uid()) then true
      when private.is_org_admin() then true
      when private.has_any_role(array['business_unit_md']::public.app_role[])
        and target.business_unit_id is not distinct from (private.current_profile()).business_unit_id
        then true
      when target.department_id is not null
        and target.department_id is not distinct from (private.current_profile()).department_id
        then true
      when target.id is not distinct from (private.current_profile()).manager_id
        then true
      else false
    end;
$$;

revoke all on function private.can_view_profile(public.profiles) from public;

-- ---------------------------------------------------------------------------
-- Grants (explicit — Data API exposure is opt-in on newer projects)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select on table public.business_units to authenticated;
grant select, insert, update, delete on table public.business_units to service_role;

grant select on table public.departments to authenticated;
grant select, insert, update, delete on table public.departments to service_role;

grant select on table public.teams to authenticated;
grant select, insert, update, delete on table public.teams to service_role;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

-- Org admins need write via authenticated role + RLS
grant insert, update, delete on table public.business_units to authenticated;
grant insert, update, delete on table public.departments to authenticated;
grant insert, update, delete on table public.teams to authenticated;
grant insert on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.business_units enable row level security;
alter table public.departments enable row level security;
alter table public.teams enable row level security;
alter table public.profiles enable row level security;

-- Business units
create policy business_units_select_authenticated
  on public.business_units
  for select
  to authenticated
  using (true);

create policy business_units_insert_org_admin
  on public.business_units
  for insert
  to authenticated
  with check (private.is_org_admin());

create policy business_units_update_org_admin
  on public.business_units
  for update
  to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

create policy business_units_delete_org_admin
  on public.business_units
  for delete
  to authenticated
  using (private.is_org_admin());

-- Departments
create policy departments_select_authenticated
  on public.departments
  for select
  to authenticated
  using (true);

create policy departments_insert_org_admin
  on public.departments
  for insert
  to authenticated
  with check (private.is_org_admin());

create policy departments_update_org_admin
  on public.departments
  for update
  to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

create policy departments_delete_org_admin
  on public.departments
  for delete
  to authenticated
  using (private.is_org_admin());

-- Teams
create policy teams_select_authenticated
  on public.teams
  for select
  to authenticated
  using (true);

create policy teams_insert_org_admin
  on public.teams
  for insert
  to authenticated
  with check (private.is_org_admin());

create policy teams_update_org_admin
  on public.teams
  for update
  to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

create policy teams_delete_org_admin
  on public.teams
  for delete
  to authenticated
  using (private.is_org_admin());

-- Profiles
create policy profiles_select_visible
  on public.profiles
  for select
  to authenticated
  using (private.can_view_profile(profiles));

create policy profiles_insert_org_admin
  on public.profiles
  for insert
  to authenticated
  with check (private.is_org_admin());

create policy profiles_update_self_or_admin
  on public.profiles
  for update
  to authenticated
  using (
    id = (select auth.uid())
    or private.is_org_admin()
  )
  with check (
    private.is_org_admin()
    or (
      id = (select auth.uid())
      and role = (private.current_profile()).role
      and status = (private.current_profile()).status
      and business_unit_id is not distinct from (private.current_profile()).business_unit_id
      and department_id is not distinct from (private.current_profile()).department_id
      and team_id is not distinct from (private.current_profile()).team_id
      and manager_id is not distinct from (private.current_profile()).manager_id
      and annual_leave_entitlement = (private.current_profile()).annual_leave_entitlement
    )
  );

-- ---------------------------------------------------------------------------
-- Seed JA Group wings (editable via admin UI later)
-- ---------------------------------------------------------------------------

insert into public.business_units (name, slug, description)
values
  ('JA Wealth', 'ja-wealth', 'Wealth planning and financial services'),
  ('JA Digital', 'ja-digital', 'Technology and digital finance investments'),
  ('JA Realty', 'ja-realty', 'Real estate acquisition, development, and renovation'),
  ('JA Elements', 'ja-elements', 'Natural resources and energy investments');
