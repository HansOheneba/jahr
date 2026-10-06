import {
  LeaveEmployeeDecisionEmail,
  LeaveEmployeeSubmissionEmail,
  LeaveManagerRequestEmail,
} from "@/emails/leave";
import { EMAIL_BRAND, getPortalUrl } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/resend";
import { leaveTypeLabel, type LeaveTypeId } from "@/lib/leave/types";
import {
  formatLeaveDate,
  workingHoursFromDays,
} from "@/lib/leave/working-days";
import { parseISO } from "date-fns";

function formatRange(startDate: string, endDate: string): string {
  const from = parseISO(startDate);
  const to = parseISO(endDate);
  if (from.getTime() === to.getTime()) {
    return formatLeaveDate(from);
  }
  return `${formatLeaveDate(from)} to ${formatLeaveDate(to)}`;
}

function dayCountLabel(workingDays: number): string {
  const hours = workingHoursFromDays(workingDays);
  return `${workingDays} working day${workingDays === 1 ? "" : "s"} (${hours}h)`;
}

export async function notifyManagerOfLeaveRequest(input: {
  managerEmail: string;
  employeeName: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  notes: string;
  pastLeave: boolean;
}): Promise<void> {
  const typeLabel = leaveTypeLabel(input.type);

  await sendEmail({
    to: input.managerEmail,
    subject: `${input.pastLeave ? "Past leave" : "Leave"} to review - ${input.employeeName} (${typeLabel})`,
    text: [
      input.pastLeave
        ? `${input.employeeName} logged leave they already took.`
        : `${input.employeeName} submitted a leave request.`,
      "",
      `Type: ${typeLabel}`,
      `Dates: ${formatRange(input.startDate, input.endDate)}`,
      `Duration: ${dayCountLabel(input.workingDays)}`,
      `Notes: ${input.notes || "None"}`,
      "",
      `Review: ${getPortalUrl("/approvals")}`,
      "",
      EMAIL_BRAND.productName,
    ].join("\n"),
    react: LeaveManagerRequestEmail(input),
  });
}

export async function notifyEmployeeOfLeaveSubmission(input: {
  employeeEmail: string;
  employeeName: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  notes?: string;
  autoApproved: boolean;
  pastLeave: boolean;
}): Promise<void> {
  const typeLabel = leaveTypeLabel(input.type);
  const range = formatRange(input.startDate, input.endDate);
  const duration = dayCountLabel(input.workingDays);

  if (input.autoApproved) {
    await sendEmail({
      to: input.employeeEmail,
      subject: `Leave noted - ${typeLabel}`,
      text: [
        `Hi ${input.employeeName},`,
        "",
        `Your ${typeLabel.toLowerCase()} (${range}, ${duration}) has been noted on the JA Group leave calendar.`,
        "",
        "Because you don't report to a manager, no approval step was needed. This is a notification, not a request awaiting sign-off.",
        input.notes?.trim() ? `\nNotes: ${input.notes.trim()}` : "",
        "",
        `View leave: ${getPortalUrl("/leave")}`,
        "",
        EMAIL_BRAND.productName,
      ]
        .filter(Boolean)
        .join("\n"),
      react: LeaveEmployeeSubmissionEmail({
        employeeName: input.employeeName,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        workingDays: input.workingDays,
        notes: input.notes,
        autoApproved: true,
      }),
    });
    return;
  }

  await sendEmail({
    to: input.employeeEmail,
    subject: input.pastLeave
      ? `Past leave logged - ${typeLabel}`
      : `Leave request submitted - ${typeLabel}`,
    text: [
      `Hi ${input.employeeName},`,
      "",
      input.pastLeave
        ? `Your past ${typeLabel.toLowerCase()} (${range}, ${duration}) is logged and under review.`
        : `Your ${typeLabel.toLowerCase()} request (${range}, ${duration}) has been submitted.`,
      "",
      input.pastLeave
        ? "You'll get another email when it's confirmed."
        : "Your manager has been notified and will review it. You'll get another email when it's decided.",
      input.notes?.trim() ? `\nNotes: ${input.notes.trim()}` : "",
      "",
      `View leave: ${getPortalUrl("/leave")}`,
      "",
      EMAIL_BRAND.productName,
    ]
      .filter(Boolean)
      .join("\n"),
    react: LeaveEmployeeSubmissionEmail({
      employeeName: input.employeeName,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      workingDays: input.workingDays,
      notes: input.notes,
      autoApproved: false,
      pastLeave: input.pastLeave,
    }),
  });
}

export async function notifyEmployeeOfLeaveDecision(input: {
  employeeEmail: string;
  employeeName: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  approved: boolean;
  managerNotes: string | null;
}): Promise<boolean> {
  const typeLabel = leaveTypeLabel(input.type);
  const status = input.approved ? "approved" : "declined";
  const range = formatRange(input.startDate, input.endDate);

  return sendEmail({
    to: input.employeeEmail,
    subject: `Leave ${status} - ${typeLabel}`,
    text: [
      `Hi ${input.employeeName},`,
      "",
      `Your ${typeLabel.toLowerCase()} request (${range}) has been ${status}.`,
      input.managerNotes ? `\nNotes: ${input.managerNotes}` : "",
      "",
      `View leave: ${getPortalUrl("/leave")}`,
      "",
      EMAIL_BRAND.productName,
    ]
      .filter(Boolean)
      .join("\n"),
    react: LeaveEmployeeDecisionEmail(input),
  });
}
