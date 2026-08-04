import { cookies } from "next/headers";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { AUTH_BYPASS } from "@/lib/auth/config";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { summarizeLeaveBalance } from "@/lib/leave/balance";
import { getLeaveSchedule } from "@/lib/leave/get-schedule";
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
  },
];

export default async function LeavePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return null;
  }

  const canViewTeam = canApproveLeave(profile);
  const admin = isOrgAdmin(profile);

  let requests: LeaveRequestDraft[];

  if (AUTH_BYPASS) {
    requests = PREVIEW_REQUESTS;
  } else {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data } = await supabase
      .from("leave_requests")
      .select(
        "id, type, start_date, end_date, working_days, status, notes, submitted_at",
      )
      .eq("employee_id", profile.id)
      .order("submitted_at", { ascending: false });

    requests = (data ?? []).map((row) => ({
      id: row.id,
      type: row.type as LeaveTypeId,
      startDate: row.start_date,
      endDate: row.end_date,
      workingDays: Number(row.working_days),
      notes: row.notes,
      status: row.status as LeaveStatus,
      submittedAt: row.submitted_at,
    }));
  }

  const schedule = await getLeaveSchedule({
    viewerId: profile.id,
    isOrgAdmin: admin,
    isManager: profile.isManager || profile.tags.includes("manager"),
  });

  const balance = summarizeLeaveBalance(
    requests,
    profile.annual_leave_entitlement,
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Leave</h1>
        <p className="text-sm text-muted-foreground">
          Pick days on the calendar, review the working-day count, then send to
          your manager for approval.
        </p>
      </div>

      <LeaveRequestForm
        balance={balance}
        initialRequests={requests}
        schedule={schedule}
        canViewTeam={canViewTeam}
        viewerId={profile.id}
      />
    </div>
  );
}
