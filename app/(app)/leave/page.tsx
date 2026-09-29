import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { AUTH_BYPASS } from "@/lib/auth/config";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { SIGN_OUT_PATH } from "@/lib/auth/routes";
import { summarizeLeaveBalance } from "@/lib/leave/balance";
import { getLeaveSchedule } from "@/lib/leave/get-schedule";
import { isLoggedPastLeave } from "@/lib/leave/working-days";
import type {
  LeaveRequestDraft,
  LeaveStatus,
  LeaveTypeId,
} from "@/lib/leave/types";
import {
  canApproveLeave,
  isOrgAdmin,
} from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

async function loadOwnLeaveRequests(
  employeeId: string,
): Promise<LeaveRequestDraft[]> {
  if (AUTH_BYPASS) {
    return PREVIEW_REQUESTS;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("leave_requests")
    .select(
      "id, type, start_date, end_date, working_days, status, notes, submitted_at",
    )
    .eq("employee_id", employeeId)
    .order("submitted_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type as LeaveTypeId,
    startDate: row.start_date,
    endDate: row.end_date,
    workingDays: Number(row.working_days),
    notes: row.notes,
    status: row.status as LeaveStatus,
    submittedAt: row.submitted_at,
    loggedPast: isLoggedPastLeave(row.end_date, row.submitted_at),
  }));
}

const PREVIEW_REQUESTS: LeaveRequestDraft[] = [
  {
    id: "preview-1",
    type: "annual",
    startDate: "2026-08-12",
    endDate: "2026-08-16",
    workingDays: 4,
    notes: "Family visit",
    status: "approved",
    submittedAt: "2026-07-20T10:00:00.000Z",
    loggedPast: false,
  },
  {
    id: "preview-2",
    type: "sick",
    startDate: "2026-08-03",
    endDate: "2026-08-03",
    workingDays: 1,
    notes: "",
    status: "pending",
    submittedAt: "2026-08-02T08:30:00.000Z",
    loggedPast: false,
  },
];

export default async function LeavePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(SIGN_OUT_PATH);
  }

  const canViewTeam = canApproveLeave(profile);
  const admin = isOrgAdmin(profile);

  const [requests, schedule] = await Promise.all([
    loadOwnLeaveRequests(profile.id),
    getLeaveSchedule({
      viewerId: profile.id,
      isOrgAdmin: admin,
      isManager: profile.isManager || profile.tags.includes("manager"),
    }),
  ]);

  const balance = summarizeLeaveBalance(requests);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Leave</h1>
        <p className="text-sm text-muted-foreground">
          {profile.manager_id
            ? "Pick dates, check the working-day count, and submit for approval."
            : "Pick dates and submit. Your leave goes on the calendar."}
        </p>
      </div>

      <LeaveRequestForm
        balance={balance}
        initialRequests={requests}
        schedule={schedule}
        canViewTeam={canViewTeam}
        viewerId={profile.id}
        requiresApproval={Boolean(profile.manager_id)}
      />
    </div>
  );
}
