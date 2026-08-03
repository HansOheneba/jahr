-- Managers need to see colleagues for directory + organogram.
-- Also allow anyone to view their direct reports.

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
      when target.manager_id = (select auth.uid()) then true
      when private.has_any_role(
        array['manager', 'business_unit_md']::public.app_role[]
      ) and target.status = 'active' then true
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
