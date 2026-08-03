-- Custom login OTPs — app-owned codes, not Supabase Auth email OTPs.
-- Only the service role may read/write this table.

create table public.login_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index login_otps_email_created_at_idx
  on public.login_otps (email, created_at desc);

alter table public.login_otps enable row level security;

revoke all on table public.login_otps from anon, authenticated, public;
grant select, insert, update, delete on table public.login_otps to service_role;
