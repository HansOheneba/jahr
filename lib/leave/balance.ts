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
