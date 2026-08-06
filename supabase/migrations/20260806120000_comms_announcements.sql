-- Internal comms: capability tag + targeted announcements.

insert into public.permission_tags (slug, label, description)
values (
  'comms',
  'Comms',
  'Publish company announcements by business unit and work type'
)
on conflict (slug) do nothing;

alter table public.announcements
  add column if not exists audience_business_unit_ids uuid[] not null default '{}',
  add column if not exists audience_work_types public.work_type[] not null default '{}';

create or replace function private.can_publish_announcements()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_tag('comms') or private.has_tag('super_admin');
$$;

revoke all on function private.can_publish_announcements() from public;
grant execute on function private.can_publish_announcements() to authenticated;

create or replace function private.matches_announcement_audience(
  audience_business_unit_ids uuid[],
  audience_work_types public.work_type[]
)
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
      and (
        cardinality(audience_business_unit_ids) = 0
        or p.business_unit_id = any (audience_business_unit_ids)
      )
      and (
        cardinality(audience_work_types) = 0
        or p.work_type = any (audience_work_types)
      )
  );
$$;

revoke all on function private.matches_announcement_audience(uuid[], public.work_type[])
  from public;
grant execute on function private.matches_announcement_audience(uuid[], public.work_type[])
  to authenticated;

drop policy if exists announcements_select on public.announcements;
drop policy if exists announcements_write_admin on public.announcements;

create policy announcements_select
  on public.announcements
  for select
  to authenticated
  using (
    private.can_publish_announcements()
    or (
      is_active = true
      and private.matches_announcement_audience(
        audience_business_unit_ids,
        audience_work_types
      )
    )
  );

create policy announcements_write_publisher
  on public.announcements
  for all
  to authenticated
  using (private.can_publish_announcements())
  with check (private.can_publish_announcements());
