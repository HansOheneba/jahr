"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { ensureDefaultPayPackage as seedDefaultPayPackage } from "@/lib/payroll/ensure-package";
import {
  DEFAULT_PACKAGE_LINES,
  type PayFrequency,
  type PayPackageLineInput,
} from "@/lib/payroll/types";
import { computePayTotals, withDefaultAmounts } from "@/lib/payroll/totals";
import { isOrgAdmin } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";
import {
  isPeriodBeforeEmployment,
  type PayPeriod,
} from "@/lib/payroll/period";

export interface PayrollActionResult {
  error?: string;
  success?: boolean;
  payslipId?: string;
}

export interface SavePayPackageInput {
  employeeId: string;
  salary: number | null;
  currency: string;
  payFrequency: PayFrequency;
  bankName: string;
  bankBranch: string;
  accountName: string;
  accountNumber: string;
  paymentMethod: string;
  ssnitNumber: string;
  tinNumber: string;
  nationalId: string;
  lines: PayPackageLineInput[];
}

export async function savePayPackage(
  input: SavePayPackageInput,
): Promise<PayrollActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !isOrgAdmin(profile)) {
    return { error: "Only org admins can edit pay packages." };
  }

  const employeeId = input.employeeId;
  if (!employeeId) {
    return { error: "Employee is required." };
  }

  const lines =
    input.lines.length > 0
      ? input.lines
      : withDefaultAmounts(DEFAULT_PACKAGE_LINES, input.salary);

  const basicLine = lines.find((line) => line.code === "basic" && line.active);
  const salary =
    input.salary !== null && !Number.isNaN(input.salary)
      ? input.salary
      : (basicLine?.amount ?? null);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      ssnit_number: input.ssnitNumber.trim() || null,
      tin_number: input.tinNumber.trim() || null,
      national_id: input.nationalId.trim() || null,
    })
    .eq("id", employeeId);

  if (profileError) {
    return { error: profileError.message };
  }

  const { error: payError } = await supabase.from("pay_details").upsert(
    {
      employee_id: employeeId,
      salary,
      currency: input.currency.trim() || "GHS",
      pay_frequency: input.payFrequency || "monthly",
      bank_name: input.bankName.trim() || null,
      bank_branch: input.bankBranch.trim() || null,
      account_name: input.accountName.trim() || null,
      account_number: input.accountNumber.trim() || null,
      payment_method: input.paymentMethod.trim() || "bank_transfer",
    },
    { onConflict: "employee_id" },
  );

  if (payError) {
    return { error: payError.message };
  }

  const { error: deleteError } = await supabase
    .from("pay_package_lines")
    .delete()
    .eq("employee_id", employeeId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const rows = lines.map((line, index) => ({
    employee_id: employeeId,
    kind: line.kind,
    code: line.code.trim(),
    label: line.label.trim(),
    amount: Number(line.amount) || 0,
    sort_order: line.sort_order ?? (index + 1) * 10,
    active: line.active !== false,
  }));

  if (rows.some((row) => !row.code || !row.label)) {
    return { error: "Every pay line needs a code and label." };
  }

  const { error: insertError } = await supabase
    .from("pay_package_lines")
    .insert(rows);

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/admin/payroll");
  revalidatePath("/documents");
  revalidatePath("/settings");
  return { success: true };
}

/** Client/mutation entry - seeds package then revalidates. Do not call from RSC render. */
export async function ensureDefaultPayPackage(
  employeeId: string,
): Promise<PayrollActionResult> {
  const result = await seedDefaultPayPackage(employeeId);
  if (result.error) return result;
  revalidatePath("/admin/payroll");
  return { success: true };
}

/** Create a period snapshot from the current package if one does not exist. */
export async function ensurePayslipSnapshot(input: {
  employeeId: string;
  period: PayPeriod;
}): Promise<PayrollActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return { error: "You must be signed in." };
  }

  const { employeeId, period } = input;
  if (viewer.id !== employeeId && !isOrgAdmin(viewer)) {
    return { error: "You cannot generate this payslip." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existing } = await supabase
    .from("payslips")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("period_start", period.periodStart)
    .eq("period_end", period.periodEnd)
    .maybeSingle();

  if (existing) {
    return { success: true, payslipId: existing.id };
  }

  const [
    { data: employee },
    { data: details },
    { data: lines, error: packageLinesError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("start_date")
      .eq("id", employeeId)
      .maybeSingle(),
    supabase
      .from("pay_details")
      .select("currency")
      .eq("employee_id", employeeId)
      .maybeSingle(),
    supabase
      .from("pay_package_lines")
      .select("kind, code, label, amount, sort_order, active")
      .eq("employee_id", employeeId)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (isPeriodBeforeEmployment(period, employee?.start_date)) {
    return {
      error:
        "That month is before this employee’s start date. Choose a later period.",
    };
  }

  if (packageLinesError) {
    return { error: packageLinesError.message };
  }

  if (!lines || lines.length === 0) {
    return {
      error:
        "No pay package on file. Ask HR to set up earnings and deductions first.",
    };
  }

  const activeLines = lines.map((line) => ({
    kind: line.kind as "earning" | "deduction" | "employer_contribution",
    code: line.code,
    label: line.label,
    amount: Number(line.amount),
    sort_order: line.sort_order,
    active: true as const,
  }));

  const totals = computePayTotals(activeLines);
  const currency = details?.currency ?? "GHS";
  const now = new Date().toISOString();

  const { data: slip, error: slipError } = await supabase
    .from("payslips")
    .insert({
      employee_id: employeeId,
      period_label: period.periodLabel,
      period_start: period.periodStart,
      period_end: period.periodEnd,
      gross_pay: totals.grossPay,
      total_deductions: totals.totalDeductions,
      net_pay: totals.netPay,
      currency,
      status: "generated",
      generated_at: now,
      generated_by: viewer.id,
      uploaded_at: now,
    })
    .select("id")
    .single();

  if (slipError || !slip) {
    if (slipError?.code === "23505") {
      const { data: raced } = await supabase
        .from("payslips")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("period_start", period.periodStart)
        .eq("period_end", period.periodEnd)
        .maybeSingle();
      if (raced) return { success: true, payslipId: raced.id };
    }
    return { error: slipError?.message ?? "Could not create payslip." };
  }

  const { error: linesError } = await supabase.from("payslip_lines").insert(
    activeLines.map((line) => ({
      payslip_id: slip.id,
      kind: line.kind,
      code: line.code,
      label: line.label,
      amount: line.amount,
      sort_order: line.sort_order,
    })),
  );

  if (linesError) {
    await supabase.from("payslips").delete().eq("id", slip.id);
    return { error: linesError.message };
  }

  await supabase.from("audit_logs").insert({
    actor_id: viewer.id,
    subject_id: employeeId,
    action: "downloaded_payslip",
    metadata: {
      payslip_id: slip.id,
      period_label: period.periodLabel,
    },
  });

  revalidatePath("/documents");
  revalidatePath("/settings");
  revalidatePath("/admin/payroll");
  return { success: true, payslipId: slip.id };
}
