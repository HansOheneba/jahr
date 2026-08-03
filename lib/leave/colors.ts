import type { LeaveTypeId } from "@/lib/leave/types";

/** Soft schedule colours inspired by HR calendar UIs. */
export interface LeaveTypeColor {
  label: string;
  /** Soft pill / row background */
  soft: string;
  /** Label / accent text */
  text: string;
  /** Calendar dash under the date */
  dash: string;
  /** Left rail on day groups */
  rail: string;
}

export const LEAVE_TYPE_COLORS: Record<LeaveTypeId, LeaveTypeColor> = {
  annual: {
    label: "Annual leave",
    soft: "#E7F6EC",
    text: "#1B7A3D",
    dash: "#3CB371",
    rail: "#3CB371",
  },
  sick: {
    label: "Sick leave",
    soft: "#E8F1FB",
    text: "#1D4E89",
    dash: "#5B9BD5",
    rail: "#5B9BD5",
  },
  casual: {
    label: "Casual leave",
    soft: "#FFF1E0",
    text: "#B45309",
    dash: "#F0A35E",
    rail: "#F0A35E",
  },
  unpaid: {
    label: "Unpaid leave",
    soft: "#FDECE7",
    text: "#C2410C",
    dash: "#F08A65",
    rail: "#F08A65",
  },
  maternity: {
    label: "Maternity leave",
    soft: "#FCE8F0",
    text: "#BE185D",
    dash: "#F472B6",
    rail: "#F472B6",
  },
  paternity: {
    label: "Paternity leave",
    soft: "#EEE9FB",
    text: "#5B21B6",
    dash: "#A78BFA",
    rail: "#A78BFA",
  },
};

export const HOLIDAY_COLOR = {
  label: "Public holiday",
  soft: "#FFF4E5",
  text: "#C2410C",
  dash: "#FB923C",
  rail: "#FB923C",
} as const;
