import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isOrgAdmin } from "@/lib/types/database";
import type { EmploymentStatus } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

export interface PermitWatchlistPerson {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  employee_number: string | null;
  office_location: string | null;
  immigration_status: string | null;
  work_permit_number: string | null;
  work_permit_expiry: string;
  avatar_url: string | null;
  gender: string | null;
  status: EmploymentStatus;
}

export async function getPermitWatchlist(): Promise<PermitWatchlistPerson[]> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer)) {
    return [];
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id, email, first_name, last_name, preferred_name, employee_number,
      office_location, immigration_status, work_permit_number,
      work_permit_expiry, avatar_url, gender, status
    `,
    )
    .not("work_permit_expiry", "is", null)
    .neq("status", "terminated")
    .order("work_permit_expiry", { ascending: true });

  if (error) {
    console.error("[getPermitWatchlist]", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.work_permit_expiry != null)
    .map((row) => ({
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      preferred_name: row.preferred_name,
      employee_number: row.employee_number,
      office_location: row.office_location,
      immigration_status: row.immigration_status,
      work_permit_number: row.work_permit_number,
      work_permit_expiry: row.work_permit_expiry as string,
      avatar_url: row.avatar_url,
      gender: row.gender,
      status: row.status as EmploymentStatus,
    }));
}
