-- Casual leave overlapped annual leave and is no longer offered.
-- Existing rows stay so history still reads. New requests cannot use it.

create or replace function public.leave_requests_reject_casual()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'casual' then
    raise exception 'Casual leave is no longer available';
  end if;
  return new;
end;
$$;

create trigger leave_requests_reject_casual
  before insert on public.leave_requests
  for each row
  execute function public.leave_requests_reject_casual();
