import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import { DUMMY_PROFILE } from "@/lib/auth/dummy-profile";
import { createClient } from "@/utils/supabase/server";
import type {
  BusinessUnit,
  Department,
  Profile,
  ProfileWithOrg,
} from "@/lib/types/database";

export async function getCurrentProfile(): Promise<ProfileWithOrg | null> {
  if (AUTH_BYPASS) {
    return DUMMY_PROFILE;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[getCurrentProfile]", error.message);
    return null;
  }

  if (!profile) {
    return null;
  }

  const typed = profile as Profile;

  const [businessUnitResult, departmentResult, managerResult, reportsResult] =
    await Promise.all([
      typed.business_unit_id
        ? supabase
            .from("business_units")
            .select("id, name, slug")
            .eq("id", typed.business_unit_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      typed.department_id
        ? supabase
            .from("departments")
            .select("id, name, slug")
            .eq("id", typed.department_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      typed.manager_id
        ? supabase
            .from("profiles")
            .select("id, first_name, last_name, email, job_title")
            .eq("id", typed.manager_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("manager_id", user.id)
        .eq("status", "active"),
    ]);

  return {
    ...typed,
    business_unit: (businessUnitResult.data as Pick<
      BusinessUnit,
      "id" | "name" | "slug"
    > | null) ?? null,
    department: (departmentResult.data as Pick<
      Department,
      "id" | "name" | "slug"
    > | null) ?? null,
    manager: managerResult.data as ProfileWithOrg["manager"],
    isManager: (reportsResult.count ?? 0) > 0,
  };
}
