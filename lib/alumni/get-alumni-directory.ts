import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import type {
  AlumniDirectoryEntry,
  AlumniProfileEntry,
  AlumniRecordEntry,
} from "@/lib/alumni/types";
import { isOrgAdmin } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

function compareAlumni(a: AlumniDirectoryEntry, b: AlumniDirectoryEntry): number {
  const last = a.last_name.localeCompare(b.last_name);
  if (last !== 0) return last;
  return a.first_name.localeCompare(b.first_name);
}

export async function getAlumniDirectory(): Promise<AlumniDirectoryEntry[]> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer)) {
    return [];
  }

  const [profiles, records] = await Promise.all([
    fetchTerminatedProfiles(),
    fetchAlumniRecords(),
  ]);

  return [...profiles, ...records].sort(compareAlumni);
}

async function fetchTerminatedProfiles(): Promise<AlumniProfileEntry[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, preferred_name, job_title, phone, gender, avatar_url, leaving_reason, termination_date, start_date, department_id, business_unit_id",
    )
    .eq("status", "terminated")
    .order("first_name", { ascending: true });

  if (error || !data) {
    if (error) console.error("[fetchTerminatedProfiles]", error.message);
    return [];
  }

  const departmentIds = [
    ...new Set(data.map((row) => row.department_id).filter(Boolean)),
  ] as string[];
  const businessUnitIds = [
    ...new Set(data.map((row) => row.business_unit_id).filter(Boolean)),
  ] as string[];

  const [{ data: departments }, { data: businessUnits }] = await Promise.all([
    departmentIds.length
      ? supabase.from("departments").select("id, name").in("id", departmentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    businessUnitIds.length
      ? supabase
          .from("business_units")
          .select("id, name")
          .in("id", businessUnitIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const deptMap = new Map((departments ?? []).map((row) => [row.id, row.name]));
  const unitMap = new Map((businessUnits ?? []).map((row) => [row.id, row.name]));

  return data.map((row) => ({
    source: "profile" as const,
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    preferred_name: row.preferred_name,
    email: row.email,
    phone: row.phone,
    job_title: row.job_title,
    department_name: row.department_id
      ? (deptMap.get(row.department_id) ?? null)
      : null,
    business_unit_name: row.business_unit_id
      ? (unitMap.get(row.business_unit_id) ?? null)
      : null,
    gender: row.gender,
    avatar_url: row.avatar_url,
    leaving_reason: row.leaving_reason,
    termination_date: row.termination_date,
    start_date: row.start_date,
  }));
}

async function fetchAlumniRecords(): Promise<AlumniRecordEntry[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("alumni_records")
    .select(
      "id, first_name, last_name, preferred_name, email, phone, personal_email, start_year, end_year, start_date, termination_date, placement, job_title, notes",
    )
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error || !data) {
    if (error) console.error("[fetchAlumniRecords]", error.message);
    return [];
  }

  return data.map((row) => ({
    source: "record" as const,
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    preferred_name: row.preferred_name,
    email: row.email,
    phone: row.phone,
    personal_email: row.personal_email,
    start_year: row.start_year,
    end_year: row.end_year,
    start_date: row.start_date,
    termination_date: row.termination_date,
    placement: row.placement,
    job_title: row.job_title,
    notes: row.notes,
  }));
}
