-- Paying entities for payroll packages.

create table if not exists public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint legal_entities_name_key unique (name),
  constraint legal_entities_name_not_blank check (char_length(trim(name)) > 0)
);

create index if not exists legal_entities_name_idx
  on public.legal_entities (name);

alter table public.legal_entities enable row level security;

drop policy if exists legal_entities_select_authenticated on public.legal_entities;
drop policy if exists legal_entities_insert_payroll_admin on public.legal_entities;

create policy legal_entities_select_authenticated
  on public.legal_entities for select to authenticated
  using (true);

create policy legal_entities_insert_payroll_admin
  on public.legal_entities for insert to authenticated
  with check (private.can_manage_payroll());

grant select, insert on table public.legal_entities to authenticated;
grant select, insert on table public.legal_entities to service_role;

insert into public.legal_entities (name)
values
  ('JKA Holdings'),
  ('Celerey Inc.'),
  ('HarryHill Consulting Limited'),
  ('JA Wealth Advisors Limited'),
  ('JA Financial Advisors Limited'),
  ('JA Capital Partners Limited'),
  ('Portfolio Planners Limited'),
  ('JA Elements Ghana Limited'),
  ('Collins and Cooper Limited')
on conflict (name) do nothing;
