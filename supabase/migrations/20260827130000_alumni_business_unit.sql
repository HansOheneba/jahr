-- Link manual alumni records to business units for consistent reporting.

alter table public.alumni_records
  add column if not exists business_unit_id uuid
    references public.business_units (id) on delete set null;

create index if not exists alumni_records_business_unit_id_idx
  on public.alumni_records (business_unit_id);

-- Best-effort backfill when legacy free-text placement matches a unit name.
update public.alumni_records ar
set business_unit_id = bu.id
from public.business_units bu
where ar.business_unit_id is null
  and ar.placement is not null
  and lower(trim(ar.placement)) = lower(trim(bu.name));
