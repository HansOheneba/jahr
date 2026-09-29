import type { LeaveBalanceRow } from "@/lib/types/employee";
import type { LeaveBalanceSummary, LeaveStatus, LeaveTypeId } from "@/lib/leave/types";

interface BalanceInput {
  type: LeaveTypeId;
  status: LeaveStatus;
  startDate: string;
  workingDays: number;
}

const ANNUAL_TYPE: LeaveTypeId = "annual";

/**
 * Annual leave usage for the calendar year containing `referenceDate`.
 * Only `annual` requests are counted; other leave types are tracked separately.
 */
export function summarizeLeaveBalance(
  requests: BalanceInput[],
  referenceDate: Date = new Date(),
): LeaveBalanceSummary {
  const year = referenceDate.getFullYear();

  let used = 0;
  let pending = 0;

  for (const request of requests) {
    if (request.type !== ANNUAL_TYPE) continue;
    if (new Date(request.startDate).getFullYear() !== year) continue;

    if (request.status === "approved") {
      used += request.workingDays;
    } else if (request.status === "pending") {
      pending += request.workingDays;
    }
  }

  return { used, pending };
}

/**
 * Used and pending days per leave type for the calendar year.
 * Entitlement is the annual allowance on the profile; other types have none.
 */
export function summarizeLeaveByType(
  requests: BalanceInput[],
  annualEntitlement = 0,
  referenceDate: Date = new Date(),
): LeaveBalanceRow[] {
  const year = referenceDate.getFullYear();
  const totals = new Map<LeaveTypeId, { used: number; pending: number }>();

  for (const request of requests) {
    if (new Date(request.startDate).getFullYear() !== year) continue;

    const current = totals.get(request.type) ?? { used: 0, pending: 0 };
    if (request.status === "approved") {
      current.used += request.workingDays;
    } else if (request.status === "pending") {
      current.pending += request.workingDays;
    }
    totals.set(request.type, current);
  }

  return [...totals.entries()].map(([leaveType, total]) => ({
    leave_type: leaveType,
    year,
    entitlement: leaveType === ANNUAL_TYPE ? annualEntitlement : 0,
    used: total.used,
    pending: total.pending,
  }));
}
