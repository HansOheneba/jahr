-- Finance role: payroll access without full org-admin privileges.

insert into public.permission_tags (slug, label, description)
values (
  'finance',
  'Finance',
  'Payroll, payslips, FX, and org reporting settings'
)
on conflict (slug) do nothing;

create or replace function private.can_manage_payroll()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_org_admin() or private.has_tag('finance');
$$;

revoke all on function private.can_manage_payroll() from public;
grant execute on function private.can_manage_payroll() to authenticated;

create or replace function private.can_view_profile(target public.profiles)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when (select auth.uid()) is null then false
      when target.id = (select auth.uid()) then true
      when private.is_org_admin() then true
      when private.has_tag('finance') then true
      when target.manager_id = (select auth.uid()) then true
      when target.id is not distinct from (private.current_profile()).manager_id
        then true
      else false
    end;
$$;

-- pay_details
drop policy if exists pay_details_select on public.pay_details;
drop policy if exists pay_details_upsert_admin_or_self on public.pay_details;
drop policy if exists pay_details_update on public.pay_details;

create policy pay_details_select
  on public.pay_details for select to authenticated
  using (
    employee_id = (select auth.uid())
    or private.can_manage_payroll()
  );

create policy pay_details_upsert_admin_or_self
  on public.pay_details for insert to authenticated
  with check (
    employee_id = (select auth.uid())
    or private.can_manage_payroll()
  );

create policy pay_details_update
  on public.pay_details for update to authenticated
  using (private.can_manage_payroll())
  with check (private.can_manage_payroll());

-- pay_package_lines
drop policy if exists pay_package_lines_select on public.pay_package_lines;
drop policy if exists pay_package_lines_insert_admin on public.pay_package_lines;
drop policy if exists pay_package_lines_update_admin on public.pay_package_lines;
drop policy if exists pay_package_lines_delete_admin on public.pay_package_lines;

create policy pay_package_lines_select
  on public.pay_package_lines for select to authenticated
  using (
    employee_id = (select auth.uid())
    or private.can_manage_payroll()
  );

create policy pay_package_lines_insert_admin
  on public.pay_package_lines for insert to authenticated
  with check (private.can_manage_payroll());

create policy pay_package_lines_update_admin
  on public.pay_package_lines for update to authenticated
  using (private.can_manage_payroll())
  with check (private.can_manage_payroll());

create policy pay_package_lines_delete_admin
  on public.pay_package_lines for delete to authenticated
  using (private.can_manage_payroll());

-- payslips
drop policy if exists payslips_select on public.payslips;
drop policy if exists payslips_insert_self_or_admin on public.payslips;
drop policy if exists payslips_update_self_or_admin on public.payslips;

create policy payslips_select
  on public.payslips for select to authenticated
  using (
    employee_id = (select auth.uid())
    or private.can_manage_payroll()
  );

create policy payslips_insert_self_or_admin
  on public.payslips for insert to authenticated
  with check (
    employee_id = (select auth.uid())
    or private.can_manage_payroll()
  );

create policy payslips_update_self_or_admin
  on public.payslips for update to authenticated
  using (
    employee_id = (select auth.uid())
    or private.can_manage_payroll()
  )
  with check (
    employee_id = (select auth.uid())
    or private.can_manage_payroll()
  );

-- payslip_lines
drop policy if exists payslip_lines_select on public.payslip_lines;
drop policy if exists payslip_lines_insert_self_or_admin on public.payslip_lines;
drop policy if exists payslip_lines_delete_admin on public.payslip_lines;

create policy payslip_lines_select
  on public.payslip_lines for select to authenticated
  using (
    exists (
      select 1 from public.payslips p
      where p.id = payslip_id
        and (
          p.employee_id = (select auth.uid())
          or private.can_manage_payroll()
        )
    )
  );

create policy payslip_lines_insert_self_or_admin
  on public.payslip_lines for insert to authenticated
  with check (
    exists (
      select 1 from public.payslips p
      where p.id = payslip_id
        and (
          p.employee_id = (select auth.uid())
          or private.can_manage_payroll()
        )
    )
  );

create policy payslip_lines_delete_admin
  on public.payslip_lines for delete to authenticated
  using (private.can_manage_payroll());

-- fx_rates
drop policy if exists fx_rates_insert_org_admin on public.fx_rates;
drop policy if exists fx_rates_update_org_admin on public.fx_rates;
drop policy if exists fx_rates_delete_org_admin on public.fx_rates;

create policy fx_rates_insert_org_admin
  on public.fx_rates for insert to authenticated
  with check (private.can_manage_payroll());

create policy fx_rates_update_org_admin
  on public.fx_rates for update to authenticated
  using (private.can_manage_payroll())
  with check (private.can_manage_payroll());

create policy fx_rates_delete_org_admin
  on public.fx_rates for delete to authenticated
  using (private.can_manage_payroll());

-- org_settings
drop policy if exists org_settings_update_org_admin on public.org_settings;

create policy org_settings_update_org_admin
  on public.org_settings for update to authenticated
  using (private.can_manage_payroll())
  with check (private.can_manage_payroll());
