import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { displayName, isOrgAdmin } from "@/lib/types/database";
import type {
  PayDetailsRecord,
  PayFrequency,
  PayLineKind,
  PayPackage,
  PayPackageLine,
  PayrollEmployeeSummary,
  PayslipEmployeeContext,
  PayslipLine,
  PayslipSnapshot,
  PayslipStatus,
} from "@/lib/payroll/types";
import { createClient } from "@/utils/supabase/server";

function mapLine(row: {
  id: string;
  employee_id: string;
  kind: string;
  code: string;
  label: string;
  amount: number | string;
  sort_order: number;
  active: boolean;
}): PayPackageLine {
  return {
    id: row.id,
    employee_id: row.employee_id,
    kind: row.kind as PayLineKind,
    code: row.code,
    label: row.label,
    amount: Number(row.amount),
    sort_order: row.sort_order,
    active: row.active,
  };
}

function mapPayslipLine(row: {
  id: string;
  payslip_id: string;
  kind: string;
  code: string;
  label: string;
  amount: number | string;
  sort_order: number;
}): PayslipLine {
  return {
    id: row.id,
    payslip_id: row.payslip_id,
    kind: row.kind as PayLineKind,
    code: row.code,
    label: row.label,
    amount: Number(row.amount),
    sort_order: row.sort_order,
  };
}

export async function getPayrollEmployees(): Promise<PayrollEmployeeSummary[]> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer.role)) {
    return [];
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, preferred_name, email, job_title, employee_number, department_id, status, avatar_url",
    )
    .neq("status", "terminated")
    .order("first_name", { ascending: true });

  if (error || !profiles) {
    if (error) console.error("[getPayrollEmployees]", error.message);
    return [];
  }

  const ids = profiles.map((p) => p.id);
  const departmentIds = [
    ...new Set(profiles.map((p) => p.department_id).filter(Boolean)),
  ] as string[];

  const [{ data: payDetails }, { data: packageLines }, { data: departments }] =
    await Promise.all([
      supabase
        .from("pay_details")
        .select("employee_id, salary, currency")
        .in("employee_id", ids),
      supabase
        .from("pay_package_lines")
        .select("employee_id")
        .in("employee_id", ids),
      departmentIds.length
        ? supabase
            .from("departments")
            .select("id, name")
            .in("id", departmentIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    ]);

  const payMap = new Map(
    (payDetails ?? []).map((row) => [row.employee_id, row]),
  );
  const packageSet = new Set((packageLines ?? []).map((row) => row.employee_id));
  const deptMap = new Map((departments ?? []).map((d) => [d.id, d.name]));

  return profiles.map((profile) => {
    const pay = payMap.get(profile.id);
    return {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      preferred_name: profile.preferred_name,
      email: profile.email,
      job_title: profile.job_title,
      employee_number: profile.employee_number,
      department_name: profile.department_id
        ? (deptMap.get(profile.department_id) ?? null)
        : null,
      avatar_url: profile.avatar_url ?? null,
      salary: pay?.salary === null || pay?.salary === undefined
        ? null
        : Number(pay.salary),
      currency: pay?.currency ?? null,
      has_package: packageSet.has(profile.id),
    };
  });
}

export async function getPayPackage(
  employeeId: string,
): Promise<PayPackage | null> {
  const viewer = await getCurrentProfile();
  if (!viewer) return null;
  if (viewer.id !== employeeId && !isOrgAdmin(viewer.role)) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, preferred_name, job_title, employee_number, department_id, ssnit_number, tin_number, national_id",
    )
    .eq("id", employeeId)
    .maybeSingle();

  if (error || !profile) {
    if (error) console.error("[getPayPackage]", error.message);
    return null;
  }

  const [{ data: department }, { data: details }, { data: lines }] =
    await Promise.all([
      profile.department_id
        ? supabase
            .from("departments")
            .select("name")
            .eq("id", profile.department_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("pay_details")
        .select("*")
        .eq("employee_id", employeeId)
        .maybeSingle(),
      supabase
        .from("pay_package_lines")
        .select("*")
        .eq("employee_id", employeeId)
        .order("sort_order", { ascending: true }),
    ]);

  const employee: PayslipEmployeeContext = {
    id: profile.id,
    full_name: displayName(profile),
    employee_number: profile.employee_number,
    job_title: profile.job_title,
    department_name: department?.name ?? null,
    ssnit_number: profile.ssnit_number,
    tin_number: profile.tin_number,
    national_id: profile.national_id,
    bank_name: details?.bank_name ?? null,
    bank_branch: details?.bank_branch ?? null,
    account_number: details?.account_number ?? null,
    account_name: details?.account_name ?? null,
  };

  const mappedDetails: PayDetailsRecord | null = details
    ? {
        employee_id: details.employee_id,
        salary: details.salary === null ? null : Number(details.salary),
        currency: details.currency,
        pay_frequency: details.pay_frequency as PayFrequency,
        bank_name: details.bank_name,
        bank_branch: details.bank_branch,
        account_name: details.account_name,
        account_number: details.account_number,
        payment_method: details.payment_method,
      }
    : null;

  return {
    employee,
    details: mappedDetails,
    lines: (lines ?? []).map(mapLine),
  };
}

export async function getPayslipSnapshot(
  payslipId: string,
): Promise<PayslipSnapshot | null> {
  const viewer = await getCurrentProfile();
  if (!viewer) return null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: slip, error } = await supabase
    .from("payslips")
    .select("*")
    .eq("id", payslipId)
    .maybeSingle();

  if (error || !slip) {
    if (error) console.error("[getPayslipSnapshot]", error.message);
    return null;
  }

  if (slip.employee_id !== viewer.id && !isOrgAdmin(viewer.role)) {
    return null;
  }

  const { data: lines } = await supabase
    .from("payslip_lines")
    .select("*")
    .eq("payslip_id", payslipId)
    .order("sort_order", { ascending: true });

  if (!slip.period_start || !slip.period_end) {
    return null;
  }

  return {
    id: slip.id,
    employee_id: slip.employee_id,
    period_label: slip.period_label,
    period_start: slip.period_start,
    period_end: slip.period_end,
    gross_pay: Number(slip.gross_pay ?? 0),
    total_deductions: Number(slip.total_deductions ?? 0),
    net_pay: Number(slip.net_pay ?? 0),
    currency: slip.currency ?? "GHS",
    status: (slip.status ?? "generated") as PayslipStatus,
    generated_at: slip.generated_at,
    generated_by: slip.generated_by,
    file_url: slip.file_url,
    uploaded_at: slip.uploaded_at,
    lines: (lines ?? []).map(mapPayslipLine),
  };
}

export async function findPayslipForPeriod(
  employeeId: string,
  periodStart: string,
  periodEnd: string,
): Promise<PayslipSnapshot | null> {
  const viewer = await getCurrentProfile();
  if (!viewer) return null;
  if (viewer.id !== employeeId && !isOrgAdmin(viewer.role)) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: slip } = await supabase
    .from("payslips")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();

  if (!slip) return null;
  return getPayslipSnapshot(slip.id);
}
