import { displayName } from "@/lib/types/database";
import type { PayslipSnapshotContext } from "@/lib/payroll/types";
import { createAdminClient } from "@/utils/supabase/admin";

export async function capturePayslipSnapshotContext(
  employeeId: string,
  payrollNumber: string | null,
): Promise<PayslipSnapshotContext | null> {
  const admin = createAdminClient();

  const [{ data: profile }, { data: details }] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "first_name, last_name, preferred_name, job_title, employee_number, department_id, ssnit_number, tin_number, national_id",
      )
      .eq("id", employeeId)
      .maybeSingle(),
    admin.from("pay_details").select("*").eq("employee_id", employeeId).maybeSingle(),
  ]);

  if (!profile) {
    return null;
  }

  let departmentName: string | null = null;
  if (profile.department_id) {
    const { data: department } = await admin
      .from("departments")
      .select("name")
      .eq("id", profile.department_id)
      .maybeSingle();
    departmentName = department?.name ?? null;
  }

  return {
    full_name: displayName(profile),
    employee_number: payrollNumber ?? profile.employee_number,
    job_title: profile.job_title,
    department_name: departmentName,
    ssnit_number: profile.ssnit_number,
    tin_number: profile.tin_number,
    national_id: profile.national_id,
    bank_name: details?.bank_name ?? null,
    bank_branch: details?.bank_branch ?? null,
    account_number: details?.account_number ?? null,
    account_name: details?.account_name ?? null,
    legal_entity_paying: details?.legal_entity_paying ?? null,
  };
}

export function snapshotContextToEmployeeContext(
  context: PayslipSnapshotContext,
  employeeId: string,
) {
  return {
    id: employeeId,
    full_name: context.full_name,
    employee_number: context.employee_number,
    job_title: context.job_title,
    department_name: context.department_name,
    ssnit_number: context.ssnit_number,
    tin_number: context.tin_number,
    national_id: context.national_id,
    bank_name: context.bank_name,
    bank_branch: context.bank_branch,
    account_number: context.account_number,
    account_name: context.account_name,
  };
}
