import { cookies } from "next/headers";
import { format, getMonth, parseISO } from "date-fns";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import {
  DASHBOARD_COLORS,
  leaveTypeLabel,
  type DashboardKpi,
  type DashboardLeaveItem,
  type DashboardTeamMember,
} from "@/components/dashboard/shared";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasTag } from "@/lib/auth/permissions";
import { getEmployeeRecord } from "@/lib/employees/get-employee-record";
import { summarizeLeaveBalance } from "@/lib/leave/balance";
import { getLeaveSchedule } from "@/lib/leave/get-schedule";
import type { LeaveStatus, LeaveTypeId } from "@/lib/leave/types";
import {
  canApproveLeave,
  displayName,
  isOrgAdmin,
} from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return null;
  }

  const record = await getEmployeeRecord(profile.id);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const hour = new Date().getHours();
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const year = new Date().getFullYear();
  const month = getMonth(new Date());
  const admin = isOrgAdmin(profile);
  const canApprove = canApproveLeave(profile);
  const firstName = displayName(profile).split(" ")[0] || "there";

  const annual = record?.leaveBalances.find((row) => row.leave_type === "annual");
  const leaveEntitlement =
    annual?.entitlement ?? profile.annual_leave_entitlement;
  const leaveUsed = annual?.used ?? 0;
  const leavePending = annual?.pending ?? 0;
  const leaveRemaining = annual
    ? Math.max(annual.entitlement - annual.used - annual.pending, 0)
    : leaveEntitlement;

  const schedule = await getLeaveSchedule({
    viewerId: profile.id,
    isOrgAdmin: admin,
    isManager: profile.isManager,
  });

  const upcomingLeave: DashboardLeaveItem[] = schedule
    .filter((entry) => entry.endDate >= todayKey)
    .slice(0, 6)
    .map((entry) => ({
      id: entry.id,
      name: entry.person.name,
      avatarUrl: entry.person.avatarUrl,
      gender: entry.person.gender,
      typeLabel: leaveTypeLabel(entry.type),
      status: entry.status === "approved" ? "approved" : "pending",
      startDate: entry.startDate,
      endDate: entry.endDate,
      workingDays: entry.workingDays,
      isSelf: entry.person.id === profile.id,
    }));

  const [{ data: holidays }, pendingApprovalsResult, teamProfilesResult] =
    await Promise.all([
      supabase
        .from("holidays")
        .select("name, holiday_date")
        .gte("holiday_date", todayKey)
        .order("holiday_date", { ascending: true })
        .limit(3),
      canApprove
        ? admin
          ? supabase
              .from("leave_requests")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending")
          : supabase
              .from("leave_requests")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending")
              .eq("manager_id", profile.id)
        : Promise.resolve({ count: 0 }),
      profile.isManager || admin
        ? admin
          ? supabase
              .from("profiles")
              .select(
                "id, first_name, last_name, preferred_name, job_title, avatar_url, gender, annual_leave_entitlement, date_of_birth, manager_id",
              )
              .eq("status", "active")
              .order("first_name", { ascending: true })
              .limit(12)
          : supabase
              .from("profiles")
              .select(
                "id, first_name, last_name, preferred_name, job_title, avatar_url, gender, annual_leave_entitlement, date_of_birth, manager_id",
              )
              .eq("manager_id", profile.id)
              .neq("status", "terminated")
              .order("first_name", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

  const teamProfiles = teamProfilesResult.data ?? [];
  const teamIds = teamProfiles.map((person) => person.id);
  let team: DashboardTeamMember[] = [];

  if (teamIds.length > 0 && (profile.isManager || admin)) {
    const { data: yearRequests } = await supabase
      .from("leave_requests")
      .select("employee_id, type, status, start_date, working_days")
      .in("employee_id", teamIds)
      .in("status", ["pending", "approved"])
      .gte("start_date", `${year}-01-01`)
      .lte("start_date", `${year}-12-31`);

    const byEmployee = new Map<
      string,
      Array<{
        type: LeaveTypeId;
        status: LeaveStatus;
        startDate: string;
        workingDays: number;
      }>
    >();

    for (const request of yearRequests ?? []) {
      const list = byEmployee.get(request.employee_id) ?? [];
      list.push({
        type: request.type as LeaveTypeId,
        status: request.status as LeaveStatus,
        startDate: request.start_date,
        workingDays: Number(request.working_days),
      });
      byEmployee.set(request.employee_id, list);
    }

    team = teamProfiles.slice(0, 6).map((person) => {
      const summary = summarizeLeaveBalance(
        byEmployee.get(person.id) ?? [],
        Number(person.annual_leave_entitlement ?? 25),
      );
      return {
        id: person.id,
        name: displayName(person),
        jobTitle: person.job_title,
        avatarUrl: person.avatar_url,
        gender: person.gender,
        remaining: summary.remaining,
        entitlement: summary.entitlement,
      };
    });
  }

  const birthdaySource =
    teamProfiles.length > 0
      ? teamProfiles
      : [
          {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            preferred_name: profile.preferred_name,
            avatar_url: profile.avatar_url,
            gender: profile.gender,
            date_of_birth: profile.date_of_birth,
          },
        ];

  const birthdays = birthdaySource
    .filter((person) => {
      if (!person.date_of_birth) return false;
      return getMonth(parseISO(person.date_of_birth)) === month;
    })
    .slice(0, 5)
    .map((person) => ({
      id: person.id,
      name: displayName(person),
      avatarUrl: person.avatar_url,
      gender: person.gender,
      dateLabel: format(parseISO(person.date_of_birth as string), "d MMMM"),
    }));

  let orgEmployees = 0;
  let orgDevices = 0;
  let orgDevicesAssigned = 0;

  if (admin) {
    const [
      { count: employees },
      { count: devices },
      { count: devicesAssigned },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase.from("devices").select("id", { count: "exact", head: true }),
      supabase
        .from("devices")
        .select("id", { count: "exact", head: true })
        .eq("status", "assigned"),
    ]);
    orgEmployees = employees ?? 0;
    orgDevices = devices ?? 0;
    orgDevicesAssigned = devicesAssigned ?? 0;
  }

  const pendingApprovals = pendingApprovalsResult.count ?? 0;
  const latestPayslip = record?.payslips[0] ?? null;
  const deviceCount = record?.assets.length ?? 0;

  const kpis: DashboardKpi[] = admin
    ? [
        {
          label: "Active employees",
          value: String(orgEmployees),
          hint: "Across JA Group",
          href: "/admin/employees",
          icon: "people",
          accent: DASHBOARD_COLORS.people,
        },
        {
          label: "Pending approvals",
          value: String(pendingApprovals),
          hint: pendingApprovals > 0 ? "Needs a decision" : "Queue is clear",
          href: "/approvals",
          icon: "approvals",
          accent: DASHBOARD_COLORS.people,
          progress:
            pendingApprovals === 0
              ? 100
              : Math.max(8, 100 - pendingApprovals * 12),
        },
        {
          label: "Your leave",
          value: `${leaveRemaining}`,
          hint: `${leaveEntitlement} day entitlement`,
          href: "/leave",
          icon: "leave",
          accent: DASHBOARD_COLORS.leave,
          progress:
            leaveEntitlement <= 0
              ? 0
              : Math.round((leaveRemaining / leaveEntitlement) * 100),
        },
        {
          label: "Devices",
          value: String(orgDevices),
          hint:
            orgDevicesAssigned > 0
              ? `${orgDevicesAssigned} assigned`
              : "Inventory",
          href: "/admin/devices",
          icon: "devices",
          accent: DASHBOARD_COLORS.devices,
        },
      ]
    : [
        {
          label: "Annual leave left",
          value: String(leaveRemaining),
          hint: `${leaveUsed} used · ${leavePending} pending`,
          href: "/leave",
          icon: "leave",
          accent: DASHBOARD_COLORS.leave,
          progress:
            leaveEntitlement <= 0
              ? 0
              : Math.round((leaveRemaining / leaveEntitlement) * 100),
        },
        {
          label: canApprove ? "Waiting on you" : "Pending requests",
          value: String(canApprove ? pendingApprovals : leavePending),
          hint: canApprove ? "Team leave to review" : "Your open requests",
          href: canApprove ? "/approvals" : "/leave",
          icon: "approvals",
          accent: DASHBOARD_COLORS.people,
        },
        {
          label: "Documents",
          value: String(record?.documents.length ?? 0),
          hint: "On your file",
          href: "/documents",
          icon: "docs",
          accent: DASHBOARD_COLORS.docs,
        },
        {
          label: latestPayslip ? "Latest payslip" : "Devices",
          value: latestPayslip
            ? latestPayslip.period_label
            : String(deviceCount),
          hint: latestPayslip
            ? "Ready to download"
            : deviceCount > 0
              ? "Assigned to you"
              : "None assigned",
          href: latestPayslip ? "/documents" : "/settings",
          icon: latestPayslip ? "payroll" : "devices",
          accent: latestPayslip
            ? DASHBOARD_COLORS.payroll
            : DASHBOARD_COLORS.devices,
        },
      ];

  return (
    <DashboardView
      greeting={greetingForHour(hour)}
      firstName={firstName}
      subtitle={[
        profile.business_unit?.name ?? "JA Group",
        profile.department?.name ?? profile.job_title ?? "Team",
      ].join(" · ")}
      kpis={kpis}
      leaveRemaining={leaveRemaining}
      leaveEntitlement={leaveEntitlement}
      leaveUsed={leaveUsed}
      leavePending={leavePending}
      upcomingLeave={upcomingLeave}
      team={profile.isManager || admin ? team : []}
      birthdays={birthdays}
      holidays={(holidays ?? []).map((item) => ({
        name: item.name,
        dateLabel: format(parseISO(item.holiday_date), "EEE d MMM"),
      }))}
      reportingLine={
        hasTag(profile, "ceo") || hasTag(profile, "super_admin")
          ? {
              label: "Organisation",
              name: "You lead JA Group",
              detail: profile.job_title ?? "Chief Executive Officer",
            }
          : {
              label: "Reports to",
              name: profile.manager
                ? displayName(profile.manager)
                : "Not assigned",
              detail: profile.manager?.job_title ?? "Ask HR to set your manager",
            }
      }
      canApprove={canApprove}
      isAdmin={admin}
    />
  );
}
