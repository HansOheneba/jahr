import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { DEFAULT_PACKAGE_LINES } from "@/lib/payroll/types";
import { withDefaultAmounts } from "@/lib/payroll/totals";
import { isOrgAdmin } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

/** Idempotent seed of pay_details + default package lines. Safe during RSC render. */
export async function ensureDefaultPayPackage(
  employeeId: string,
): Promise<{ error?: string; success?: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile || !isOrgAdmin(profile)) {
    return { error: "Only org admins can create pay packages." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existing } = await supabase
    .from("pay_package_lines")
    .select("id")
    .eq("employee_id", employeeId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true };
  }

  const { data: details } = await supabase
    .from("pay_details")
    .select("salary, currency, pay_frequency")
    .eq("employee_id", employeeId)
    .maybeSingle();

  const salary =
    details?.salary === null || details?.salary === undefined
      ? null
      : Number(details.salary);

  if (!details) {
    const { error } = await supabase.from("pay_details").insert({
      employee_id: employeeId,
      salary: null,
      currency: "GHS",
      pay_frequency: "monthly",
      payment_method: "bank_transfer",
    });
    if (error) return { error: error.message };
  }

  const lines = withDefaultAmounts(DEFAULT_PACKAGE_LINES, salary);
  const { error } = await supabase.from("pay_package_lines").insert(
    lines.map((line) => ({
      employee_id: employeeId,
      kind: line.kind,
      code: line.code,
      label: line.label,
      amount: line.amount,
      sort_order: line.sort_order,
      active: line.active,
    })),
  );

  if (error) return { error: error.message };

  return { success: true };
}
