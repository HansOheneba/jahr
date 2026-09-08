import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import {
  isSupportRequestKind,
  isSupportRequestStatus,
  type SupportRequest,
  type SupportRequestPerson,
} from "@/lib/support/types";
import { displayName } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

const SUPPORT_REQUEST_LIMIT = 100;

const SUPPORT_REQUEST_SELECT = `
  id, kind, subject, details, status, created_at, reviewed_at,
  submitter:profiles!support_requests_submitted_by_fkey (
    id, first_name, last_name, preferred_name
  ),
  reviewer:profiles!support_requests_reviewed_by_fkey (
    id, first_name, last_name, preferred_name
  )
`;

interface PersonRow {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
}

interface SupportRequestRow {
  id: string;
  kind: string;
  subject: string;
  details: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  submitter: PersonRow | null;
  reviewer: PersonRow | null;
}

function mapPerson(row: PersonRow | null): SupportRequestPerson | null {
  if (!row) return null;
  return { id: row.id, name: displayName(row) };
}

function mapRequest(row: SupportRequestRow): SupportRequest {
  return {
    id: row.id,
    kind: isSupportRequestKind(row.kind) ? row.kind : "idea",
    subject: row.subject,
    details: row.details,
    status: isSupportRequestStatus(row.status) ? row.status : "new",
    createdAt: row.created_at,
    submitter: mapPerson(row.submitter),
    reviewer: mapPerson(row.reviewer),
    reviewedAt: row.reviewed_at,
  };
}

async function fetchSupportRequests(
  filter?: { submittedBy: string },
): Promise<SupportRequest[]> {
  if (AUTH_BYPASS) return [];

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let query = supabase
    .from("support_requests")
    .select(SUPPORT_REQUEST_SELECT)
    .order("created_at", { ascending: false })
    .limit(SUPPORT_REQUEST_LIMIT);

  if (filter?.submittedBy) {
    query = query.eq("submitted_by", filter.submittedBy);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[support] list failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as SupportRequestRow[]).map(mapRequest);
}

/** Requests submitted by the signed-in employee. */
export async function getOwnSupportRequests(
  viewerId: string,
): Promise<SupportRequest[]> {
  return fetchSupportRequests({ submittedBy: viewerId });
}

/** All team requests for the admin feedback inbox. RLS limits this to org admins. */
export async function getAllSupportRequests(): Promise<SupportRequest[]> {
  return fetchSupportRequests();
}
