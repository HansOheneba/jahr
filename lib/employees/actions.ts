"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  APP_ROLE_LABELS,
  isOrgAdmin,
  type AppRole,
} from "@/lib/types/database";
import type {
  EmployeeCategory,
  EmploymentType,
  WorkType,
} from "@/lib/types/employee";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export interface CreateEmployeeResult {
  error?: string;
  success?: boolean;
  employeeId?: string;
}

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  personalEmail: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  nationalId: string;
  ssnitNumber: string;
  tinNumber: string;
  addressLine: string;
  city: string;
  country: string;
  jobTitle: string;
  employeeNumber: string;
  role: AppRole;
  employeeCategory: EmployeeCategory;
  workType: WorkType;
  employmentType: EmploymentType;
  officeLocation: string;
  startDate: string;
  probationEndDate: string;
  annualLeaveEntitlement: number;
  businessUnitId: string;
  departmentId: string;
  managerId: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
}

const CREATABLE_ROLES: AppRole[] = [
  "employee",
  "manager",
  "business_unit_md",
  "hr_admin",
  "coo",
];

function clean(value: string): string {
  return value.trim();
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function nextEmployeeNumber(
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("employee_number")
    .not("employee_number", "is", null);

  let max = 0;
  for (const row of data ?? []) {
    const match = /^JA-(\d+)$/i.exec(row.employee_number ?? "");
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return `JA-${String(max + 1).padStart(4, "0")}`;
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<CreateEmployeeResult> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer.role)) {
    return { error: "Only org admins can add employees." };
  }

  const firstName = clean(input.firstName);
  const lastName = clean(input.lastName);
  const email = clean(input.email).toLowerCase();
  const nationalId = clean(input.nationalId);
  const jobTitle = clean(input.jobTitle);
  const startDate = clean(input.startDate);
  const phone = clean(input.phone);

  if (!firstName || !lastName) {
    return { error: "First name and last name are required." };
  }
  if (!email || !email.includes("@")) {
    return { error: "A valid work email is required." };
  }
  if (!nationalId) {
    return { error: "Ghana Card number is required." };
  }
  if (!jobTitle) {
    return { error: "Job title is required." };
  }
  if (!startDate) {
    return { error: "Start date is required." };
  }
  if (!phone) {
    return { error: "Phone number is required." };
  }
  if (!CREATABLE_ROLES.includes(input.role)) {
    return {
      error: `Role must be one of: ${CREATABLE_ROLES.map((role) => APP_ROLE_LABELS[role]).join(", ")}.`,
    };
  }
  if (input.role === "coo" && viewer.role !== "ceo") {
    return { error: "Only the CEO can assign the COO role." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const admin = createAdminClient();

  const employeeNumber =
    emptyToNull(input.employeeNumber) ?? (await nextEmployeeNumber(supabase));

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: `${firstName} ${lastName}`.trim(),
    },
  });

  if (authError || !authData.user) {
    return {
      error: authError?.message ?? "Could not create the auth account.",
    };
  }

  const userId = authData.user.id;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      preferred_name: emptyToNull(input.preferredName),
      personal_email: emptyToNull(input.personalEmail),
      phone,
      date_of_birth: emptyToNull(input.dateOfBirth),
      gender: emptyToNull(input.gender),
      nationality: emptyToNull(input.nationality) ?? "Ghanaian",
      national_id: nationalId,
      ssnit_number: emptyToNull(input.ssnitNumber),
      tin_number: emptyToNull(input.tinNumber),
      address_line: emptyToNull(input.addressLine),
      city: emptyToNull(input.city),
      country: emptyToNull(input.country) ?? "Ghana",
      job_title: jobTitle,
      employee_number: employeeNumber,
      role: input.role,
      status: "onboarding",
      employee_category: input.employeeCategory,
      work_type: input.workType,
      employment_type: input.employmentType,
      office_location: emptyToNull(input.officeLocation),
      start_date: startDate,
      probation_end_date: emptyToNull(input.probationEndDate),
      annual_leave_entitlement: input.annualLeaveEntitlement || 25,
      business_unit_id: emptyToNull(input.businessUnitId),
      department_id: emptyToNull(input.departmentId),
      manager_id: emptyToNull(input.managerId),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  const emergencyName = clean(input.emergencyName);
  const emergencyPhone = clean(input.emergencyPhone);
  if (emergencyName && emergencyPhone) {
    await admin.from("emergency_contacts").insert({
      employee_id: userId,
      full_name: emergencyName,
      relationship: emptyToNull(input.emergencyRelationship) ?? "Emergency",
      phone: emergencyPhone,
      is_primary: true,
    });
  }

  revalidatePath("/admin/employees");
  revalidatePath("/admin/organogram");
  revalidatePath("/admin/payroll");
  return { success: true, employeeId: userId };
}

export async function getOrgOptionsForHire(): Promise<{
  businessUnits: Array<{ id: string; name: string }>;
  departments: Array<{
    id: string;
    name: string;
    business_unit_id: string;
  }>;
  managers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    job_title: string | null;
  }>;
}> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer.role)) {
    return { businessUnits: [], departments: [], managers: [] };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [units, departments, managers] = await Promise.all([
    supabase
      .from("business_units")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("departments")
      .select("id, name, business_unit_id")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, preferred_name, job_title")
      .eq("status", "active")
      .order("first_name"),
  ]);

  return {
    businessUnits: units.data ?? [],
    departments: departments.data ?? [],
    managers: managers.data ?? [],
  };
}
