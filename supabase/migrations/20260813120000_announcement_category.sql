-- Announcement category for internal comms (email + dashboard labelling).

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'announcement_category'
      and n.nspname = 'public'
  ) then
    create type public.announcement_category as enum (
      'general',
      'new_hire',
      'employee_leave',
      'policy',
      'event',
      'ops'
    );
  end if;
end
$$;

-- Add nullable first so older rows never hit a NOT NULL failure mid-migration.
alter table public.announcements
  add column if not exists category public.announcement_category;

-- Backfill every existing announcement before enforcing NOT NULL.
update public.announcements
set category = 'general'
where category is null;

alter table public.announcements
  alter column category set default 'general';

alter table public.announcements
  alter column category set not null;

comment on column public.announcements.category is
  'Comms category shown in email and dashboard (e.g. new hire, leave, general).';
