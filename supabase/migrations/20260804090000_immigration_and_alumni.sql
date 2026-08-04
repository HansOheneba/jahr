-- Immigration / work permit fields for employee tracking

alter table public.profiles
  add column if not exists immigration_status text,
  add column if not exists work_permit_number text,
  add column if not exists work_permit_expiry date;

comment on column public.profiles.immigration_status is
  'citizen | permanent_resident | work_permit | other';
