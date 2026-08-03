-- Treat COO as org admin; Hans Opoku is COO, Jude stays sole CEO.

create or replace function private.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_any_role(
    array['ceo', 'coo', 'hr_admin']::public.app_role[]
  );
$$;

update public.profiles
set
  role = 'coo',
  job_title = 'Group Chief Operating Officer'
where email = 'hansoheneba.io@gmail.com'
  and role = 'ceo';

update public.profiles
set role = 'ceo'
where email = 'jude@celerey.co';
