-- Group-level home for people not assigned to a specific wing.
-- Selectable during onboarding as business unit "JA Group" /
-- department "Group Employee".

insert into public.business_units (name, slug, description)
values (
  'JA Group',
  'ja-group',
  'Group-level roles not assigned to a specific wing'
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  updated_at = now();

insert into public.departments (business_unit_id, name, slug)
select u.id, 'Group Employee', 'group-employee'
from public.business_units u
where u.slug = 'ja-group'
on conflict (business_unit_id, slug) do update
set
  name = excluded.name,
  is_active = true,
  updated_at = now();

-- Existing unassigned people are group employees.
update public.profiles as p
set
  business_unit_id = g.unit_id,
  department_id = coalesce(p.department_id, g.department_id)
from (
  select
    u.id as unit_id,
    d.id as department_id
  from public.business_units u
  join public.departments d
    on d.business_unit_id = u.id
   and d.slug = 'group-employee'
  where u.slug = 'ja-group'
) as g
where p.business_unit_id is null;
