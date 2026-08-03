-- RLS policies invoke private.* helpers as the calling role.
-- Those functions are SECURITY DEFINER, but authenticated still needs
-- USAGE on the schema + EXECUTE on the functions.

grant usage on schema private to authenticated;

grant execute on function private.current_profile() to authenticated;
grant execute on function private.has_any_role(public.app_role[]) to authenticated;
grant execute on function private.is_org_admin() to authenticated;
grant execute on function private.can_view_profile(public.profiles) to authenticated;
