-- Allow payroll admins to update and delete paying entities.

drop policy if exists legal_entities_update_payroll_admin on public.legal_entities;
drop policy if exists legal_entities_delete_payroll_admin on public.legal_entities;

create policy legal_entities_update_payroll_admin
  on public.legal_entities for update to authenticated
  using (private.can_manage_payroll())
  with check (private.can_manage_payroll());

create policy legal_entities_delete_payroll_admin
  on public.legal_entities for delete to authenticated
  using (private.can_manage_payroll());

grant update, delete on table public.legal_entities to authenticated;
grant update, delete on table public.legal_entities to service_role;
