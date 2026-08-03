import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  isOrgAdmin,
  type AppRole,
  type EmploymentStatus,
} from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

export interface DirectoryEmployee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  job_title: string | null;
  role: AppRole;
  status: EmploymentStatus;
  employee_number: string | null;
  office_location: string | null;
  gender: string | null;
  avatar_url: string | null;
  leaving_reason: string | null;
  business_unit_id: string | null;
  department_id: string | null;
  manager_id: string | null;
  business_unit_name: string | null;
  department_name: string | null;
  manager_name: string | null;
}

export async function getDirectoryEmployees(options?: {
  /** When true, includes inactive, onboarding, and terminated people. */
  allStatuses?: boolean;
  /**
   * When true, non-admins include themselves plus direct reports (organogram).
   * Default is reports-only for managers.
   */
  includeSelf?: boolean;
}): Promise<DirectoryEmployee[]> {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return [];
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const admin = isOrgAdmin(viewer.role);

  let query = supabase
    .from("profiles")
    .select(
      `
      id, email, first_name, last_name, preferred_name, job_title,
      role, status, employee_number, office_location, gender, avatar_url,
      leaving_reason, business_unit_id, department_id, manager_id
    `,
    )
    .order("first_name", { ascending: true });

  if (!options?.allStatuses) {
    query = query.eq("status", "active");
  }

  if (!admin) {
    query = options?.includeSelf
      ? query.or(`id.eq.${viewer.id},manager_id.eq.${viewer.id}`)
      : query.eq("manager_id", viewer.id);
  }

  const { data, error } = await query;

  if (error || !data) {
    if (error) {
      console.error("[getDirectoryEmployees]", error.message);
    }
    return [];
  }

  const businessUnitIds = [
    ...new Set(data.map((row) => row.business_unit_id).filter(Boolean)),
  ] as string[];
  const departmentIds = [
    ...new Set(data.map((row) => row.department_id).filter(Boolean)),
  ] as string[];
  const managerIds = [
    ...new Set(data.map((row) => row.manager_id).filter(Boolean)),
  ] as string[];

  const [units, departments, managers] = await Promise.all([
    businessUnitIds.length
      ? supabase
          .from("business_units")
          .select("id, name")
          .in("id", businessUnitIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    departmentIds.length
      ? supabase
          .from("departments")
          .select("id, name")
          .in("id", departmentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    managerIds.length
      ? supabase
          .from("profiles")
          .select("id, first_name, last_name, preferred_name")
          .in("id", managerIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            first_name: string;
            last_name: string;
            preferred_name: string | null;
          }>,
        }),
  ]);

  const unitMap = new Map((units.data ?? []).map((row) => [row.id, row.name]));
  const deptMap = new Map(
    (departments.data ?? []).map((row) => [row.id, row.name]),
  );
  const managerMap = new Map(
    (managers.data ?? []).map((row) => [
      row.id,
      [row.preferred_name?.trim() || row.first_name, row.last_name]
        .filter(Boolean)
        .join(" "),
    ]),
  );

  return data.map((row) => ({
    ...row,
    role: row.role as AppRole,
    status: row.status as EmploymentStatus,
    gender: row.gender ?? null,
    avatar_url: row.avatar_url ?? null,
    leaving_reason: row.leaving_reason ?? null,
    business_unit_name: row.business_unit_id
      ? (unitMap.get(row.business_unit_id) ?? null)
      : null,
    department_name: row.department_id
      ? (deptMap.get(row.department_id) ?? null)
      : null,
    manager_name: row.manager_id
      ? (managerMap.get(row.manager_id) ?? null)
      : null,
  }));
}

export interface OrganogramNode {
  id: string;
  name: string;
  jobTitle: string | null;
  email: string;
  role: AppRole;
  gender: string | null;
  avatarUrl: string | null;
  departmentName: string | null;
  businessUnitName: string | null;
  children: OrganogramNode[];
}

export function buildOrganogram(
  employees: DirectoryEmployee[],
): OrganogramNode[] {
  const nodes = new Map<string, OrganogramNode>();

  for (const employee of employees) {
    nodes.set(employee.id, {
      id: employee.id,
      name: [
        employee.preferred_name?.trim() || employee.first_name,
        employee.last_name,
      ]
        .filter(Boolean)
        .join(" "),
      jobTitle: employee.job_title,
      email: employee.email,
      role: employee.role,
      gender: employee.gender,
      avatarUrl: employee.avatar_url,
      departmentName: employee.department_name,
      businessUnitName: employee.business_unit_name,
      children: [],
    });
  }

  const roots: OrganogramNode[] = [];

  for (const employee of employees) {
    const node = nodes.get(employee.id);
    if (!node) continue;

    if (employee.manager_id && nodes.has(employee.manager_id)) {
      nodes.get(employee.manager_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortTree = (list: OrganogramNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach((node) => sortTree(node.children));
  };
  sortTree(roots);

  return roots;
}
