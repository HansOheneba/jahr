-- Ideas and help: employees suggest improvements or report problems with the portal.

create type public.support_request_kind as enum ('idea', 'help');

create type public.support_request_status as enum (
  'new',
  'in_review',
  'done',
  'declined'
);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  kind public.support_request_kind not null,
  subject text not null,
  details text not null default '',
  status public.support_request_status not null default 'new',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_requests_submitted_by_idx
  on public.support_requests (submitted_by, created_at desc);

create index support_requests_status_idx
  on public.support_requests (status, created_at desc);

create trigger support_requests_set_updated_at
  before update on public.support_requests
  for each row execute function public.set_updated_at();

grant select, insert, update on table public.support_requests to authenticated;
grant select, insert, update, delete on table public.support_requests to service_role;

alter table public.support_requests enable row level security;

-- Submitters read their own; org admins read and triage everything.
create policy support_requests_select
  on public.support_requests for select to authenticated
  using (submitted_by = (select auth.uid()) or private.is_org_admin());

create policy support_requests_insert_self
  on public.support_requests for insert to authenticated
  with check (submitted_by = (select auth.uid()));

create policy support_requests_update_admin
  on public.support_requests for update to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());
