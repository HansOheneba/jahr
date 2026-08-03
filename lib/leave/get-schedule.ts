import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import type { LeaveStatus, LeaveTypeId } from "@/lib/leave/types";
import { createClient } from "@/utils/supabase/server";

export interface SchedulePerson {
  id: string;
  name: string;
  jobTitle: string | null;
  gender: string | null;
  avatarUrl: string | null;
}

export interface ScheduleLeaveEntry {
  id: string;
  type: LeaveTypeId;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  workingDays: number;
  notes: string;
  person: SchedulePerson;
}

function displayName(person: {
  preferred_name?: string | null;
  first_name: string;
  last_name: string;
}): string {
  const first = person.preferred_name?.trim() || person.first_name;
  return [first, person.last_name].filter(Boolean).join(" ");
}

const PREVIEW_SCHEDULE: ScheduleLeaveEntry[] = [
  {
    id: "sched-1",
    type: "annual",
    status: "approved",
    startDate: "2026-08-12",
    endDate: "2026-08-16",
    workingDays: 4,
    notes: "",
    person: {
      id: "p1",
      name: "Ama Boateng",
      jobTitle: "Product Manager",
      gender: "female",
      avatarUrl: null,
    },
  },
  {
    id: "sched-2",
    type: "sick",
    status: "approved",
    startDate: "2026-08-03",
    endDate: "2026-08-03",
    workingDays: 1,
    notes: "",
    person: {
      id: "p2",
      name: "Kofi Mensah",
      jobTitle: "Software Engineer",
      gender: "male",
      avatarUrl: null,
    },
  },
  {
    id: "sched-3",
    type: "casual",
    status: "pending",
    startDate: "2026-08-10",
    endDate: "2026-08-11",
    workingDays: 2,
    notes: "",
    person: {
      id: "p3",
      name: "Esi Owusu",
      jobTitle: "People Partner",
      gender: "female",
      avatarUrl: null,
    },
  },
];

/** Leave visible to the viewer: own + direct reports (manager) / all (org admin). */
export async function getLeaveSchedule(options: {
  viewerId: string;
  isOrgAdmin: boolean;
  isManager: boolean;
}): Promise<ScheduleLeaveEntry[]> {
  if (AUTH_BYPASS) {
    return PREVIEW_SCHEDULE;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let query = supabase
    .from("leave_requests")
    .select(
      `
      id, type, status, start_date, end_date, working_days, notes, employee_id, manager_id,
      employee:profiles!leave_requests_employee_id_fkey (
        id, first_name, last_name, preferred_name, job_title, gender, avatar_url
      )
    `,
    )
    .in("status", ["pending", "approved"])
    .order("start_date", { ascending: true });

  if (!options.isOrgAdmin) {
    if (options.isManager) {
      query = query.or(
        `employee_id.eq.${options.viewerId},manager_id.eq.${options.viewerId}`,
      );
    } else {
      query = query.eq("employee_id", options.viewerId);
    }
  }

  const { data, error } = await query;
  if (error || !data) {
    if (error) console.error("[getLeaveSchedule]", error.message);
    return [];
  }

  return data.flatMap((row) => {
    const employee = Array.isArray(row.employee) ? row.employee[0] : row.employee;
    if (!employee) return [];

    return [
      {
        id: row.id,
        type: row.type as LeaveTypeId,
        status: row.status as LeaveStatus,
        startDate: row.start_date,
        endDate: row.end_date,
        workingDays: Number(row.working_days),
        notes: row.notes ?? "",
        person: {
          id: employee.id,
          name: displayName(employee),
          jobTitle: employee.job_title,
          gender: employee.gender,
          avatarUrl: employee.avatar_url,
        },
      },
    ];
  });
}
