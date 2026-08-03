-- Managers may only view their own profile, their manager, and direct reports.
-- Org admins retain full visibility. Remove company-wide / department-wide manager access.

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
      when target.id is not distinct from (private.current_profile()).manager_id
        then true
      else false
    end;
$$;
