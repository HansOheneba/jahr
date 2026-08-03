-- Cost centre is out of scope for the current product surface.
alter table public.profiles
  drop column if exists cost_centre;
