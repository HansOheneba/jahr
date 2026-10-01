-- Harry Hill Consulting, and move Henry Owusu's reporting line onto it.

insert into public.business_units (name, slug, description)
values (
  'Harry Hill Consulting',
  'harry-hill-consulting',
  'Management consulting'
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  updated_at = now();

with recursive reports as (
  select child.id
  from public.profiles child
  join public.profiles henry
    on child.manager_id = henry.id
  where henry.first_name = 'Henry'
    and henry.last_name = 'Owusu'
  union all
  select child.id
  from public.profiles child
  join reports parent on child.manager_id = parent.id
)
update public.profiles as person
set
  business_unit_id = unit.id,
  updated_at = now()
from public.business_units unit
where unit.slug = 'harry-hill-consulting'
  and person.id in (select id from reports)
  and person.business_unit_id is distinct from unit.id;
