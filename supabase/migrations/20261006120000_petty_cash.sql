-- Petty cash ledger. Balances are derived from posted transactions.
-- Operations is a capability tag, not an org-admin role.

insert into public.permission_tags (slug, label, description)
values (
  'operations',
  'Operations',
  'Petty cash and facilities. Does not include HR admin access.'
)
on conflict (slug) do nothing;

create or replace function private.can_access_petty_cash()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    private.is_org_admin()
    or private.has_tag('operations')
    or private.has_tag('finance');
$$;

create or replace function private.can_manage_petty_cash()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_org_admin() or private.has_tag('operations');
$$;

revoke all on function private.can_access_petty_cash() from public;
revoke all on function private.can_manage_petty_cash() from public;
grant execute on function private.can_access_petty_cash() to authenticated;
grant execute on function private.can_manage_petty_cash() to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.petty_cash_settings (
  id boolean primary key default true check (id),
  default_currency text not null default 'GHS' check (char_length(default_currency) = 3),
  receipt_required_above numeric(14, 2) not null default 50 check (receipt_required_above >= 0),
  max_transaction_amount numeric(14, 2) not null default 500 check (max_transaction_amount > 0),
  allow_over_limit_exception boolean not null default true,
  auto_approve_up_to numeric(14, 2) not null default 100 check (auto_approve_up_to >= 0),
  allow_self_approval boolean not null default false,
  allow_negative_balance boolean not null default false,
  default_target_float numeric(14, 2) not null default 2000 check (default_target_float >= 0),
  default_replenishment_threshold numeric(14, 2) not null default 500 check (default_replenishment_threshold >= 0),
  updated_at timestamptz not null default now()
);

insert into public.petty_cash_settings (id) values (true);

create table public.petty_cash_funds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  currency text not null default 'GHS' check (char_length(currency) = 3),
  opening_balance numeric(14, 2) not null default 0 check (opening_balance >= 0),
  target_balance numeric(14, 2) not null check (target_balance >= 0),
  replenishment_threshold numeric(14, 2) not null check (replenishment_threshold >= 0),
  custodian_id uuid references public.profiles (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index petty_cash_funds_status_idx on public.petty_cash_funds (status);

create table public.petty_cash_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  parent_id uuid references public.petty_cash_categories (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index petty_cash_categories_root_name_idx
  on public.petty_cash_categories (name)
  where parent_id is null;

create unique index petty_cash_categories_child_name_idx
  on public.petty_cash_categories (parent_id, name)
  where parent_id is not null;

create index petty_cash_categories_parent_idx
  on public.petty_cash_categories (parent_id);

create table public.petty_cash_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index petty_cash_vendors_name_idx on public.petty_cash_vendors (lower(name));

create table public.petty_cash_number_seq (
  year integer primary key,
  last_value integer not null
);

create table public.petty_cash_replenishments (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.petty_cash_funds (id) on delete restrict,
  requested_amount numeric(14, 2) not null check (requested_amount > 0),
  approved_amount numeric(14, 2) check (approved_amount is null or approved_amount > 0),
  requested_by uuid not null references public.profiles (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending_approval' check (
    status in ('draft', 'pending_approval', 'rejected', 'approved', 'completed')
  ),
  notes text,
  rejection_reason text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  transaction_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index petty_cash_replenishments_fund_idx
  on public.petty_cash_replenishments (fund_id, status);

create table public.petty_cash_transactions (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.petty_cash_funds (id) on delete restrict,
  transaction_number text not null,
  transaction_type text not null check (
    transaction_type in (
      'opening_balance',
      'top_up',
      'cash_return',
      'adjustment_in',
      'expense',
      'cash_withdrawal',
      'adjustment_out'
    )
  ),
  direction text not null check (direction in ('in', 'out')),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  transaction_date date not null,
  description text not null,
  category_id uuid references public.petty_cash_categories (id) on delete restrict,
  subcategory_id uuid references public.petty_cash_categories (id) on delete restrict,
  vendor_id uuid references public.petty_cash_vendors (id) on delete set null,
  receipt_number text,
  reference text,
  notes text,
  status text not null default 'draft' check (
    status in ('draft', 'pending_approval', 'rejected', 'approved', 'posted', 'voided')
  ),
  exception_requested boolean not null default false,
  replenishment_id uuid references public.petty_cash_replenishments (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  posted_at timestamptz,
  voided_by uuid references public.profiles (id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (
      direction = 'in'
      and transaction_type in ('opening_balance', 'top_up', 'cash_return', 'adjustment_in')
    )
    or (
      direction = 'out'
      and transaction_type in ('expense', 'cash_withdrawal', 'adjustment_out')
    )
  )
);

create unique index petty_cash_transactions_number_idx
  on public.petty_cash_transactions (transaction_number);

create index petty_cash_transactions_fund_idx
  on public.petty_cash_transactions (fund_id, transaction_date desc, created_at desc);

create index petty_cash_transactions_pending_idx
  on public.petty_cash_transactions (status)
  where status = 'pending_approval';

create unique index petty_cash_transactions_opening_idx
  on public.petty_cash_transactions (fund_id)
  where transaction_type = 'opening_balance' and status <> 'voided';

create unique index petty_cash_transactions_replenishment_idx
  on public.petty_cash_transactions (replenishment_id)
  where replenishment_id is not null;

alter table public.petty_cash_replenishments
  add constraint petty_cash_replenishments_transaction_id_fkey
  foreign key (transaction_id) references public.petty_cash_transactions (id) on delete restrict;

create table public.petty_cash_attachments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.petty_cash_transactions (id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size integer not null check (file_size > 0),
  storage_key text not null,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index petty_cash_attachments_transaction_idx
  on public.petty_cash_attachments (transaction_id);

create table public.petty_cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.petty_cash_funds (id) on delete restrict,
  reconciliation_date date not null,
  expected_balance numeric(14, 2) not null,
  actual_balance numeric(14, 2) not null check (actual_balance >= 0),
  variance numeric(14, 2) generated always as (actual_balance - expected_balance) stored,
  reason text,
  notes text,
  performed_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid references public.profiles (id) on delete set null,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index petty_cash_reconciliations_fund_idx
  on public.petty_cash_reconciliations (fund_id, reconciliation_date desc);

create table public.petty_cash_audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  performed_by uuid references public.profiles (id) on delete set null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index petty_cash_audit_logs_entity_idx
  on public.petty_cash_audit_logs (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create trigger petty_cash_settings_set_updated_at
  before update on public.petty_cash_settings
  for each row execute function public.set_updated_at();

create trigger petty_cash_funds_set_updated_at
  before update on public.petty_cash_funds
  for each row execute function public.set_updated_at();

create trigger petty_cash_categories_set_updated_at
  before update on public.petty_cash_categories
  for each row execute function public.set_updated_at();

create trigger petty_cash_vendors_set_updated_at
  before update on public.petty_cash_vendors
  for each row execute function public.set_updated_at();

create trigger petty_cash_transactions_set_updated_at
  before update on public.petty_cash_transactions
  for each row execute function public.set_updated_at();

create trigger petty_cash_reconciliations_set_updated_at
  before update on public.petty_cash_reconciliations
  for each row execute function public.set_updated_at();

create trigger petty_cash_replenishments_set_updated_at
  before update on public.petty_cash_replenishments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Transaction numbers
-- ---------------------------------------------------------------------------

create or replace function private.assign_petty_cash_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := extract(year from coalesce(new.transaction_date, current_date))::integer;
  n integer;
begin
  if new.transaction_number is not null and length(btrim(new.transaction_number)) > 0 then
    return new;
  end if;

  insert into public.petty_cash_number_seq as seq (year, last_value)
  values (y, 1)
  on conflict (year) do update
    set last_value = seq.last_value + 1
  returning last_value into n;

  new.transaction_number := 'PC-' || y::text || '-' || lpad(n::text, 6, '0');
  return new;
end;
$$;

revoke all on function private.assign_petty_cash_number() from public;

create trigger petty_cash_transactions_assign_number
  before insert on public.petty_cash_transactions
  for each row execute function private.assign_petty_cash_number();

-- Blocks direct posted/voided writes unless a ledger function set the flag.
create or replace function private.guard_petty_cash_transaction()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('petty_cash.internal', true) = 'on' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status in ('posted', 'voided') then
    raise exception 'Posted transactions cannot be edited.';
  end if;

  if new.status in ('posted', 'voided') then
    raise exception 'Posted transactions must go through the ledger.';
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'pending_approval'
     and new.status = 'pending_approval'
     and (
       new.amount is distinct from old.amount
       or new.fund_id is distinct from old.fund_id
       or new.direction is distinct from old.direction
     )
  then
    raise exception 'Submitted transactions cannot change amount. Reject the transaction first.';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_petty_cash_transaction() from public;

create trigger petty_cash_transactions_guard
  before insert or update on public.petty_cash_transactions
  for each row execute function private.guard_petty_cash_transaction();

create or replace function private.guard_petty_cash_replenishment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_allow boolean;
begin
  if current_setting('petty_cash.internal', true) = 'on' then
    return new;
  end if;

  if new.status = 'completed' then
    raise exception 'Replenishment is completed when the cash is received.';
  end if;

  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and old.status is distinct from 'approved'
  then
    if new.approved_by is distinct from (select auth.uid()) then
      raise exception 'Approval must be recorded as the signed-in user.';
    end if;

    select allow_self_approval into v_allow from public.petty_cash_settings where id;
    if new.requested_by = (select auth.uid()) and coalesce(v_allow, false) = false then
      raise exception 'You cannot approve your own replenishment.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_petty_cash_replenishment() from public;

create trigger petty_cash_replenishments_guard
  before insert or update on public.petty_cash_replenishments
  for each row execute function private.guard_petty_cash_replenishment();

create or replace function private.guard_petty_cash_reconciliation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.variance <> 0 and (new.reason is null or length(btrim(new.reason)) = 0) then
    raise exception 'A reason is required when the cash count does not match.';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_petty_cash_reconciliation() from public;

create trigger petty_cash_reconciliations_guard
  before insert or update on public.petty_cash_reconciliations
  for each row execute function private.guard_petty_cash_reconciliation();

-- ---------------------------------------------------------------------------
-- Ledger functions
-- ---------------------------------------------------------------------------

create or replace function public.post_petty_cash_transaction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.petty_cash_transactions%rowtype;
  v_fund public.petty_cash_funds%rowtype;
  v_settings public.petty_cash_settings%rowtype;
  v_balance numeric(14, 2);
  v_next numeric(14, 2);
  v_has_receipt boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in.';
  end if;

  if not private.can_access_petty_cash() then
    raise exception 'You do not have access to petty cash.';
  end if;

  select * into v_settings from public.petty_cash_settings where id;

  select * into v_tx
  from public.petty_cash_transactions
  where id = p_id
  for update;

  if not found then
    raise exception 'Transaction not found.';
  end if;

  if v_tx.status not in ('pending_approval', 'approved') then
    raise exception 'Only transactions waiting for approval can be posted.';
  end if;

  select * into v_fund
  from public.petty_cash_funds
  where id = v_tx.fund_id
  for update;

  if not found then
    raise exception 'Fund not found.';
  end if;

  if v_fund.status <> 'active' then
    raise exception 'This fund is currently % and cannot accept new transactions.', v_fund.status;
  end if;

  if v_tx.created_by = (select auth.uid())
     and not v_settings.allow_self_approval
     and (
       v_tx.exception_requested
       or v_tx.amount > v_settings.auto_approve_up_to
     )
  then
    raise exception 'You cannot approve your own transaction.';
  end if;

  if v_tx.amount > v_settings.max_transaction_amount and not v_tx.exception_requested then
    raise exception 'This transaction exceeds the petty cash limit.';
  end if;

  if v_tx.transaction_type = 'expense'
     and v_tx.amount > v_settings.receipt_required_above
     and not private.is_org_admin()
  then
    select exists (
      select 1
      from public.petty_cash_attachments attachment
      where attachment.transaction_id = v_tx.id
    )
    into v_has_receipt;

    if not v_has_receipt then
      raise exception 'Please attach a receipt because receipts are required for expenses above %.',
        trim(to_char(v_settings.receipt_required_above, 'FM999,999,990.00'));
    end if;
  end if;

  select coalesce(sum(
    case when direction = 'in' then amount else -amount end
  ), 0)
  into v_balance
  from public.petty_cash_transactions
  where fund_id = v_tx.fund_id
    and status = 'posted'
    and id <> v_tx.id;

  v_next := v_balance + case when v_tx.direction = 'in' then v_tx.amount else -v_tx.amount end;

  if v_next < 0 and not v_settings.allow_negative_balance then
    raise exception 'Insufficient petty cash balance. Available: %. Requested: %.',
      trim(to_char(v_balance, 'FM999,999,990.00')),
      trim(to_char(v_tx.amount, 'FM999,999,990.00'));
  end if;

  perform set_config('petty_cash.internal', 'on', true);

  update public.petty_cash_transactions
  set
    status = 'posted',
    approved_by = coalesce(approved_by, (select auth.uid())),
    approved_at = coalesce(approved_at, now()),
    posted_at = now()
  where id = p_id;

  insert into public.petty_cash_audit_logs (
    entity_type, entity_id, action, performed_by, new_values
  ) values (
    'transaction',
    p_id,
    'posted',
    (select auth.uid()),
    jsonb_build_object(
      'status', 'posted',
      'amount', v_tx.amount,
      'direction', v_tx.direction
    )
  );
end;
$$;

revoke all on function public.post_petty_cash_transaction(uuid) from public;
grant execute on function public.post_petty_cash_transaction(uuid) to authenticated;

create or replace function public.post_petty_cash_opening(
  p_fund_id uuid,
  p_amount numeric,
  p_transaction_date date,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fund public.petty_cash_funds%rowtype;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in.';
  end if;

  if not private.can_manage_petty_cash() then
    raise exception 'You do not have access to fund petty cash.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Opening balance must be greater than 0.';
  end if;

  select * into v_fund
  from public.petty_cash_funds
  where id = p_fund_id
  for update;

  if not found then
    raise exception 'Fund not found.';
  end if;

  if v_fund.status <> 'active' then
    raise exception 'This fund is currently % and cannot accept new transactions.', v_fund.status;
  end if;

  if exists (
    select 1
    from public.petty_cash_transactions
    where fund_id = p_fund_id
      and transaction_type = 'opening_balance'
      and status <> 'voided'
  ) then
    raise exception 'This fund already has an opening balance.';
  end if;

  perform set_config('petty_cash.internal', 'on', true);

  insert into public.petty_cash_transactions (
    fund_id,
    transaction_number,
    transaction_type,
    direction,
    amount,
    currency,
    transaction_date,
    description,
    status,
    created_by,
    approved_by,
    approved_at,
    posted_at
  ) values (
    p_fund_id,
    '',
    'opening_balance',
    'in',
    p_amount,
    v_fund.currency,
    coalesce(p_transaction_date, current_date),
    coalesce(nullif(btrim(p_description), ''), 'Opening balance'),
    'posted',
    (select auth.uid()),
    (select auth.uid()),
    now(),
    now()
  )
  returning id into v_id;

  insert into public.petty_cash_audit_logs (
    entity_type, entity_id, action, performed_by, new_values
  ) values (
    'transaction',
    v_id,
    'posted',
    (select auth.uid()),
    jsonb_build_object('transaction_type', 'opening_balance', 'amount', p_amount)
  );

  return v_id;
end;
$$;

revoke all on function public.post_petty_cash_opening(uuid, numeric, date, text) from public;
grant execute on function public.post_petty_cash_opening(uuid, numeric, date, text) to authenticated;

create or replace function public.void_petty_cash_transaction(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.petty_cash_transactions%rowtype;
  v_settings public.petty_cash_settings%rowtype;
  v_balance numeric(14, 2);
  v_next numeric(14, 2);
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in.';
  end if;

  if not private.can_manage_petty_cash() then
    raise exception 'You do not have access to void petty cash transactions.';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A reason is required to void a transaction.';
  end if;

  select * into v_tx
  from public.petty_cash_transactions
  where id = p_id
  for update;

  if not found then
    raise exception 'Transaction not found.';
  end if;

  if v_tx.status <> 'posted' then
    raise exception 'Only posted transactions can be voided.';
  end if;

  select * into v_settings from public.petty_cash_settings where id;

  perform 1
  from public.petty_cash_funds
  where id = v_tx.fund_id
  for update;

  select coalesce(sum(
    case when direction = 'in' then amount else -amount end
  ), 0)
  into v_balance
  from public.petty_cash_transactions
  where fund_id = v_tx.fund_id
    and status = 'posted'
    and id <> v_tx.id;

  v_next := v_balance;

  if v_next < 0 and not v_settings.allow_negative_balance then
    raise exception 'Voiding this transaction would make the fund balance negative.';
  end if;

  perform set_config('petty_cash.internal', 'on', true);

  update public.petty_cash_transactions
  set
    status = 'voided',
    voided_by = (select auth.uid()),
    voided_at = now(),
    void_reason = btrim(p_reason)
  where id = p_id;

  insert into public.petty_cash_audit_logs (
    entity_type, entity_id, action, performed_by, old_values, new_values
  ) values (
    'transaction',
    p_id,
    'voided',
    (select auth.uid()),
    jsonb_build_object('status', 'posted', 'amount', v_tx.amount),
    jsonb_build_object('status', 'voided', 'reason', btrim(p_reason))
  );
end;
$$;

revoke all on function public.void_petty_cash_transaction(uuid, text) from public;
grant execute on function public.void_petty_cash_transaction(uuid, text) to authenticated;

create or replace function public.complete_petty_cash_replenishment(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.petty_cash_replenishments%rowtype;
  v_fund public.petty_cash_funds%rowtype;
  v_amount numeric(14, 2);
  v_tx uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in.';
  end if;

  if not private.can_manage_petty_cash() then
    raise exception 'You do not have access to complete a replenishment.';
  end if;

  select * into v_row
  from public.petty_cash_replenishments
  where id = p_id
  for update;

  if not found then
    raise exception 'Replenishment not found.';
  end if;

  if v_row.status <> 'approved' then
    raise exception 'Only an approved replenishment can be completed.';
  end if;

  v_amount := coalesce(v_row.approved_amount, v_row.requested_amount);

  select * into v_fund
  from public.petty_cash_funds
  where id = v_row.fund_id
  for update;

  if v_fund.status <> 'active' then
    raise exception 'This fund is currently % and cannot accept new transactions.', v_fund.status;
  end if;

  perform set_config('petty_cash.internal', 'on', true);

  insert into public.petty_cash_transactions (
    fund_id,
    transaction_number,
    transaction_type,
    direction,
    amount,
    currency,
    transaction_date,
    description,
    status,
    replenishment_id,
    created_by,
    approved_by,
    approved_at,
    posted_at,
    notes
  ) values (
    v_row.fund_id,
    '',
    'top_up',
    'in',
    v_amount,
    v_fund.currency,
    current_date,
    'Petty cash replenishment',
    'posted',
    v_row.id,
    (select auth.uid()),
    coalesce(v_row.approved_by, (select auth.uid())),
    coalesce(v_row.approved_at, now()),
    now(),
    v_row.notes
  )
  returning id into v_tx;

  update public.petty_cash_replenishments
  set
    status = 'completed',
    completed_at = now(),
    transaction_id = v_tx
  where id = p_id;

  insert into public.petty_cash_audit_logs (
    entity_type, entity_id, action, performed_by, new_values
  ) values
    (
      'replenishment',
      p_id,
      'completed',
      (select auth.uid()),
      jsonb_build_object('amount', v_amount, 'transaction_id', v_tx)
    ),
    (
      'transaction',
      v_tx,
      'posted',
      (select auth.uid()),
      jsonb_build_object('transaction_type', 'top_up', 'amount', v_amount)
    );

  return v_tx;
end;
$$;

revoke all on function public.complete_petty_cash_replenishment(uuid) from public;
grant execute on function public.complete_petty_cash_replenishment(uuid) to authenticated;

create or replace function public.petty_cash_people()
returns table (
  id uuid,
  first_name text,
  last_name text,
  preferred_name text,
  job_title text,
  department_id uuid,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile.id,
    profile.first_name,
    profile.last_name,
    profile.preferred_name,
    profile.job_title,
    profile.department_id,
    profile.status::text
  from public.profiles profile
  where private.can_access_petty_cash()
  order by profile.first_name, profile.last_name;
$$;

revoke all on function public.petty_cash_people() from public;
grant execute on function public.petty_cash_people() to authenticated;

-- ---------------------------------------------------------------------------
-- Seed categories
-- ---------------------------------------------------------------------------

with parents as (
  insert into public.petty_cash_categories (name)
  values
    ('Office & Administration'),
    ('Transport'),
    ('Staff'),
    ('Operations'),
    ('Other')
  returning id, name
)
insert into public.petty_cash_categories (name, parent_id)
select child.name, parents.id
from parents
join (
  values
    ('Office Supplies', 'Office & Administration'),
    ('Stationery', 'Office & Administration'),
    ('Printing', 'Office & Administration'),
    ('Cleaning', 'Office & Administration'),
    ('Water', 'Office & Administration'),
    ('Utilities', 'Office & Administration'),
    ('Internet', 'Office & Administration'),
    ('Office Maintenance', 'Office & Administration'),
    ('Taxi', 'Transport'),
    ('Fuel', 'Transport'),
    ('Delivery', 'Transport'),
    ('Courier', 'Transport'),
    ('Parking', 'Transport'),
    ('Transportation', 'Transport'),
    ('Staff Meals', 'Staff'),
    ('Refreshments', 'Staff'),
    ('Staff Welfare', 'Staff'),
    ('Medical', 'Staff'),
    ('Repairs', 'Operations'),
    ('Equipment', 'Operations'),
    ('Software', 'Operations'),
    ('Communication', 'Operations'),
    ('Miscellaneous', 'Other'),
    ('Emergency Expense', 'Other')
) as child(name, parent_name) on child.parent_name = parents.name;

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

grant select, insert, update on public.petty_cash_settings to authenticated;
grant select, insert, update, delete on public.petty_cash_settings to service_role;

grant select, insert, update on public.petty_cash_funds to authenticated;
grant select, insert, update, delete on public.petty_cash_funds to service_role;

grant select, insert, update on public.petty_cash_categories to authenticated;
grant select, insert, update, delete on public.petty_cash_categories to service_role;

grant select, insert, update on public.petty_cash_vendors to authenticated;
grant select, insert, update, delete on public.petty_cash_vendors to service_role;

grant select, insert, update, delete on public.petty_cash_transactions to authenticated;
grant select, insert, update, delete on public.petty_cash_transactions to service_role;

grant select, insert, delete on public.petty_cash_attachments to authenticated;
grant select, insert, update, delete on public.petty_cash_attachments to service_role;

grant select, insert, update on public.petty_cash_reconciliations to authenticated;
grant select, insert, update, delete on public.petty_cash_reconciliations to service_role;

grant select, insert, update on public.petty_cash_replenishments to authenticated;
grant select, insert, update, delete on public.petty_cash_replenishments to service_role;

grant select, insert on public.petty_cash_audit_logs to authenticated;
grant select, insert, update, delete on public.petty_cash_audit_logs to service_role;

revoke all on public.petty_cash_number_seq from public, anon, authenticated;
grant select, insert, update, delete on public.petty_cash_number_seq to service_role;

alter table public.petty_cash_settings enable row level security;
alter table public.petty_cash_funds enable row level security;
alter table public.petty_cash_categories enable row level security;
alter table public.petty_cash_vendors enable row level security;
alter table public.petty_cash_number_seq enable row level security;
alter table public.petty_cash_transactions enable row level security;
alter table public.petty_cash_attachments enable row level security;
alter table public.petty_cash_reconciliations enable row level security;
alter table public.petty_cash_replenishments enable row level security;
alter table public.petty_cash_audit_logs enable row level security;

create policy petty_cash_settings_select
  on public.petty_cash_settings for select to authenticated
  using (private.can_access_petty_cash());

create policy petty_cash_settings_update
  on public.petty_cash_settings for update to authenticated
  using (private.can_manage_petty_cash())
  with check (private.can_manage_petty_cash());

create policy petty_cash_funds_select
  on public.petty_cash_funds for select to authenticated
  using (private.can_access_petty_cash());

create policy petty_cash_funds_insert
  on public.petty_cash_funds for insert to authenticated
  with check (private.can_manage_petty_cash());

create policy petty_cash_funds_update
  on public.petty_cash_funds for update to authenticated
  using (private.can_manage_petty_cash())
  with check (private.can_manage_petty_cash());

create policy petty_cash_categories_select
  on public.petty_cash_categories for select to authenticated
  using (private.can_access_petty_cash());

create policy petty_cash_categories_write
  on public.petty_cash_categories for insert to authenticated
  with check (private.can_manage_petty_cash());

create policy petty_cash_categories_update
  on public.petty_cash_categories for update to authenticated
  using (private.can_manage_petty_cash())
  with check (private.can_manage_petty_cash());

create policy petty_cash_vendors_select
  on public.petty_cash_vendors for select to authenticated
  using (private.can_access_petty_cash());

create policy petty_cash_vendors_insert
  on public.petty_cash_vendors for insert to authenticated
  with check (private.can_manage_petty_cash());

create policy petty_cash_vendors_update
  on public.petty_cash_vendors for update to authenticated
  using (private.can_manage_petty_cash())
  with check (private.can_manage_petty_cash());

create policy petty_cash_transactions_select
  on public.petty_cash_transactions for select to authenticated
  using (private.can_access_petty_cash());

create policy petty_cash_transactions_insert
  on public.petty_cash_transactions for insert to authenticated
  with check (
    private.can_manage_petty_cash()
    and created_by = (select auth.uid())
    and status in ('draft', 'pending_approval')
  );

create policy petty_cash_transactions_update
  on public.petty_cash_transactions for update to authenticated
  using (
    private.can_manage_petty_cash()
    and status in ('draft', 'pending_approval', 'rejected')
  )
  with check (
    private.can_manage_petty_cash()
    and status in ('draft', 'pending_approval', 'rejected')
  );

create policy petty_cash_transactions_delete
  on public.petty_cash_transactions for delete to authenticated
  using (
    private.can_manage_petty_cash()
    and status = 'draft'
    and created_by = (select auth.uid())
  );

create policy petty_cash_attachments_select
  on public.petty_cash_attachments for select to authenticated
  using (private.can_access_petty_cash());

create policy petty_cash_attachments_insert
  on public.petty_cash_attachments for insert to authenticated
  with check (
    private.can_manage_petty_cash()
    and uploaded_by = (select auth.uid())
  );

create policy petty_cash_attachments_delete
  on public.petty_cash_attachments for delete to authenticated
  using (private.can_manage_petty_cash());

create policy petty_cash_reconciliations_select
  on public.petty_cash_reconciliations for select to authenticated
  using (private.can_access_petty_cash());

create policy petty_cash_reconciliations_insert
  on public.petty_cash_reconciliations for insert to authenticated
  with check (
    private.can_manage_petty_cash()
    and performed_by = (select auth.uid())
  );

create policy petty_cash_reconciliations_update
  on public.petty_cash_reconciliations for update to authenticated
  using (private.can_access_petty_cash())
  with check (private.can_access_petty_cash());

create policy petty_cash_replenishments_select
  on public.petty_cash_replenishments for select to authenticated
  using (private.can_access_petty_cash());

create policy petty_cash_replenishments_insert
  on public.petty_cash_replenishments for insert to authenticated
  with check (
    private.can_manage_petty_cash()
    and requested_by = (select auth.uid())
    and status in ('draft', 'pending_approval')
  );

create policy petty_cash_replenishments_update
  on public.petty_cash_replenishments for update to authenticated
  using (private.can_access_petty_cash())
  with check (
    private.can_access_petty_cash()
    and status in ('draft', 'pending_approval', 'rejected', 'approved')
  );

create policy petty_cash_audit_select
  on public.petty_cash_audit_logs for select to authenticated
  using (private.can_access_petty_cash());

create policy petty_cash_audit_insert
  on public.petty_cash_audit_logs for insert to authenticated
  with check (
    private.can_access_petty_cash()
    and performed_by = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Receipt storage (private)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'petty-cash',
  'petty-cash',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy petty_cash_storage_select
  on storage.objects for select to authenticated
  using (bucket_id = 'petty-cash' and private.can_access_petty_cash());

create policy petty_cash_storage_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'petty-cash' and private.can_manage_petty_cash());

create policy petty_cash_storage_update
  on storage.objects for update to authenticated
  using (bucket_id = 'petty-cash' and private.can_manage_petty_cash())
  with check (bucket_id = 'petty-cash' and private.can_manage_petty_cash());

create policy petty_cash_storage_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'petty-cash' and private.can_manage_petty_cash());
