export interface WorkforceBreakdownItem {
  key: string;
  label: string;
  count: number;
}

export interface WorkforceInsights {
  totalEmployees: number;
  activeEmployees: number;
  newHiresThisMonth: number;
  newHiresThisYear: number;
  leaversThisYear: number;
  alumniAllTime: number;
  /** Percent; null when active headcount is 0. */
  turnoverRate: number | null;
  /** Years; null when no active employee has a start date. */
  averageTenureYears: number | null;
  /** Whole years; null when no active employee has a date of birth. */
  averageAgeYears: number | null;
  /** Active employees with a DOB used for the average. */
  averageAgeSampleSize: number;
  managerCount: number;
  /** Non-managers among active. */
  nonManagerCount: number;
  /** Employees per manager (non-managers / managers); null if no managers. */
  employeesPerManager: number | null;
  byDepartment: WorkforceBreakdownItem[];
  byLocation: WorkforceBreakdownItem[];
  byEmploymentType: WorkforceBreakdownItem[];
  byCategory: WorkforceBreakdownItem[];
  byGender: {
    male: number;
    female: number;
    other: number;
    malePct: number;
    femalePct: number;
  };
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatAverageAge(years: number | null): string {
  if (years === null) return "-";
  return String(Math.round(years));
}

export function formatAverageTenure(years: number | null): string {
  if (years === null) return "-";
  if (years < 1) {
    const months = Math.round(years * 12);
    return months <= 0 ? "<1 mo" : `${months} mo`;
  }
  return `${roundOne(years)} yr`;
}

export function formatTurnoverRate(rate: number | null): string {
  if (rate === null) return "-";
  return `${roundOne(rate)}%`;
}

export function formatManagerRatio(
  employeesPerManager: number | null,
): string {
  if (employeesPerManager === null) return "-";
  return `1 : ${roundOne(employeesPerManager)}`;
}
