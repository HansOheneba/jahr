"use server";

import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/utils/supabase/server";

export async function logPayslipAccess(input: {
  payslipId: string;
  employeeId: string;
  reference: string | null;
  periodLabel: string;
  action: "generated_payslip" | "downloaded_payslip";
}): Promise<void> {
  const viewer = await getCurrentProfile();
  if (!viewer) return;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.from("audit_logs").insert({
    actor_id: viewer.id,
    subject_id: input.employeeId,
    action: input.action,
    metadata: {
      payslip_id: input.payslipId,
      payslip_reference: input.reference,
      period_label: input.periodLabel,
    },
  });
}

export async function logPayslipDownload(
  payslipId: string,
  employeeId: string,
  reference: string | null,
  periodLabel: string,
): Promise<void> {
  await logPayslipAccess({
    payslipId,
    employeeId,
    reference,
    periodLabel,
    action: "downloaded_payslip",
  });
}
