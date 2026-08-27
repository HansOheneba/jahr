-- Legal payroll register: reference numbers, frozen context, immutable records.

create sequence if not exists public.payslip_reference_seq
  start with 1024
  increment by 1
  no maxvalue
  cache 1;

create or replace function public.next_payslip_reference_seq()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.payslip_reference_seq');
$$;

revoke all on function public.next_payslip_reference_seq() from public;
grant execute on function public.next_payslip_reference_seq() to service_role;

alter table public.payslips
  add column if not exists reference text,
  add column if not exists snapshot_context jsonb not null default '{}'::jsonb;

create unique index if not exists payslips_reference_uidx
  on public.payslips (reference)
  where reference is not null;

create index if not exists payslips_generated_at_idx
  on public.payslips (generated_at desc nulls last);

alter type public.audit_action add value if not exists 'generated_payslip';

do $$
declare
  slip_row record;
  seq bigint;
  yy text;
begin
  yy := to_char(now(), 'YY');

  for slip_row in
    select id
    from public.payslips
    where reference is null
    order by coalesce(generated_at, uploaded_at, created_at)
  loop
    seq := nextval('public.payslip_reference_seq');
    update public.payslips
    set reference = 'PS' || yy || '-' || public.crockford_encode(seq, 4)
    where id = slip_row.id;
  end loop;
end;
$$;

-- Generated payslips are permanent records.
drop policy if exists payslips_delete_admin on public.payslips;

create policy payslips_no_delete
  on public.payslips for delete to authenticated
  using (false);

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
  end if;

  return new;
end;
$$;

drop trigger if exists payslips_prevent_tampering on public.payslips;

create trigger payslips_prevent_tampering
  before update on public.payslips
  for each row
  execute function public.prevent_payslip_tampering();
