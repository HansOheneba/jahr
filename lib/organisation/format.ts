import type { OrganisationUnitView } from "@/lib/organisation/types";

export function countPhrase(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function joinMeta(parts: Array<string | null | false | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}

export function unitSummary(unit: OrganisationUnitView): string {
  return joinMeta([
    unit.isActive ? null : "Inactive",
    countPhrase(unit.departments.length, "department", "departments"),
    unit.employeeCount === null
      ? null
      : countPhrase(unit.employeeCount, "employee", "employees"),
  ]);
}
