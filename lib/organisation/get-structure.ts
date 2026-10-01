import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import type {
  OrganisationStructure,
  OrganisationUnitView,
} from "@/lib/organisation/types";
import { createClient } from "@/utils/supabase/server";

const PREVIEW_UNITS: OrganisationUnitView[] = [
  {
    id: "bu-group",
    name: "JA Group",
    description: "Group-level roles not assigned to a specific wing",
    isActive: true,
    employeeCount: null,
    departments: [
      {
        id: "dep-group-employee",
        name: "Group Employee",
        isActive: true,
        employeeCount: null,
      },
    ],
  },
  {
    id: "bu-wealth",
    name: "JA Wealth",
    description: "Wealth planning and financial services",
    isActive: true,
    employeeCount: null,
    departments: [
      {
        id: "dep-advisory",
        name: "Advisory",
        isActive: true,
        employeeCount: null,
      },
    ],
  },
  {
    id: "bu-digital",
    name: "JA Digital",
    description: "Technology and digital finance investments",
    isActive: true,
    employeeCount: null,
    departments: [
      {
        id: "dep-eng",
        name: "Engineering",
        isActive: true,
        employeeCount: null,
      },
      {
        id: "dep-product",
        name: "Product",
        isActive: true,
        employeeCount: null,
      },
    ],
  },
  {
    id: "bu-realty",
    name: "JA Realty",
    description: "Real estate acquisition, development, and renovation",
    isActive: true,
    employeeCount: null,
    departments: [],
  },
  {
    id: "bu-elements",
    name: "JA Elements",
    description: "Natural resources and energy investments",
    isActive: true,
    employeeCount: null,
    departments: [],
  },
];

interface AssignmentRow {
  business_unit_id: string | null;
  department_id: string | null;
}

async function loadActiveAssignments(): Promise<AssignmentRow[] | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const pageSize = 1000;
  const rows: AssignmentRow[] = [];

  for (let page = 0; page < 20; page += 1) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from("profiles")
      .select("business_unit_id, department_id")
      .eq("status", "active")
      .range(from, from + pageSize - 1);

    if (error) return null;

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }

  return rows;
}

export async function getOrganisationStructure(): Promise<OrganisationStructure> {
  if (AUTH_BYPASS) {
    const departmentCount = PREVIEW_UNITS.reduce(
      (total, unit) => total + unit.departments.length,
      0,
    );
    return {
      units: PREVIEW_UNITS,
      departmentCount,
      employeeCount: null,
    };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: units, error: unitsError }, { data: departments, error: departmentsError }, assignments] =
    await Promise.all([
      supabase.from("business_units").select("*").order("name", { ascending: true }),
      supabase.from("departments").select("*").order("name", { ascending: true }),
      loadActiveAssignments(),
    ]);

  if (unitsError) throw new Error(unitsError.message);
  if (departmentsError) throw new Error(departmentsError.message);

  const unitCounts = new Map<string, number>();
  const departmentCounts = new Map<string, number>();

  if (assignments) {
    for (const row of assignments) {
      if (row.business_unit_id) {
        unitCounts.set(
          row.business_unit_id,
          (unitCounts.get(row.business_unit_id) ?? 0) + 1,
        );
      }
      if (row.department_id) {
        departmentCounts.set(
          row.department_id,
          (departmentCounts.get(row.department_id) ?? 0) + 1,
        );
      }
    }
  }

  const departmentsByUnit = new Map<string, OrganisationUnitView["departments"]>();
  for (const department of departments ?? []) {
    const list = departmentsByUnit.get(department.business_unit_id) ?? [];
    list.push({
      id: department.id,
      name: department.name,
      isActive: department.is_active,
      employeeCount: assignments
        ? (departmentCounts.get(department.id) ?? 0)
        : null,
    });
    departmentsByUnit.set(department.business_unit_id, list);
  }

  const structureUnits: OrganisationUnitView[] = (units ?? []).map((unit) => ({
    id: unit.id,
    name: unit.name,
    description: unit.description,
    isActive: unit.is_active,
    employeeCount: assignments ? (unitCounts.get(unit.id) ?? 0) : null,
    departments: departmentsByUnit.get(unit.id) ?? [],
  }));

  return {
    units: structureUnits,
    departmentCount: (departments ?? []).length,
    employeeCount: assignments ? assignments.length : null,
  };
}

export async function getOrganisationUnit(
  unitId: string,
): Promise<OrganisationUnitView | null> {
  const structure = await getOrganisationStructure();
  return structure.units.find((unit) => unit.id === unitId) ?? null;
}
