import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import type { PayrollRegisterEntry } from "@/lib/payroll/types";
import { displayName, isOrgAdmin } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

export async function getPayrollRegister(): Promise<PayrollRegisterEntry[]> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer)) {
    return [];
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("payslips")
    .select(
      `
      id,
      reference,
      period_label,
      period_start,
      period_end,
      gross_pay,
      total_deductions,
      net_pay,
      currency,
      generated_at,
      employee:profiles!payslips_employee_id_fkey (
        id,
        first_name,
        last_name,
        preferred_name,
        employee_number,
        job_title
      )
    `,
    )
    .not("period_start", "is", null)
    .order("generated_at", { ascending: false, nullsFirst: false })
    .order("uploaded_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("[getPayrollRegister]", error.message);
    return [];
  }

  return data.flatMap((row) => {
    const employee = Array.isArray(row.employee) ? row.employee[0] : row.employee;
    if (!employee || !row.period_start || !row.period_end) {
      return [];
    }

    return [
      {
        id: row.id,
        reference: row.reference,
        period_label: row.period_label,
        period_start: row.period_start,
        period_end: row.period_end,
        gross_pay: row.gross_pay === null ? null : Number(row.gross_pay),
        total_deductions:
          row.total_deductions === null ? null : Number(row.total_deductions),
        net_pay: row.net_pay === null ? null : Number(row.net_pay),
        currency: row.currency ?? "GHS",
        generated_at: row.generated_at,
        employee: {
          id: employee.id,
          name: displayName(employee),
          employee_number: employee.employee_number,
          job_title: employee.job_title,
        },
      },
    ];
  });
}
