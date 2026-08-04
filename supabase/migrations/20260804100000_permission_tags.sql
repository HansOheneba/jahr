-- Capability tags: modular privileges replacing role-tied auth checks.

create table public.permission_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.profile_permission_tags (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tag_id uuid not null references public.permission_tags (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles (id) on delete set null,
  primary key (profile_id, tag_id)
);

create index profile_permission_tags_profile_id_idx
  on public.profile_permission_tags (profile_id);

create index profile_permission_tags_tag_id_idx
  on public.profile_permission_tags (tag_id);

insert into public.permission_tags (slug, label, description) values
  ('super_admin', 'Super admin', 'Full admin access and tag management'),
  ('hr_admin', 'HR admin', 'Hire, amend, offboard, payroll, devices, org, HR docs'),
  ('ceo', 'CEO', 'Org admin; may assign COO'),
  ('coo', 'COO', 'Org admin'),
  ('manager', 'Manager', 'Leave approvals and people directory'),
  ('business_unit_md', 'Business unit MD', 'People directory');

-- Backfill tags from existing profiles.role
insert into public.profile_permission_tags (profile_id, tag_id)
select p.id, t.id
from public.profiles p
join public.permission_tags t on t.slug = p.role::text
where p.role::text in (
  'super_admin',
  'hr_admin',
  'ceo',
  'coo',
  'manager',
  'business_unit_md'
)
on conflict do nothing;

-- Org admin is now tag-based (policies keep calling private.is_org_admin())
create or replace function private.has_tag(tag_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_permission_tags ppt
    join public.permission_tags t on t.id = ppt.tag_id
    join public.profiles p on p.id = ppt.profile_id
    where ppt.profile_id = (select auth.uid())
      and t.slug = tag_slug
      and p.status = 'active'
  );
$$;

create or replace function private.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_permission_tags ppt
    join public.permission_tags t on t.id = ppt.tag_id
    join public.profiles p on p.id = ppt.profile_id
    where ppt.profile_id = (select auth.uid())
      and t.slug in ('super_admin', 'hr_admin', 'ceo', 'coo')
      and p.status = 'active'
  );
$$;

revoke all on function private.has_tag(text) from public;
revoke all on function private.is_org_admin() from public;

grant execute on function private.has_tag(text) to authenticated;
grant execute on function private.is_org_admin() to authenticated;

alter table public.permission_tags enable row level security;
alter table public.profile_permission_tags enable row level security;

grant select on public.permission_tags to authenticated;
grant select, insert, delete on public.profile_permission_tags to authenticated;

-- Everyone authenticated can read the tag catalogue
create policy permission_tags_select_authenticated
  on public.permission_tags
  for select
  to authenticated
  using (true);

-- View own tags; org admins view all
create policy profile_permission_tags_select
  on public.profile_permission_tags
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or private.is_org_admin()
  );

create policy profile_permission_tags_insert_admin
  on public.profile_permission_tags
  for insert
  to authenticated
  with check (private.is_org_admin());

create policy profile_permission_tags_delete_admin
  on public.profile_permission_tags
  for delete
  to authenticated
  using (private.is_org_admin());
