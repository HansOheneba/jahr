import { cookies } from "next/headers";
import type { Announcement } from "@/lib/types/employee";
import { createClient } from "@/utils/supabase/server";

const ANNOUNCEMENT_SELECT =
  "id, title, body, published_at, audience_business_unit_ids, audience_work_types, is_active, created_by";

/** Active announcements visible to the current user (RLS applies audience filters). */
export async function getAnnouncementsForViewer(
  limit = 8,
): Promise<Announcement[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("announcements")
    .select(ANNOUNCEMENT_SELECT)
    .eq("is_active", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[comms] get for viewer failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    published_at: row.published_at,
    audience_business_unit_ids: row.audience_business_unit_ids ?? [],
    audience_work_types: row.audience_work_types ?? [],
    is_active: row.is_active,
    created_by: row.created_by,
  }));
}
