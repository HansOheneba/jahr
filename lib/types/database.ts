export type AppRole =
  | "employee"
  | "manager"
  | "business_unit_md"
  | "ceo"
  | "coo"
  | "hr_admin";

export type EmploymentStatus =
  | "active"
  | "inactive"
  | "onboarding"
  | "terminated";

export interface BusinessUnit {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  business_unit_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  department_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  job_title: string | null;
  role: AppRole;
  status: EmploymentStatus;
  business_unit_id: string | null;
  department_id: string | null;
  team_id: string | null;
  manager_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  start_date: string | null;
  annual_leave_entitlement: number;
  employee_number: string | null;
  personal_email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  employee_category: "employee" | "contractor" | "intern";
  work_type: "onsite" | "hybrid" | "remote";
  employment_type: "full_time" | "part_time";
  office_location: string | null;
  probation_end_date: string | null;
  termination_date: string | null;
  leaving_reason: string | null;
  nationality: string | null;
  national_id: string | null;
  ssnit_number: string | null;
  tin_number: string | null;
  address_line: string | null;
  city: string | null;
  country: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithOrg extends Profile {
  business_unit: Pick<BusinessUnit, "id" | "name" | "slug"> | null;
  department: Pick<Department, "id" | "name" | "slug"> | null;
  manager: Pick<
    Profile,
    "id" | "first_name" | "last_name" | "email" | "job_title"
  > | null;
  /** True when at least one active profile reports to this person. */
  isManager: boolean;
}

export const ADMIN_ROLES: AppRole[] = ["ceo", "coo", "hr_admin"];

export const ORG_LEADER_ROLES: AppRole[] = [
  "ceo",
  "coo",
  "hr_admin",
  "business_unit_md",
];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  employee: "Employee",
  manager: "Manager",
  business_unit_md: "Business unit MD",
  ceo: "CEO",
  coo: "COO",
  hr_admin: "HR admin",
};

export function displayName(profile: {
  preferred_name?: string | null;
  first_name: string;
  last_name: string;
}): string {
  const first = profile.preferred_name?.trim() || profile.first_name;
  return [first, profile.last_name].filter(Boolean).join(" ").trim();
}

export function isOrgAdmin(role: AppRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isOrgLeader(role: AppRole): boolean {
  return ORG_LEADER_ROLES.includes(role);
}

/** Can open the leave approvals queue (direct reports and/or manager role). */
export function canApproveLeave(
  role: AppRole,
  isManager: boolean,
): boolean {
  return isManager || role === "manager" || isOrgAdmin(role);
}

/** Can browse the people directory and organogram. */
export function canViewPeopleDirectory(
  role: AppRole,
  isManager: boolean,
): boolean {
  return (
    isManager ||
    role === "manager" ||
    isOrgLeader(role) ||
    isOrgAdmin(role)
  );
}

/** Non-admins may only open records for themselves or direct reports. */
export function canViewEmployeeDetails(
  viewer: { id: string; role: AppRole },
  target: { id: string; manager_id: string | null },
): boolean {
  if (viewer.id === target.id) return true;
  if (isOrgAdmin(viewer.role)) return true;
  return target.manager_id === viewer.id;
}
