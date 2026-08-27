import { createAdminClient } from "@/utils/supabase/admin";
import {
  allocatePayrollNumber,
  isPayrollNumber,
  needsPayrollNumber,
} from "@/lib/payroll/payroll-number";

/**
 * Ensures the employee has a payroll number before payslip generation.
 * Returns the assigned or existing number.
 */
export async function ensureEmployeePayrollNumber(
  employeeId: string,
): Promise<{ payrollNumber?: string; error?: string }> {
  const admin = createAdminClient();

  const { data: profile, error: fetchError } = await admin
    .from("profiles")
    .select("employee_number")
    .eq("id", employeeId)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }
  if (!profile) {
    return { error: "Employee not found." };
  }

  const current = profile.employee_number?.trim() ?? null;
  if (current && isPayrollNumber(current) && !needsPayrollNumber(current)) {
    return { payrollNumber: current.toUpperCase() };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const payrollNumber = await allocatePayrollNumber(admin);
    const { error: updateError } = await admin
      .from("profiles")
      .update({ employee_number: payrollNumber })
      .eq("id", employeeId);

    if (!updateError) {
      return { payrollNumber };
    }

    if (updateError.code !== "23505") {
      return { error: updateError.message };
    }
  }

  return { error: "Could not assign a unique payroll number." };
}
