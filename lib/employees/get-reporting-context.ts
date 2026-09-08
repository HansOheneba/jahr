import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasTag } from "@/lib/auth/permissions";
import { createClient } from "@/utils/supabase/server";

export interface ReportingLinePerson {
  id: string;
  name: string;
  jobTitle: string | null;
  departmentName: string | null;
  avatarUrl: string | null;
  gender: string | null;
}

export interface ReportingLineContext {
  viewer: ReportingLinePerson;
  manager: ReportingLinePerson | null;
  peers: ReportingLinePerson[];
  directReports: ReportingLinePerson[];
  departmentName: string | null;
  businessUnitName: string | null;
  isOrgLeader: boolean;
}

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  job_title: string | null;
  gender: string | null;
  avatar_url: string | null;
  manager_id: string | null;
  department_id: string | null;
  business_unit_id: string | null;
};

function displayPersonName(row: {
  first_name: string;
  last_name: string;
  preferred_name: string | null;
}): string {
  return [row.preferred_name?.trim() || row.first_name, row.last_name]
    .filter(Boolean)
    .join(" ");
}

function toPerson(
  row: ProfileRow,
  departmentMap: Map<string, string>,
): ReportingLinePerson {
  return {
    id: row.id,
    name: displayPersonName(row),
    jobTitle: row.job_title,
    departmentName: row.department_id
      ? (departmentMap.get(row.department_id) ?? null)
      : null,
    avatarUrl: row.avatar_url,
    gender: row.gender,
  };
}

export async function getReportingLineContext(): Promise<ReportingLineContext | null> {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, preferred_name, job_title, gender, avatar_url, manager_id, department_id, business_unit_id",
    )
    .eq("id", viewer.id)
    .maybeSingle();

  if (error || !profile) {
    if (error) {
      console.error("[getReportingLineContext]", error.message);
    }
    return null;
  }

  const [businessUnit, department, manager, peers, directReports] =
    await Promise.all([
      profile.business_unit_id
        ? supabase
            .from("business_units")
            .select("name")
            .eq("id", profile.business_unit_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      profile.department_id
        ? supabase
            .from("departments")
            .select("name")
            .eq("id", profile.department_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      profile.manager_id
        ? supabase
            .from("profiles")
            .select(
              "id, first_name, last_name, preferred_name, job_title, gender, avatar_url, manager_id, department_id, business_unit_id",
            )
            .eq("id", profile.manager_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      profile.manager_id
        ? supabase
            .from("profiles")
            .select(
              "id, first_name, last_name, preferred_name, job_title, gender, avatar_url, manager_id, department_id, business_unit_id",
            )
            .eq("manager_id", profile.manager_id)
            .eq("status", "active")
            .neq("id", viewer.id)
            .order("first_name", { ascending: true })
        : Promise.resolve({ data: [] as ProfileRow[] }),
      supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, preferred_name, job_title, gender, avatar_url, manager_id, department_id, business_unit_id",
        )
        .eq("manager_id", viewer.id)
        .eq("status", "active")
        .order("first_name", { ascending: true }),
    ]);

  const relatedProfiles = [
    profile,
    manager.data,
    ...(peers.data ?? []),
    ...(directReports.data ?? []),
  ].filter(Boolean) as ProfileRow[];

  const departmentIds = [
    ...new Set(
      relatedProfiles
        .map((row) => row.department_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: departments } = departmentIds.length
    ? await supabase.from("departments").select("id, name").in("id", departmentIds)
    : { data: [] as Array<{ id: string; name: string }> };

  const departmentMap = new Map(
    (departments ?? []).map((row) => [row.id, row.name]),
  );

  const viewerPerson = toPerson(profile, departmentMap);

  return {
    viewer: viewerPerson,
    manager: manager.data ? toPerson(manager.data, departmentMap) : null,
    peers: (peers.data ?? []).map((row) => toPerson(row, departmentMap)),
    directReports: (directReports.data ?? []).map((row) =>
      toPerson(row, departmentMap),
    ),
    departmentName: department.data?.name ?? null,
    businessUnitName: businessUnit.data?.name ?? "JA Group",
    isOrgLeader: hasTag(viewer, "ceo") || hasTag(viewer, "super_admin"),
  };
}
