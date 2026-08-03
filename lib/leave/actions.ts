"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  notifyEmployeeOfLeaveDecision,
  notifyManagerOfLeaveRequest,
} from "@/lib/email/leave";
import { summarizeLeaveBalance } from "@/lib/leave/balance";
import { LEAVE_TYPES, type LeaveStatus, type LeaveTypeId } from "@/lib/leave/types";
import { countWorkingDays } from "@/lib/leave/working-days";
import { displayName } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

export interface LeaveActionResult {
  error?: string;
  success?: boolean;
  days?: number;
}

export interface SubmitLeaveInput {
  type: LeaveTypeId;
  startDate: string;
  endDate: string;
  notes: string;
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

  if (leaveType.deductsBalance) {
    const year = start.getFullYear();
    const { data: existing, error: existingError } = await supabase
      .from("leave_requests")
      .select("type, status, start_date, working_days")
      .eq("employee_id", profile.id)
      .in("status", ["pending", "approved"])
      .gte("start_date", `${year}-01-01`)
      .lte("start_date", `${year}-12-31`);

    if (existingError) {
      return { error: existingError.message };
    }

    const balance = summarizeLeaveBalance(
      (existing ?? []).map((row) => ({
        type: row.type as LeaveTypeId,
        status: row.status as LeaveStatus,
        startDate: row.start_date,
        workingDays: Number(row.working_days),
      })),
      profile.annual_leave_entitlement,
      start,
    );

    if (workingDays > balance.remaining) {
      return {
        error: `Only ${balance.remaining} annual leave day${balance.remaining === 1 ? "" : "s"} remaining - this request requires ${workingDays}.`,
      };
    }
  }

  const notes = input.notes.trim();

  const { error: insertError } = await supabase.from("leave_requests").insert({
    employee_id: profile.id,
    manager_id: profile.manager_id,
    type: input.type,
    start_date: input.startDate,
    end_date: input.endDate,
    working_days: workingDays,
    notes,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    subject_id: profile.id,
    action: "requested_leave",
    metadata: {
      type: input.type,
      start_date: input.startDate,
      end_date: input.endDate,
      working_days: workingDays,
    },
  });

  const managerEmail = profile.manager?.email;
  if (managerEmail) {
    await notifyManagerOfLeaveRequest({
      managerEmail,
      employeeName: displayName(profile),
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      workingDays,
      notes,
    });
  }

  revalidatePath("/leave");
  revalidatePath("/approvals");
  return { success: true, days: workingDays };
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
      approved: input.approved,
      managerNotes,
    });
  }

  revalidatePath("/approvals");
  revalidatePath("/leave");
  return { success: true };
}
