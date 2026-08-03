import {
  format,
  lastDayOfMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";

export interface PayPeriod {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
}

/** Calendar month period in local date strings (YYYY-MM-DD). */
export function periodForMonth(year: number, monthIndex: number): PayPeriod {
  const anchor = new Date(year, monthIndex, 1);
  const start = startOfMonth(anchor);
  const end = lastDayOfMonth(anchor);
  return {
    periodLabel: format(start, "MMMM yyyy"),
    periodStart: format(start, "yyyy-MM-dd"),
    periodEnd: format(end, "yyyy-MM-dd"),
  };
}

/** Trailing N calendar months ending with the current month (newest first). */
export function recentPayPeriods(count = 12, from = new Date()): PayPeriod[] {
  const periods: PayPeriod[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = subMonths(from, i);
    periods.push(periodForMonth(date.getFullYear(), date.getMonth()));
  }
  return periods;
}

/**
 * Recent pay periods that do not predate employment.
 * `earliestDate` is typically profiles.start_date (YYYY-MM-DD).
 */
export function availablePayPeriods(options: {
  count?: number;
  from?: Date;
  earliestDate?: string | null;
}): PayPeriod[] {
  const count = options.count ?? 12;
  const from = options.from ?? new Date();
  const periods = recentPayPeriods(count, from);

  if (!options.earliestDate) {
    return periods;
  }

  const earliest = startOfMonth(parseISO(options.earliestDate));
  if (Number.isNaN(earliest.getTime())) {
    return periods;
  }

  const earliestKey = format(earliest, "yyyy-MM-dd");
  return periods.filter((period) => period.periodStart >= earliestKey);
}

/** True when the period starts before the employee's start month. */
export function isPeriodBeforeEmployment(
  period: PayPeriod,
  startDate: string | null | undefined,
): boolean {
  if (!startDate) return false;
  const earliest = startOfMonth(parseISO(startDate));
  if (Number.isNaN(earliest.getTime())) return false;
  return period.periodStart < format(earliest, "yyyy-MM-dd");
}

export function parsePeriodKey(key: string): PayPeriod | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;
  return periodForMonth(year, month - 1);
}

export function periodKey(periodStart: string): string {
  return periodStart.slice(0, 7);
}
