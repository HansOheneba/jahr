-- Let employees see active colleagues who share the same manager (reporting-line / org chart in settings).

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
      when private.has_tag('finance') then true
      when target.manager_id = (select auth.uid()) then true
      when target.id is not distinct from (private.current_profile()).manager_id
        then true
      when (private.current_profile()).manager_id is not null
        and target.manager_id is not distinct from (private.current_profile()).manager_id
        and target.status = 'active'
        then true
      else false
    end;
$$;
