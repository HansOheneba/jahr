import { cookies } from "next/headers";
import {
  differenceInYears,
  getMonth,
  getYear,
  parseISO,
  startOfYear,
} from "date-fns";
import type {
  WorkforceBreakdownItem,
  WorkforceInsights,
} from "@/lib/employees/workforce-insights";
import { normalizeGender } from "@/lib/employees/normalize-gender";
import type {
  EmployeeCategory,
  EmploymentType,
} from "@/lib/types/employee";
import type { EmploymentStatus } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

export type {
  WorkforceBreakdownItem,
  WorkforceInsights,
} from "@/lib/employees/workforce-insights";
export {
  formatAverageAge,
  formatAverageTenure,
  formatManagerRatio,
  formatTurnoverRate,
} from "@/lib/employees/workforce-insights";

interface InsightProfileRow {
  id: string;
  status: EmploymentStatus;
  start_date: string | null;
  termination_date: string | null;
  date_of_birth: string | null;
  employment_type: EmploymentType;
  employee_category: EmployeeCategory;
  office_location: string | null;
  department_id: string | null;
  manager_id: string | null;
  gender: string | null;
}

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
};

const CATEGORY_LABELS: Record<EmployeeCategory, string> = {
  employee: "Employee",
  contractor: "Contract",
  intern: "Intern",
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function toBreakdown(
  counts: Map<string, { label: string; count: number }>,
): WorkforceBreakdownItem[] {
  return [...counts.entries()]
    .map(([key, { label, count }]) => ({ key, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function bump(
  counts: Map<string, { label: string; count: number }>,
  key: string,
  label: string,
) {
  const existing = counts.get(key);
  if (existing) {
    existing.count += 1;
    return;
  }
  counts.set(key, { label, count: 1 });
}

export async function getWorkforceInsights(
  now: Date = new Date(),
): Promise<WorkforceInsights> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id, status, start_date, termination_date, date_of_birth,
      employment_type, employee_category, office_location,
      department_id, manager_id, gender
    `,
    );

  if (error || !data) {
    if (error) {
      console.error("[getWorkforceInsights]", error.message);
    }
    return emptyInsights();
  }

  const rows = data as InsightProfileRow[];
  const yearStart = startOfYear(now);
  const currentYear = getYear(now);
  const currentMonth = getMonth(now);

  const current = rows.filter((row) => row.status !== "terminated");
  const active = rows.filter((row) => row.status === "active");
  const alumni = rows.filter((row) => row.status === "terminated");

  const newHiresThisMonth = current.filter((row) => {
    if (!row.start_date) return false;
    const start = parseISO(row.start_date);
    return getYear(start) === currentYear && getMonth(start) === currentMonth;
  }).length;

  const newHiresThisYear = current.filter((row) => {
    if (!row.start_date) return false;
    return parseISO(row.start_date) >= yearStart;
  }).length;

  const leaversThisYear = alumni.filter((row) => {
    if (!row.termination_date) return false;
    return parseISO(row.termination_date) >= yearStart;
  }).length;

  const activeHeadcount = active.length;
  const turnoverRate =
    activeHeadcount === 0 ? null : (leaversThisYear / activeHeadcount) * 100;

  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  const tenureYears = active
    .filter((row) => row.start_date)
    .map((row) => {
      const start = parseISO(row.start_date as string);
      return Math.max(0, (now.getTime() - start.getTime()) / msPerYear);
    });

  const ages = active
    .filter((row) => row.date_of_birth)
    .map((row) => differenceInYears(now, parseISO(row.date_of_birth as string)))
    .filter((age) => age >= 0 && age < 120);

  const activeIds = new Set(active.map((row) => row.id));
  const managerIds = new Set(
    active
      .map((row) => row.manager_id)
      .filter((id): id is string => id !== null && activeIds.has(id)),
  );
  const managerCount = managerIds.size;
  const nonManagerCount = active.filter((row) => !managerIds.has(row.id)).length;
  const employeesPerManager =
    managerCount === 0 ? null : nonManagerCount / managerCount;

  const departmentIds = [
    ...new Set(
      current
        .map((row) => row.department_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const deptMap = new Map<string, string>();
  if (departmentIds.length > 0) {
    const { data: departments } = await supabase
      .from("departments")
      .select("id, name")
      .in("id", departmentIds);
    for (const dept of departments ?? []) {
      deptMap.set(dept.id, dept.name);
    }
  }

  const byDepartment = new Map<string, { label: string; count: number }>();
  const byLocation = new Map<string, { label: string; count: number }>();
  const byEmploymentType = new Map<string, { label: string; count: number }>();
  const byCategory = new Map<string, { label: string; count: number }>();

  for (const row of current) {
    if (row.department_id) {
      bump(
        byDepartment,
        row.department_id,
        deptMap.get(row.department_id) ?? "Unknown",
      );
    } else {
      bump(byDepartment, "unassigned", "Unassigned");
    }

    const location = row.office_location?.trim();
    if (location) {
      bump(byLocation, location.toLowerCase(), location);
    } else {
      bump(byLocation, "unassigned", "Unassigned");
    }

    bump(
      byEmploymentType,
      row.employment_type,
      EMPLOYMENT_TYPE_LABELS[row.employment_type] ?? row.employment_type,
    );

    bump(
      byCategory,
      row.employee_category,
      CATEGORY_LABELS[row.employee_category] ?? row.employee_category,
    );
  }

  let male = 0;
  let female = 0;
  let other = 0;
  for (const row of current) {
    const gender = normalizeGender(row.gender);
    if (gender === "male") male += 1;
    else if (gender === "female") female += 1;
    else other += 1;
  }
  const gendered = male + female;
  const malePct = gendered === 0 ? 0 : Math.round((male / gendered) * 100);
  const femalePct = gendered === 0 ? 0 : 100 - malePct;

  return {
    totalEmployees: current.length,
    activeEmployees: activeHeadcount,
    newHiresThisMonth,
    newHiresThisYear,
    leaversThisYear,
    alumniAllTime: alumni.length,
    turnoverRate,
    averageTenureYears: (() => {
      const avg = mean(tenureYears);
      return avg === null ? null : roundOne(avg);
    })(),
    averageAgeYears: (() => {
      const avg = mean(ages);
      return avg === null ? null : roundOne(avg);
    })(),
    averageAgeSampleSize: ages.length,
    managerCount,
    nonManagerCount,
    employeesPerManager:
      employeesPerManager === null ? null : roundOne(employeesPerManager),
    byDepartment: toBreakdown(byDepartment),
    byLocation: toBreakdown(byLocation),
    byEmploymentType: toBreakdown(byEmploymentType),
    byCategory: toBreakdown(byCategory),
    byGender: { male, female, other, malePct, femalePct },
  };
}

function emptyInsights(): WorkforceInsights {
  return {
    totalEmployees: 0,
    activeEmployees: 0,
    newHiresThisMonth: 0,
    newHiresThisYear: 0,
    leaversThisYear: 0,
    alumniAllTime: 0,
    turnoverRate: null,
    averageTenureYears: null,
    averageAgeYears: null,
    averageAgeSampleSize: 0,
    managerCount: 0,
    nonManagerCount: 0,
    employeesPerManager: null,
    byDepartment: [],
    byLocation: [],
    byEmploymentType: [],
    byCategory: [],
    byGender: { male: 0, female: 0, other: 0, malePct: 0, femalePct: 0 },
  };
}
