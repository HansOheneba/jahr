-- Multi-currency payroll reporting.
--
-- Cost figures are held in each employee's native currency and converted for
-- reporting. Rates are kept as history so estimates use today's rate while a
-- generated payslip keeps the rate it was priced at.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- Rate history
-- ---------------------------------------------------------------------------

-- Every rate row is stored against one reference currency, so a single daily
-- pull covers any pair via a cross rate.
create or replace function public.fx_base_currency()
returns text
language sql
immutable
as $$
  select 'USD'::text;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'fx_rate_source'
  ) then
    create type public.fx_rate_source as enum ('manual', 'api');
  end if;
end;
$$;

create table if not exists public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  target_currency text not null check (target_currency ~ '^[A-Z]{3}$'),
  rate numeric(18, 8) not null check (rate > 0),
  source public.fx_rate_source not null default 'manual',
  effective_date date not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint fx_rates_pair_day_source_key
    unique (base_currency, target_currency, effective_date, source)
);

create index if not exists fx_rates_lookup_idx
  on public.fx_rates (base_currency, target_currency, effective_date desc);

-- Most recent usable rate per currency. A manual entry wins over an API pull
-- with the same effective date so a corrected rate is not overwritten.
create or replace view public.fx_rates_latest
with (security_invoker = true)
as
select distinct on (target_currency)
  base_currency,
  target_currency,
  rate,
  source,
  effective_date,
  fetched_at
from public.fx_rates
where base_currency = public.fx_base_currency()
  and effective_date <= current_date
order by
  target_currency,
  effective_date desc,
  (source = 'manual') desc,
  fetched_at desc;

alter table public.fx_rates enable row level security;

drop policy if exists fx_rates_select_authenticated on public.fx_rates;
drop policy if exists fx_rates_insert_org_admin on public.fx_rates;
drop policy if exists fx_rates_update_org_admin on public.fx_rates;
drop policy if exists fx_rates_delete_org_admin on public.fx_rates;

create policy fx_rates_select_authenticated
  on public.fx_rates for select to authenticated
  using (true);

create policy fx_rates_insert_org_admin
  on public.fx_rates for insert to authenticated
  with check (private.is_org_admin());

create policy fx_rates_update_org_admin
  on public.fx_rates for update to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

create policy fx_rates_delete_org_admin
  on public.fx_rates for delete to authenticated
  using (private.is_org_admin());

grant select on table public.fx_rates to authenticated;
grant insert, update, delete on table public.fx_rates to authenticated;
grant select, insert, update, delete on table public.fx_rates to service_role;
grant select on table public.fx_rates_latest to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Org settings
-- ---------------------------------------------------------------------------

create table if not exists public.org_settings (
  id boolean primary key default true,
  reporting_currency text not null default 'GHS'
    check (reporting_currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint org_settings_singleton check (id)
);

insert into public.org_settings (id) values (true) on conflict (id) do nothing;

alter table public.org_settings enable row level security;

drop policy if exists org_settings_select_authenticated on public.org_settings;
drop policy if exists org_settings_update_org_admin on public.org_settings;

create policy org_settings_select_authenticated
  on public.org_settings for select to authenticated
  using (true);

create policy org_settings_update_org_admin
  on public.org_settings for update to authenticated
  using (private.is_org_admin())
  with check (private.is_org_admin());

grant select, update on table public.org_settings to authenticated;
grant select, insert, update on table public.org_settings to service_role;

-- ---------------------------------------------------------------------------
-- Rate locked onto generated payslips
-- ---------------------------------------------------------------------------

alter table public.payslips
  add column if not exists fx_reporting_currency text,
  add column if not exists fx_rate numeric(18, 8),
  add column if not exists fx_rate_effective_date date,
  add column if not exists fx_rate_source public.fx_rate_source;

comment on column public.payslips.fx_rate is
  'Payslip currency to reporting currency, frozen at generation. Never repriced.';

-- Existing rows predate the lock, so allow a one-time backfill but block any
-- change once a rate is recorded.
create or replace function public.prevent_payslip_tampering()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if old.reference is distinct from new.reference
      or old.period_label is distinct from new.period_label
      or old.period_start is distinct from new.period_start
      or old.period_end is distinct from new.period_end
      or old.gross_pay is distinct from new.gross_pay
      or old.total_deductions is distinct from new.total_deductions
      or old.net_pay is distinct from new.net_pay
      or old.currency is distinct from new.currency
      or old.snapshot_context is distinct from new.snapshot_context
      or old.generated_at is distinct from new.generated_at
      or old.generated_by is distinct from new.generated_by
    then
      raise exception 'Generated payslips cannot be modified.';
    end if;

    if old.fx_rate is not null and (
      old.fx_rate is distinct from new.fx_rate
      or old.fx_reporting_currency is distinct from new.fx_reporting_currency
      or old.fx_rate_effective_date is distinct from new.fx_rate_effective_date
      or old.fx_rate_source is distinct from new.fx_rate_source
    ) then
      raise exception 'The exchange rate on a generated payslip cannot be changed.';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily rate pull
-- ---------------------------------------------------------------------------

create table if not exists public.fx_rate_pulls (
  request_id bigint primary key,
  base_currency text not null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'applied', 'failed')),
  detail text
);

alter table public.fx_rate_pulls enable row level security;

drop policy if exists fx_rate_pulls_select_org_admin on public.fx_rate_pulls;

create policy fx_rate_pulls_select_org_admin
  on public.fx_rate_pulls for select to authenticated
  using (private.is_org_admin());

grant select on table public.fx_rate_pulls to authenticated;
grant select, insert, update on table public.fx_rate_pulls to service_role;

create or replace function public.fx_rates_request()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  base text := public.fx_base_currency();
  request_id bigint;
begin
  select net.http_get(
    url := 'https://open.er-api.com/v6/latest/' || base,
    timeout_milliseconds := 15000
  ) into request_id;

  insert into public.fx_rate_pulls (request_id, base_currency)
  values (request_id, base);

  return request_id;
end;
$$;

-- Reads whatever pg_net has delivered since the last run. A pull that never
-- answers is marked failed and the previous rates stay in force.
create or replace function public.fx_rates_ingest()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  pull record;
  response record;
  payload jsonb;
  effective date;
  applied integer := 0;
begin
  for pull in
    select *
    from public.fx_rate_pulls
    where processed_at is null
    order by requested_at
  loop
    select status_code, content
    into response
    from net._http_response
    where id = pull.request_id;

    if not found then
      if pull.requested_at < now() - interval '2 hours' then
        update public.fx_rate_pulls
        set processed_at = now(),
            status = 'failed',
            detail = 'No response from the rate provider.'
        where request_id = pull.request_id;
      end if;
      continue;
    end if;

    if response.status_code <> 200 or response.content is null then
      update public.fx_rate_pulls
      set processed_at = now(),
          status = 'failed',
          detail = 'Rate provider returned ' || coalesce(response.status_code::text, 'no status')
      where request_id = pull.request_id;
      continue;
    end if;

    payload := response.content::jsonb;

    if payload ->> 'result' is distinct from 'success' then
      update public.fx_rate_pulls
      set processed_at = now(),
          status = 'failed',
          detail = coalesce(payload ->> 'error-type', 'Rate provider reported a failure.')
      where request_id = pull.request_id;
      continue;
    end if;

    effective := coalesce(
      to_timestamp((payload ->> 'time_last_update_unix')::bigint)::date,
      current_date
    );

    insert into public.fx_rates
      (base_currency, target_currency, rate, source, effective_date)
    select
      pull.base_currency,
      upper(entry.code),
      entry.value::numeric,
      'api',
      effective
    from jsonb_each_text(payload -> 'rates') as entry(code, value)
    where entry.code ~ '^[A-Za-z]{3}$'
      and entry.value::numeric > 0
    on conflict (base_currency, target_currency, effective_date, source)
    do update set rate = excluded.rate, fetched_at = now();

    update public.fx_rate_pulls
    set processed_at = now(), status = 'applied'
    where request_id = pull.request_id;

    applied := applied + 1;
  end loop;

  return applied;
end;
$$;

revoke all on function public.fx_rates_request() from public;
revoke all on function public.fx_rates_ingest() from public;
grant execute on function public.fx_rates_request() to service_role;
grant execute on function public.fx_rates_ingest() to service_role;

select cron.schedule(
  'fx-rates-request',
  '10 4 * * *',
  $$select public.fx_rates_request();$$
);

select cron.schedule(
  'fx-rates-ingest',
  '25 4 * * *',
  $$select public.fx_rates_ingest();$$
);
