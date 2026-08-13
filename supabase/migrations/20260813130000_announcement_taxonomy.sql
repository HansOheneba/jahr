-- Expand internal-comms taxonomy: parent category + announcement type as text.
-- Replaces the narrow enum with the HR announcement type matrix.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'announcements'
      and column_name = 'category'
      and udt_name = 'announcement_category'
  ) then
    alter table public.announcements
      alter column category drop default;

    alter table public.announcements
      alter column category type text
      using category::text;
  end if;
end
$$;

alter table public.announcements
  add column if not exists category text;

alter table public.announcements
  add column if not exists announcement_type text;

-- Backfill types from any legacy enum/text category values.
update public.announcements
set announcement_type = case category
  when 'general' then 'general_update'
  when 'new_hire' then 'new_hire'
  when 'employee_leave' then 'employee_leave'
  when 'policy' then 'policy_update'
  when 'event' then 'social_event'
  when 'ops' then 'office_update'
  when 'people' then coalesce(announcement_type, 'new_hire')
  when 'company' then coalesce(announcement_type, 'general_update')
  when 'events' then coalesce(announcement_type, 'town_hall')
  when 'hr_policy' then coalesce(announcement_type, 'policy_update')
  when 'leave' then coalesce(announcement_type, 'employee_leave')
  when 'recognition' then coalesce(announcement_type, 'employee_spotlight')
  when 'organization' then coalesce(announcement_type, 'restructure')
  when 'engagement' then coalesce(announcement_type, 'survey')
  when 'recruitment' then coalesce(announcement_type, 'open_position')
  when 'it_workplace' then coalesce(announcement_type, 'office_update')
  when 'urgent' then coalesce(announcement_type, 'critical_notice')
  else coalesce(announcement_type, 'general_update')
end
where announcement_type is null
   or announcement_type in (
     'general', 'policy', 'event', 'ops'
   );

-- Normalize parent category from announcement type.
update public.announcements
set category = case announcement_type
  when 'new_hire' then 'people'
  when 'promotion' then 'people'
  when 'role_change' then 'people'
  when 'exit' then 'people'
  when 'retirement' then 'people'
  when 'general_update' then 'company'
  when 'milestone' then 'company'
  when 'strategy' then 'company'
  when 'leadership' then 'company'
  when 'town_hall' then 'events'
  when 'retreat' then 'events'
  when 'training' then 'events'
  when 'social_event' then 'events'
  when 'policy_update' then 'hr_policy'
  when 'benefits' then 'hr_policy'
  when 'payroll' then 'hr_policy'
  when 'performance_review' then 'hr_policy'
  when 'employee_leave' then 'leave'
  when 'return_from_leave' then 'leave'
  when 'holiday' then 'leave'
  when 'employee_spotlight' then 'recognition'
  when 'achievement' then 'recognition'
  when 'work_anniversary' then 'recognition'
  when 'restructure' then 'organization'
  when 'department_change' then 'organization'
  when 'reporting_changes' then 'organization'
  when 'survey' then 'engagement'
  when 'feedback' then 'engagement'
  when 'wellness' then 'engagement'
  when 'culture' then 'engagement'
  when 'open_position' then 'recruitment'
  when 'referral' then 'recruitment'
  when 'internal_opportunity' then 'recruitment'
  when 'maintenance' then 'it_workplace'
  when 'outage' then 'it_workplace'
  when 'security' then 'it_workplace'
  when 'office_update' then 'it_workplace'
  when 'emergency' then 'urgent'
  when 'security_alert' then 'urgent'
  when 'critical_notice' then 'urgent'
  else 'company'
end;

update public.announcements
set announcement_type = 'general_update'
where announcement_type is null;

update public.announcements
set category = 'company'
where category is null;

alter table public.announcements
  alter column category set default 'company';

alter table public.announcements
  alter column announcement_type set default 'general_update';

alter table public.announcements
  alter column category set not null;

alter table public.announcements
  alter column announcement_type set not null;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'announcement_category'
      and n.nspname = 'public'
  ) then
    drop type public.announcement_category;
  end if;
exception
  when dependent_objects_still_exist then
    null;
end
$$;

comment on column public.announcements.category is
  'Parent comms category (People, Company, Events, …).';

comment on column public.announcements.announcement_type is
  'Specific announcement type (New Hire, Policy Update, …).';
