import type { WorkType } from "@/lib/types/employee";
import { createAdminClient } from "@/utils/supabase/admin";

export interface AnnouncementAudienceFilter {
  businessUnitIds: string[];
  workTypes: WorkType[];
}

export interface AnnouncementRecipient {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
}

/** Active employees with a work email matching the audience filters. */
export async function resolveAnnouncementAudience(
  filter: AnnouncementAudienceFilter,
): Promise<AnnouncementRecipient[]> {
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select("id, email, first_name, last_name, preferred_name")
    .eq("status", "active")
    .not("email", "is", null)
    .neq("email", "");

  if (filter.businessUnitIds.length > 0) {
    query = query.in("business_unit_id", filter.businessUnitIds);
  }

  if (filter.workTypes.length > 0) {
    query = query.in("work_type", filter.workTypes);
  }

  const { data, error } = await query.order("first_name", { ascending: true });

  if (error) {
    console.error("[comms] resolve audience failed:", error.message);
    return [];
  }

  return (data ?? []).filter(
    (row): row is AnnouncementRecipient =>
      typeof row.email === "string" && row.email.trim().length > 0,
  );
}

export async function countAnnouncementAudience(
  filter: AnnouncementAudienceFilter,
): Promise<number> {
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .not("email", "is", null)
    .neq("email", "");

  if (filter.businessUnitIds.length > 0) {
    query = query.in("business_unit_id", filter.businessUnitIds);
  }

  if (filter.workTypes.length > 0) {
    query = query.in("work_type", filter.workTypes);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[comms] count audience failed:", error.message);
    return 0;
  }

  return count ?? 0;
}
