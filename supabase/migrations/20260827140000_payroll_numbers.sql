-- Atomic, typable payroll numbers: JA26-0100 (year + Crockford base32 sequence).

create sequence if not exists public.payroll_number_seq
  start with 1024
  increment by 1
  no maxvalue
  cache 1;

create or replace function public.crockford_encode(value bigint, min_width integer default 4)
returns text
language plpgsql
immutable
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  n bigint := value;
  remainder integer;
  result text := '';
begin
  if n < 0 then
    raise exception 'crockford_encode expects a non-negative value';
  end if;

  if n = 0 then
    return lpad('0', min_width, '0');
  end if;

  while n > 0 loop
    remainder := (n % 32)::integer;
    result := substr(alphabet, remainder + 1, 1) || result;
    n := n / 32;
  end loop;

  return lpad(result, min_width, '0');
end;
$$;

create or replace function public.next_payroll_number_seq()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.payroll_number_seq');
$$;

revoke all on function public.next_payroll_number_seq() from public;
grant execute on function public.next_payroll_number_seq() to service_role;

-- Backfill missing or legacy values (null, "1", JA-0001, etc.).
do $$
declare
  profile_row record;
  seq bigint;
  yy text;
begin
  yy := to_char(now(), 'YY');

  for profile_row in
    select id
    from public.profiles
    where employee_number is null
       or employee_number ~ '^\d{1,4}$'
       or employee_number ~* '^JA-\d+$'
       or employee_number !~ '^JA[0-9]{2}-[0-9A-HJKMNP-TV-Z]{4}$'
    order by created_at
  loop
    seq := nextval('public.payroll_number_seq');
    update public.profiles
    set employee_number = 'JA' || yy || '-' || public.crockford_encode(seq, 4)
    where id = profile_row.id;
  end loop;
end;
$$;
