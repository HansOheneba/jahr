-- Additional custodians on a fund. The primary custodian stays on petty_cash_funds.custodian_id.

create table public.petty_cash_fund_custodians (
  fund_id uuid not null references public.petty_cash_funds (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (fund_id, profile_id)
);

create index petty_cash_fund_custodians_profile_idx
  on public.petty_cash_fund_custodians (profile_id);

grant select, insert, delete on public.petty_cash_fund_custodians to authenticated;
grant select, insert, update, delete on public.petty_cash_fund_custodians to service_role;

alter table public.petty_cash_fund_custodians enable row level security;

create policy petty_cash_fund_custodians_select
  on public.petty_cash_fund_custodians for select to authenticated
  using (private.can_access_petty_cash());

create policy petty_cash_fund_custodians_insert
  on public.petty_cash_fund_custodians for insert to authenticated
  with check (private.can_manage_petty_cash());

create policy petty_cash_fund_custodians_delete
  on public.petty_cash_fund_custodians for delete to authenticated
  using (private.can_manage_petty_cash());

insert into public.petty_cash_fund_custodians (fund_id, profile_id)
select id, custodian_id
from public.petty_cash_funds
where custodian_id is not null
on conflict do nothing;
