import { LEAVE_TYPES } from "@/lib/leave/types";

export const DASHBOARD_COLORS = {
  leave: "#2EC4B6",
  payroll: "#FF7A59",
  docs: "#55A8FD",
  people: "#F6B93B",
  devices: "#8B7CF8",
  blue: "#0070F3",
} as const;

export interface DashboardKpi {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  icon: "leave" | "people" | "docs" | "payroll" | "devices" | "approvals";
  accent: string;
  progress?: number;
}

export interface DashboardLeaveItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  gender: string | null;
  typeLabel: string;
  status: "pending" | "approved";
  startDate: string;
  endDate: string;
  workingDays: number;
  isSelf: boolean;
}

export interface DashboardTeamMember {
  id: string;
  name: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  gender: string | null;
  remaining: number;
  entitlement: number;
}

export interface DashboardBirthday {
  id: string;
  name: string;
  avatarUrl: string | null;
  gender: string | null;
  dateLabel: string;
}

export interface DashboardHoliday {
  name: string;
  dateLabel: string;
}

export interface DashboardAnnouncement {
  id: string;
  title: string;
  body: string;
  publishedAtLabel: string;
}

export function leaveTypeLabel(type: string): string {
  return LEAVE_TYPES.find((option) => option.id === type)?.label ?? type;
}
