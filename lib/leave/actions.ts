"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  notifyEmployeeOfLeaveDecision,
  notifyEmployeeOfLeaveSubmission,
  notifyManagerOfLeaveRequest,
} from "@/lib/email/leave";
import {
  LEAVE_TYPES,
  type LeaveEntryKind,
  type LeaveTypeId,
} from "@/lib/leave/types";
import {
  countWorkingDays,
  formatLeaveDateKey,
} from "@/lib/leave/working-days";
import { displayName } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

export interface LeaveActionResult {
  error?: string;
  success?: boolean;
  days?: number;
  /** True when the requester has no manager and leave was approved on submit. */
  autoApproved?: boolean;
}

export interface SubmitLeaveInput {
  kind: LeaveEntryKind;
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  notes: string;
}

function dateRangeError(input: SubmitLeaveInput): string | null {
  const todayKey = formatLeaveDateKey(new Date());
  if (input.kind === "past") {
    return input.endDate < todayKey
      ? null
      : "Past leave must end before today.";
  }
  return input.startDate >= todayKey
    ? null
    : "Pick dates from today onwards, or log it as past leave.";
}

export async function submitLeaveRequest(
  input: SubmitLeaveInput,
): Promise<LeaveActionResult> {
  if (AUTH_BYPASS) {
    return { error: "Leave submission is disabled in preview mode." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "You need to be signed in to request leave." };
  }

  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return { error: "Select a valid date range." };
  }

  const rangeError = dateRangeError(input);
  if (rangeError) {
    return { error: rangeError };
  }

  const workingDays = countWorkingDays(start, end);
  if (workingDays <= 0) {
    return { error: "Selected range has no working days." };
  }

  const leaveType = LEAVE_TYPES.find((option) => option.id === input.type);
  if (!leaveType) {
    return { error: "Unknown leave type." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const notes = input.notes.trim();
  const pastLeave = input.kind === "past";
  // Past leave is always reviewed; without a manager it waits for org admins.
  const autoApproved = !pastLeave && !profile.manager_id;
  const nowIso = new Date().toISOString();

  const { error: insertError } = await supabase.from("leave_requests").insert({
    employee_id: profile.id,
    manager_id: profile.manager_id,
    type: input.type,
    start_date: input.startDate,
    end_date: input.endDate,
    working_days: workingDays,
    notes,
    submitted_at: nowIso,
    status: autoApproved ? "approved" : "pending",
    ...(autoApproved
      ? {
          manager_notes: "Recorded on calendar.",
          manager_response_at: nowIso,
        }
      : {}),
  });

  if (insertError) {
    return { error: insertError.message };
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    subject_id: profile.id,
    action: autoApproved ? "approved_leave" : "requested_leave",
    metadata: {
      type: input.type,
      start_date: input.startDate,
      end_date: input.endDate,
      working_days: workingDays,
      auto_approved: autoApproved,
      logged_past: pastLeave,
    },
  });

  const employeeName = displayName(profile);

  if (!autoApproved && profile.manager?.email) {
    await notifyManagerOfLeaveRequest({
      managerEmail: profile.manager.email,
      employeeName,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      workingDays,
      notes,
      pastLeave,
    });
  }

  if (profile.email) {
    await notifyEmployeeOfLeaveSubmission({
      employeeEmail: profile.email,
      employeeName,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      workingDays,
      notes,
      autoApproved,
      pastLeave,
    });
  }

  revalidatePath("/leave");
  revalidatePath("/approvals");
  return { success: true, days: workingDays, autoApproved };
}

export interface RespondLeaveInput {
  requestId: string;
  approved: boolean;
  managerNotes?: string;
}

export async function respondToLeaveRequest(
  input: RespondLeaveInput,
): Promise<LeaveActionResult> {
  if (AUTH_BYPASS) {
    return { error: "Leave approvals are disabled in preview mode." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "You need to be signed in to respond to leave requests." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const managerNotes = input.managerNotes?.trim() || null;

  const { data, error } = await supabase
    .from("leave_requests")
    .update({
      status: input.approved ? "approved" : "rejected",
      manager_notes: managerNotes,
      manager_response_at: new Date().toISOString(),
    })
    .eq("id", input.requestId)
    .select(
      `
      id,
      employee_id,
      type,
      start_date,
      end_date,
      working_days,
      employee:profiles!leave_requests_employee_id_fkey (
        email,
        first_name,
        last_name,
        preferred_name
      )
    `,
    )
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Not authorised to respond to this request." };
  }

  const employeeRelation = data.employee;
  const employee = Array.isArray(employeeRelation)
    ? employeeRelation[0]
    : employeeRelation;

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    subject_id: data.employee_id,
    action: input.approved ? "approved_leave" : "rejected_leave",
    metadata: {
      request_id: data.id,
      type: data.type,
      start_date: data.start_date,
      end_date: data.end_date,
      working_days: Number(data.working_days),
      manager_notes: managerNotes,
    },
  });

  if (employee?.email) {
    await notifyEmployeeOfLeaveDecision({
      employeeEmail: employee.email,
      employeeName: displayName(employee),
      type: data.type as LeaveTypeId,
      startDate: data.start_date,
      endDate: data.end_date,
      workingDays: Number(data.working_days),
      approved: input.approved,
      managerNotes,
    });
  }

  revalidatePath("/approvals");
  revalidatePath("/leave");
  return { success: true };
}
