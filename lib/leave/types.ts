export type LeaveTypeId =
  | "annual"
  | "sick"
  | "maternity"
  | "paternity"
  | "casual"
  | "unpaid";

export interface LeaveTypeOption {
  id: LeaveTypeId;
  label: string;
  description: string;
  deductsBalance: boolean;
}

export const LEAVE_TYPES: LeaveTypeOption[] = [
  {
    id: "annual",
    label: "Annual leave",
    description: "Paid annual leave (default 25 days / year)",
    deductsBalance: true,
  },
  {
    id: "sick",
    label: "Sick leave",
    description: "Illness or medical appointment",
    deductsBalance: false,
  },
  {
    id: "maternity",
    label: "Maternity leave",
    description: "Ghana Labour Act maternity leave",
    deductsBalance: false,
  },
  {
    id: "paternity",
    label: "Paternity leave",
    description: "Short leave for new fathers",
    deductsBalance: false,
  },
  {
    id: "casual",
    label: "Casual leave",
    description: "Short personal leave",
    deductsBalance: false,
  },
  {
    id: "unpaid",
    label: "Unpaid leave",
    description: "Leave without pay",
    deductsBalance: false,
  },
];

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveBalanceSummary {
  entitlement: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface LeaveRequestDraft {
  id: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  notes: string;
  status: LeaveStatus;
  submittedAt: string;
}

/** A leave request row as stored/queried from `public.leave_requests`. */
export interface LeaveRequestRecord {
  id: string;
  employeeId: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  status: LeaveStatus;
  notes: string;
  managerNotes: string | null;
  submittedAt: string;
}

/** A pending request enriched with the requesting employee's details, for the approvals queue. */
export interface PendingApprovalRecord extends LeaveRequestRecord {
  employeeName: string;
  employeeJobTitle: string | null;
}

/** Approvals queue row with hours, balance context, and decision metadata. */
export interface ApprovalQueueRecord extends PendingApprovalRecord {
  reference: string;
  workingHours: number;
  managerResponseAt: string | null;
  annualRemaining: number | null;
  annualEntitlement: number | null;
  annualPending: number | null;
}

export interface TeamLeaveBalance {
  employeeId: string;
  name: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  gender: string | null;
  remaining: number;
  entitlement: number;
  used: number;
  pending: number;
}

export interface LeaveDecisionLog {
  id: string;
  reference: string;
  employeeName: string;
  type: LeaveTypeId;
  status: Exclude<LeaveStatus, "pending">;
  startDate: string;
  endDate: string;
  workingDays: number;
  workingHours: number;
  decidedAt: string;
  managerNotes: string | null;
}
