import type { LeaveBalanceSummary, LeaveStatus, LeaveTypeId } from "@/lib/leave/types";

interface BalanceInput {
  type: LeaveTypeId;
  status: LeaveStatus;
  startDate: string;
  workingDays: number;
}

const ANNUAL_TYPE: LeaveTypeId = "annual";

/**
 * Annual leave balance for the calendar year containing `referenceDate`.
 * Only `annual` requests count against the entitlement - other leave types
 * are tracked but uncapped, matching the original HR portal's rules.
 */
export function summarizeLeaveBalance(
  requests: BalanceInput[],
  entitlement: number,
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

  return {
    entitlement,
    used,
    pending,
    remaining: Math.max(entitlement - used - pending, 0),
  };
}
