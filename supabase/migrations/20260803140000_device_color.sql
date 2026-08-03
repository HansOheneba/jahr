-- Optional colour for company devices (e.g. Space Black, Silver).

alter table public.devices
  add column if not exists color text;
