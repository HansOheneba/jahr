import { sendEmail } from "@/lib/email/resend";
import { LEAVE_TYPES, type LeaveTypeId } from "@/lib/leave/types";

function leaveTypeLabel(type: LeaveTypeId): string {
  return LEAVE_TYPES.find((option) => option.id === type)?.label ?? type;
}

export async function notifyManagerOfLeaveRequest(input: {
  managerEmail: string;
  employeeName: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  notes: string;
}): Promise<void> {
  await sendEmail({
    to: input.managerEmail,
    subject: `Leave request – ${input.employeeName} (${leaveTypeLabel(input.type)})`,
    text: [
      `${input.employeeName} has submitted a leave request.`,
      "",
      `Type: ${leaveTypeLabel(input.type)}`,
      `From: ${input.startDate}  To: ${input.endDate}`,
      `Working days: ${input.workingDays}`,
      `Notes: ${input.notes || "None"}`,
      "",
      "Log in to JA Group TMS → Approve Leave to respond.",
    ].join("\n"),
  });
}

export async function notifyEmployeeOfLeaveSubmission(input: {
  employeeEmail: string;
  employeeName: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  autoApproved: boolean;
}): Promise<void> {
  const typeLabel = leaveTypeLabel(input.type);
  const range = `${input.startDate} to ${input.endDate}`;

  if (input.autoApproved) {
    await sendEmail({
      to: input.employeeEmail,
      subject: `Leave recorded – ${typeLabel}`,
      text: [
        `Hi ${input.employeeName},`,
        "",
        `Your ${typeLabel} leave (${range}, ${input.workingDays} working day${input.workingDays === 1 ? "" : "s"}) has been recorded and approved.`,
        "",
        "No manager approval was required because you do not report to anyone.",
      ].join("\n"),
    });
    return;
  }

  await sendEmail({
    to: input.employeeEmail,
    subject: `Leave request submitted – ${typeLabel}`,
    text: [
      `Hi ${input.employeeName},`,
      "",
      `Your ${typeLabel} leave request (${range}, ${input.workingDays} working day${input.workingDays === 1 ? "" : "s"}) has been submitted.`,
      "",
      "Your manager has been notified and will review it. You will get another email when it is approved or declined.",
    ].join("\n"),
  });
}

export async function notifyEmployeeOfLeaveDecision(input: {
  employeeEmail: string;
  employeeName: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  approved: boolean;
  managerNotes: string | null;
}): Promise<void> {
  const status = input.approved ? "approved" : "declined";

  await sendEmail({
    to: input.employeeEmail,
    subject: `Leave request ${status} – ${leaveTypeLabel(input.type)}`,
    text: [
      `Hi ${input.employeeName},`,
      "",
      `Your ${leaveTypeLabel(input.type)} leave request (${input.startDate} to ${input.endDate}) has been ${status}.`,
      input.managerNotes ? `\nNotes: ${input.managerNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}
