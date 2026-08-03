export type PayLineKind = "earning" | "deduction" | "employer_contribution";
export type PayFrequency = "monthly" | "weekly";
export type PayslipStatus = "generated";

export interface PayPackageLine {
  id: string;
  employee_id: string;
  kind: PayLineKind;
  code: string;
  label: string;
  amount: number;
  sort_order: number;
  active: boolean;
}

export interface PayPackageLineInput {
  kind: PayLineKind;
  code: string;
  label: string;
  amount: number;
  sort_order: number;
  active: boolean;
}

export interface PayDetailsRecord {
  employee_id: string;
  salary: number | null;
  currency: string;
  pay_frequency: PayFrequency;
  bank_name: string | null;
  bank_branch: string | null;
  account_name: string | null;
  account_number: string | null;
  payment_method: string;
}

export interface PayslipLine {
  id: string;
  payslip_id: string;
  kind: PayLineKind;
  code: string;
  label: string;
  amount: number;
  sort_order: number;
}

export interface PayslipSnapshot {
  id: string;
  employee_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  currency: string;
  status: PayslipStatus;
  generated_at: string | null;
  generated_by: string | null;
  file_url: string | null;
  uploaded_at: string;
  lines: PayslipLine[];
}

export interface PayrollEmployeeSummary {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string;
  job_title: string | null;
  employee_number: string | null;
  department_name: string | null;
  avatar_url: string | null;
  salary: number | null;
  currency: string | null;
  has_package: boolean;
}

export interface PayslipEmployeeContext {
  id: string;
  full_name: string;
  employee_number: string | null;
  job_title: string | null;
  department_name: string | null;
  ssnit_number: string | null;
  tin_number: string | null;
  national_id: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  account_number: string | null;
  account_name: string | null;
}

export interface PayPackage {
  employee: PayslipEmployeeContext;
  details: PayDetailsRecord | null;
  lines: PayPackageLine[];
}

export const DEFAULT_PACKAGE_LINES: Omit<
  PayPackageLineInput,
  "amount"
>[] = [
  {
    kind: "earning",
    code: "basic",
    label: "Basic",
    sort_order: 10,
    active: true,
  },
  {
    kind: "earning",
    code: "transport",
    label: "Transport Allowance",
    sort_order: 20,
    active: true,
  },
  {
    kind: "earning",
    code: "lunch",
    label: "Lunch Allowance",
    sort_order: 30,
    active: true,
  },
  {
    kind: "earning",
    code: "rent",
    label: "Rent Allowance",
    sort_order: 40,
    active: true,
  },
  {
    kind: "deduction",
    code: "paye",
    label: "PAYE",
    sort_order: 110,
    active: true,
  },
  {
    kind: "deduction",
    code: "ssnit_t1",
    label: "SSNIT Tier 1 (Deduction)",
    sort_order: 120,
    active: true,
  },
  {
    kind: "deduction",
    code: "ssnit_t2",
    label: "SSNIT Tier 2 (Deduction)",
    sort_order: 130,
    active: true,
  },
  {
    kind: "employer_contribution",
    code: "petra_t3",
    label: "Employer Petra - Tier 3",
    sort_order: 210,
    active: true,
  },
  {
    kind: "employer_contribution",
    code: "ssnit_t1_cc",
    label: "SSNIT Tier 1 (C.C)",
    sort_order: 220,
    active: true,
  },
  {
    kind: "employer_contribution",
    code: "ssnit_t2_cc",
    label: "SSNIT Tier 2 (C.C)",
    sort_order: 230,
    active: true,
  },
];

export const COMPANY = {
  name: "JA Group",
  addressLines: ["19 Kotey Crescent", "Labone, Accra", "Ghana"],
  queryNote:
    "In the event of any queries, kindly contact your HRBP. Thank you.",
} as const;
