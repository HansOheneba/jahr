import {
  eachDayOfInterval,
  format,
  getDay,
  isBefore,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfDay,
} from "date-fns";
import { getHolidayMap, isPublicHoliday } from "@/lib/leave/ghana-holidays";

/** Standard JA Group workday: 09:00–17:00. */
export const WORKDAY_HOURS = 8;

export function workingHoursFromDays(workingDays: number): number {
  return Number((workingDays * WORKDAY_HOURS).toFixed(1));
}

export function isWeekend(date: Date): boolean {
  const day = getDay(date);
  return day === 0 || day === 6;
}

export function buildHolidayMapForRange(start: Date, end: Date): Map<string, string> {
  const years = new Set([start.getFullYear(), end.getFullYear()]);
  return getHolidayMap([...years]);
}

export function countWorkingDays(start: Date, end: Date): number {
  const from = startOfDay(start);
  const to = startOfDay(end);
  if (isBefore(to, from)) {
    return 0;
  }

  const holidays = buildHolidayMapForRange(from, to);
  const days = eachDayOfInterval({ start: from, end: to });

  return days.filter(
    (day) => !isWeekend(day) && !isPublicHoliday(day, holidays),
  ).length;
}

export function formatLeaveDate(date: Date): string {
  return format(date, "EEE d MMM yyyy");
}

/** Compact human-readable range, e.g. "Mon 4 – Fri 8 May 2026". */
export function formatLeaveDateRange(start: Date, end: Date): string {
  const from = startOfDay(start);
  const to = startOfDay(end);

  if (isSameDay(from, to)) {
    return formatLeaveDate(from);
  }

  if (isSameMonth(from, to)) {
    return `${format(from, "EEE d")} – ${format(to, "EEE d MMM yyyy")}`;
  }

  if (isSameYear(from, to)) {
    return `${format(from, "EEE d MMM")} – ${format(to, "EEE d MMM yyyy")}`;
  }

  return `${formatLeaveDate(from)} – ${formatLeaveDate(to)}`;
}

export function formatLeaveDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function leaveReference(id: string): string {
  return `#LV${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return isSameDay(startOfDay(a), startOfDay(b));
}
