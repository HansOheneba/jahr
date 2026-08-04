"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  canAssignTag,
  hasTag,
  isOrgAdmin,
  parseTagSlugs,
  PERMISSION_TAG_LABELS,
  PERMISSION_TAG_SLUGS,
  syncRoleFromTags,
  type PermissionTagSlug,
} from "@/lib/auth/permissions";
import {
  isImmigrationStatus,
  type ImmigrationStatus,
} from "@/lib/employees/immigration";
import { isOfficeLocation } from "@/lib/employees/office-locations";
import type {
  EmployeeCategory,
  EmploymentType,
  WorkType,
} from "@/lib/types/employee";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export interface EmployeeActionResult {
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
  immigrationStatus: string;
  workPermitNumber: string;
  workPermitExpiry: string;
  addressLine: string;
  city: string;
  country: string;
  jobTitle: string;
  employeeNumber: string;
  tags: PermissionTagSlug[];
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

export type UpdateEmployeeInput = Omit<CreateEmployeeInput, "email"> & {
  employeeId: string;
  status: "active" | "inactive" | "onboarding" | "terminated";
  terminationDate: string;
  leavingReason: string;
};

export interface OffboardEmployeeInput {
  employeeId: string;
  terminationDate: string;
  leavingReason: string;
}

const EDITABLE_STATUSES = [
  "active",
  "inactive",
  "onboarding",
  "terminated",
] as const;

function clean(value: string): string {
  return value.trim();
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOfficeLocation(value: string): string | null {
  const trimmed = clean(value);
  if (!trimmed) return null;
  if (!isOfficeLocation(trimmed)) {
    return "__invalid__";
  }
  return trimmed;
}

function parseImmigrationStatus(value: string): ImmigrationStatus | null {
  const trimmed = clean(value);
  if (!trimmed) return null;
  if (!isImmigrationStatus(trimmed)) {
    return null;
  }
  return trimmed;
}

function validateTagAssignment(
  viewer: { tags: readonly PermissionTagSlug[] },
  tags: PermissionTagSlug[],
  previous: readonly PermissionTagSlug[] = [],
): string | null {
  for (const slug of tags) {
    if (!(PERMISSION_TAG_SLUGS as readonly string[]).includes(slug)) {
      return `Unknown permission tag: ${slug}`;
    }
    if (!previous.includes(slug) && !canAssignTag(viewer, slug)) {
      return `You cannot assign the ${PERMISSION_TAG_LABELS[slug]} tag.`;
    }
  }
  for (const slug of previous) {
    if (!tags.includes(slug) && !canAssignTag(viewer, slug)) {
      return `You cannot remove the ${PERMISSION_TAG_LABELS[slug]} tag.`;
    }
  }
  return null;
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

async function replaceProfileTags(options: {
  client: ReturnType<typeof createAdminClient> | ReturnType<typeof createClient>;
  profileId: string;
  tags: PermissionTagSlug[];
  assignedBy: string;
}): Promise<string | null> {
  const { client, profileId, tags, assignedBy } = options;

  const { data: catalogue, error: catalogueError } = await client
    .from("permission_tags")
    .select("id, slug");

  if (catalogueError) {
    return catalogueError.message;
  }

  const idBySlug = new Map(
    (catalogue ?? []).map((row) => [row.slug as string, row.id as string]),
  );

  const { error: deleteError } = await client
    .from("profile_permission_tags")
    .delete()
    .eq("profile_id", profileId);

  if (deleteError) {
    return deleteError.message;
  }

  if (tags.length === 0) {
    return null;
  }

  const rows = tags.flatMap((slug) => {
    const tagId = idBySlug.get(slug);
    if (!tagId) return [];
    return [
      {
        profile_id: profileId,
        tag_id: tagId,
        assigned_by: assignedBy,
      },
    ];
  });

  if (rows.length === 0) {
    return "Could not resolve permission tags.";
  }

  const { error: insertError } = await client
    .from("profile_permission_tags")
    .insert(rows);

  return insertError?.message ?? null;
}

function revalidateEmployeePaths(employeeId: string) {
  revalidatePath("/admin/employees");
  revalidatePath("/admin/alumni");
  revalidatePath("/admin/organogram");
  revalidatePath("/admin/payroll");
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath(`/admin/employees/${employeeId}/edit`);
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<EmployeeActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer)) {
    return { error: "Only org admins can add employees." };
  }

  const firstName = clean(input.firstName);
  const lastName = clean(input.lastName);
  const email = clean(input.email).toLowerCase();
  const nationalId = emptyToNull(input.nationalId);
  const jobTitle = clean(input.jobTitle);
  const startDate = clean(input.startDate);
  const phone = clean(input.phone);
  const officeLocation = parseOfficeLocation(input.officeLocation);
  const immigrationStatus = parseImmigrationStatus(input.immigrationStatus);
  const tags = parseTagSlugs(input.tags);

  if (!firstName || !lastName) {
    return { error: "First name and last name are required." };
  }
  if (!email || !email.includes("@")) {
    return { error: "A valid work email is required." };
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
  if (officeLocation === "__invalid__") {
    return { error: "Select a valid office location." };
  }
  if (clean(input.immigrationStatus) && !immigrationStatus) {
    return { error: "Select a valid immigration status." };
  }

  const tagError = validateTagAssignment(viewer, tags);
  if (tagError) {
    return { error: tagError };
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
  const legacyRole = syncRoleFromTags(tags);

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
      immigration_status: immigrationStatus,
      work_permit_number: emptyToNull(input.workPermitNumber),
      work_permit_expiry: emptyToNull(input.workPermitExpiry),
      address_line: emptyToNull(input.addressLine),
      city: emptyToNull(input.city),
      country: emptyToNull(input.country) ?? "Ghana",
      job_title: jobTitle,
      employee_number: employeeNumber,
      role: legacyRole,
      status: "onboarding",
      employee_category: input.employeeCategory,
      work_type: input.workType,
      employment_type: input.employmentType,
      office_location: officeLocation,
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

  const tagsWriteError = await replaceProfileTags({
    client: admin,
    profileId: userId,
    tags,
    assignedBy: viewer.id,
  });
  if (tagsWriteError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: tagsWriteError };
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

  revalidateEmployeePaths(userId);
  return { success: true, employeeId: userId };
}

export async function updateEmployee(
  input: UpdateEmployeeInput,
): Promise<EmployeeActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer)) {
    return { error: "Only org admins can amend employees." };
  }

  const employeeId = clean(input.employeeId);
  if (!employeeId) {
    return { error: "Employee is required." };
  }

  const firstName = clean(input.firstName);
  const lastName = clean(input.lastName);
  const jobTitle = clean(input.jobTitle);
  const startDate = clean(input.startDate);
  const phone = clean(input.phone);
  const officeLocation = parseOfficeLocation(input.officeLocation);
  const immigrationStatus = parseImmigrationStatus(input.immigrationStatus);
  const tags = parseTagSlugs(input.tags);

  if (!firstName || !lastName) {
    return { error: "First name and last name are required." };
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
  if (officeLocation === "__invalid__") {
    return { error: "Select a valid office location." };
  }
  if (clean(input.immigrationStatus) && !immigrationStatus) {
    return { error: "Select a valid immigration status." };
  }
  if (!(EDITABLE_STATUSES as readonly string[]).includes(input.status)) {
    return { error: "Invalid employment status." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", employeeId)
    .maybeSingle();

  if (existingError || !existing) {
    return { error: existingError?.message ?? "Employee not found." };
  }

  const { data: existingTagRows } = await supabase
    .from("profile_permission_tags")
    .select("tag:permission_tags(slug)")
    .eq("profile_id", employeeId);

  const previousTags: PermissionTagSlug[] = [];
  for (const row of existingTagRows ?? []) {
    const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag;
    const slug =
      tag && typeof tag === "object" && "slug" in tag
        ? String((tag as { slug: string }).slug)
        : null;
    if (slug && (PERMISSION_TAG_SLUGS as readonly string[]).includes(slug)) {
      previousTags.push(slug as PermissionTagSlug);
    }
  }

  const tagError = validateTagAssignment(viewer, tags, previousTags);
  if (tagError) {
    return { error: tagError };
  }

  if (
    previousTags.includes("ceo") &&
    !tags.includes("ceo") &&
    !hasTag(viewer, "ceo") &&
    !hasTag(viewer, "super_admin")
  ) {
    return { error: "Only the CEO or a super admin can remove the CEO tag." };
  }

  const terminationDate =
    input.status === "terminated"
      ? emptyToNull(input.terminationDate) ??
        new Date().toISOString().slice(0, 10)
      : null;
  const leavingReason =
    input.status === "terminated"
      ? emptyToNull(input.leavingReason)
      : null;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      preferred_name: emptyToNull(input.preferredName),
      personal_email: emptyToNull(input.personalEmail),
      phone,
      date_of_birth: emptyToNull(input.dateOfBirth),
      gender: emptyToNull(input.gender),
      nationality: emptyToNull(input.nationality),
      national_id: emptyToNull(input.nationalId),
      ssnit_number: emptyToNull(input.ssnitNumber),
      tin_number: emptyToNull(input.tinNumber),
      immigration_status: immigrationStatus,
      work_permit_number: emptyToNull(input.workPermitNumber),
      work_permit_expiry: emptyToNull(input.workPermitExpiry),
      address_line: emptyToNull(input.addressLine),
      city: emptyToNull(input.city),
      country: emptyToNull(input.country) ?? "Ghana",
      job_title: jobTitle,
      employee_number: emptyToNull(input.employeeNumber),
      role: syncRoleFromTags(tags),
      status: input.status,
      employee_category: input.employeeCategory,
      work_type: input.workType,
      employment_type: input.employmentType,
      office_location: officeLocation,
      start_date: startDate,
      probation_end_date: emptyToNull(input.probationEndDate),
      annual_leave_entitlement: input.annualLeaveEntitlement || 25,
      business_unit_id: emptyToNull(input.businessUnitId),
      department_id: emptyToNull(input.departmentId),
      manager_id: emptyToNull(input.managerId),
      termination_date: terminationDate,
      leaving_reason: leavingReason,
    })
    .eq("id", employeeId);

  if (updateError) {
    return { error: updateError.message };
  }

  const tagsWriteError = await replaceProfileTags({
    client: supabase,
    profileId: employeeId,
    tags,
    assignedBy: viewer.id,
  });
  if (tagsWriteError) {
    return { error: tagsWriteError };
  }

  const emergencyName = clean(input.emergencyName);
  const emergencyPhone = clean(input.emergencyPhone);
  if (emergencyName && emergencyPhone) {
    const { data: primary } = await supabase
      .from("emergency_contacts")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("is_primary", true)
      .maybeSingle();

    if (primary) {
      await supabase
        .from("emergency_contacts")
        .update({
          full_name: emergencyName,
          relationship: emptyToNull(input.emergencyRelationship) ?? "Emergency",
          phone: emergencyPhone,
        })
        .eq("id", primary.id);
    } else {
      await supabase.from("emergency_contacts").insert({
        employee_id: employeeId,
        full_name: emergencyName,
        relationship: emptyToNull(input.emergencyRelationship) ?? "Emergency",
        phone: emergencyPhone,
        is_primary: true,
      });
    }
  }

  revalidateEmployeePaths(employeeId);
  return { success: true, employeeId };
}

export async function offboardEmployee(
  input: OffboardEmployeeInput,
): Promise<EmployeeActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer)) {
    return { error: "Only org admins can offboard employees." };
  }

  const employeeId = clean(input.employeeId);
  if (!employeeId) {
    return { error: "Employee is required." };
  }
  if (employeeId === viewer.id) {
    return { error: "You cannot offboard your own account." };
  }

  const terminationDate =
    emptyToNull(input.terminationDate) ??
    new Date().toISOString().slice(0, 10);
  const leavingReason = emptyToNull(input.leavingReason);
  if (!leavingReason) {
    return { error: "A reason for leaving is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("id", employeeId)
    .maybeSingle();

  if (existingError || !existing) {
    return { error: existingError?.message ?? "Employee not found." };
  }
  if (existing.status === "terminated") {
    return { error: "This person is already in Alumni." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      status: "terminated",
      termination_date: terminationDate,
      leaving_reason: leavingReason,
    })
    .eq("id", employeeId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidateEmployeePaths(employeeId);
  return { success: true, employeeId };
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
  if (!viewer || !isOrgAdmin(viewer)) {
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
