import { parseISO } from "date-fns";
import {
  BrandedEmail,
  EmailDetails,
  EmailIntro,
  EmailNote,
} from "./shared";
import { EMAIL_BRAND, getPortalUrl } from "../lib/email/config";
import { LEAVE_TYPES, type LeaveTypeId } from "../lib/leave/types";
import {
  formatLeaveDate,
  workingHoursFromDays,
} from "../lib/leave/working-days";

function leaveTypeLabel(type: LeaveTypeId): string {
  return LEAVE_TYPES.find((option) => option.id === type)?.label ?? type;
}

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

function leaveDetailRows(input: {
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  notes?: string;
  employeeName?: string;
  statusLabel?: string;
}) {
  const rows = [
    ...(input.employeeName
      ? [{ label: "Employee", value: input.employeeName }]
      : []),
    { label: "Type", value: leaveTypeLabel(input.type) },
    {
      label: "Dates",
      value: formatRange(input.startDate, input.endDate),
    },
    { label: "Duration", value: dayCountLabel(input.workingDays) },
  ];

  if (input.statusLabel) {
    rows.push({ label: "Status", value: input.statusLabel });
  }

  if (input.notes?.trim()) {
    rows.push({ label: "Notes", value: input.notes.trim() });
  }

  return rows;
}

export interface LeaveManagerRequestEmailProps {
  employeeName: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  notes: string;
}

/** Sent to a manager when a direct report submits leave. */
export function LeaveManagerRequestEmail({
  employeeName,
  type,
  startDate,
  endDate,
  workingDays,
  notes,
}: LeaveManagerRequestEmailProps) {
  const typeLabel = leaveTypeLabel(type);

  return (
    <BrandedEmail
      preview={`${employeeName} requested ${typeLabel}`}
      eyebrow="Leave to review"
      heading="New leave request"
      ctaLabel="Review in approvals"
      ctaHref={getPortalUrl("/approvals")}
    >
      <EmailIntro>
        {employeeName} submitted a {typeLabel.toLowerCase()} request in{" "}
        {EMAIL_BRAND.productName}. Please review and respond when you can.
      </EmailIntro>
      <EmailDetails
        rows={leaveDetailRows({
          employeeName,
          type,
          startDate,
          endDate,
          workingDays,
          notes,
          statusLabel: "Pending your approval",
        })}
      />
      <EmailNote>
        Approving or declining this request will email {employeeName}{" "}
        automatically.
      </EmailNote>
    </BrandedEmail>
  );
}

export interface LeaveEmployeeSubmissionEmailProps {
  employeeName: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  notes?: string;
  /** True when the employee has no manager: leave is noted, not "approved". */
  autoApproved: boolean;
}

/** Confirmation to the employee after they submit leave. */
export function LeaveEmployeeSubmissionEmail({
  employeeName,
  type,
  startDate,
  endDate,
  workingDays,
  notes,
  autoApproved,
}: LeaveEmployeeSubmissionEmailProps) {
  const typeLabel = leaveTypeLabel(type);

  if (autoApproved) {
    return (
      <BrandedEmail
        preview={`Your ${typeLabel.toLowerCase()} has been noted`}
        eyebrow="Leave calendar"
        heading="Your leave has been noted"
        ctaLabel="View my leave"
        ctaHref={getPortalUrl("/leave")}
      >
        <EmailIntro>
          Hi {employeeName}, your {typeLabel.toLowerCase()} has been recorded on
          the JA Group leave calendar. Because you don&apos;t report to a
          manager, no approval step was needed. This is a notification, not a
          request awaiting sign-off.
        </EmailIntro>
        <EmailDetails
          rows={leaveDetailRows({
            type,
            startDate,
            endDate,
            workingDays,
            notes,
            statusLabel: "Noted on calendar",
          })}
        />
        <EmailNote>
          Your team can see these dates on the shared leave schedule in{" "}
          {EMAIL_BRAND.productName}.
        </EmailNote>
      </BrandedEmail>
    );
  }

  return (
    <BrandedEmail
      preview={`Your ${typeLabel.toLowerCase()} request was submitted`}
      eyebrow="Leave request"
      heading="Request submitted"
      ctaLabel="View my leave"
      ctaHref={getPortalUrl("/leave")}
    >
      <EmailIntro>
        Hi {employeeName}, your {typeLabel.toLowerCase()} request is in. Your
        manager has been notified and will review it shortly. You&apos;ll get
        another email when it&apos;s decided.
      </EmailIntro>
      <EmailDetails
        rows={leaveDetailRows({
          type,
          startDate,
          endDate,
          workingDays,
          notes,
          statusLabel: "Pending manager approval",
        })}
      />
    </BrandedEmail>
  );
}

export interface LeaveEmployeeDecisionEmailProps {
  employeeName: string;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  workingDays: number;
  approved: boolean;
  managerNotes: string | null;
}

/** Sent when a manager approves or declines a leave request. */
export function LeaveEmployeeDecisionEmail({
  employeeName,
  type,
  startDate,
  endDate,
  workingDays,
  approved,
  managerNotes,
}: LeaveEmployeeDecisionEmailProps) {
  const typeLabel = leaveTypeLabel(type);
  const statusWord = approved ? "approved" : "declined";

  return (
    <BrandedEmail
      preview={`Your ${typeLabel.toLowerCase()} was ${statusWord}`}
      eyebrow="Leave decision"
      heading={approved ? "Leave approved" : "Leave declined"}
      ctaLabel="View my leave"
      ctaHref={getPortalUrl("/leave")}
    >
      <EmailIntro>
        Hi {employeeName}, your {typeLabel.toLowerCase()} request (
        {formatRange(startDate, endDate)}) has been {statusWord}.
      </EmailIntro>
      <EmailDetails
        rows={leaveDetailRows({
          type,
          startDate,
          endDate,
          workingDays,
          notes: managerNotes ?? undefined,
          statusLabel: approved ? "Approved" : "Declined",
        })}
      />
      {approved ? (
        <EmailNote>
          The dates are on the shared leave calendar. Have a good break.
        </EmailNote>
      ) : (
        <EmailNote>
          If you need to discuss this decision, speak with your manager or HR.
        </EmailNote>
      )}
    </BrandedEmail>
  );
}

export default function LeaveEmailsPreview() {
  return (
    <LeaveEmployeeSubmissionEmail
      employeeName="Jude"
      type="annual"
      startDate="2026-08-17"
      endDate="2026-08-21"
      workingDays={5}
      notes="Travelling for a conference"
      autoApproved
    />
  );
}
