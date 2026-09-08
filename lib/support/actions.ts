"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  SUPPORT_DETAILS_MAX_LENGTH,
  SUPPORT_SUBJECT_MAX_LENGTH,
  isSupportRequestKind,
  isSupportRequestStatus,
  type SupportRequestKind,
  type SupportRequestStatus,
} from "@/lib/support/types";
import { isOrgAdmin } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

const SUPPORT_PATHS = ["/support", "/admin/feedback"];

function revalidateSupportPaths() {
  for (const path of SUPPORT_PATHS) {
    revalidatePath(path);
  }
}

export interface SupportActionResult {
  error?: string;
  success?: boolean;
}

export interface SubmitSupportRequestInput {
  kind: SupportRequestKind;
  subject: string;
  details: string;
}

export async function submitSupportRequest(
  input: SubmitSupportRequestInput,
): Promise<SupportActionResult> {
  if (AUTH_BYPASS) {
    return { error: "Submissions are disabled in preview mode." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "You need to be signed in to send this." };
  }

  if (!isSupportRequestKind(input.kind)) {
    return { error: "Choose an idea or a bug report." };
  }

  const subject = input.subject.trim();
  const details = input.details.trim();

  if (!subject) {
    return { error: "Add a summary." };
  }
  if (subject.length > SUPPORT_SUBJECT_MAX_LENGTH) {
    return {
      error: `Keep the summary to ${SUPPORT_SUBJECT_MAX_LENGTH} characters.`,
    };
  }
  if (!details) {
    return { error: "Add the details." };
  }
  if (details.length > SUPPORT_DETAILS_MAX_LENGTH) {
    return {
      error: `Keep the details to ${SUPPORT_DETAILS_MAX_LENGTH} characters.`,
    };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("support_requests").insert({
    submitted_by: profile.id,
    kind: input.kind,
    subject,
    details,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateSupportPaths();
  return { success: true };
}

export interface UpdateSupportRequestStatusInput {
  requestId: string;
  status: SupportRequestStatus;
}

export async function updateSupportRequestStatus(
  input: UpdateSupportRequestStatusInput,
): Promise<SupportActionResult> {
  if (AUTH_BYPASS) {
    return { error: "Triage is disabled in preview mode." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "You need to be signed in to update a request." };
  }
  if (!isOrgAdmin(profile)) {
    return { error: "You are not allowed to update requests." };
  }
  if (!isSupportRequestStatus(input.status)) {
    return { error: "Unknown status." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("support_requests")
    .update({
      status: input.status,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.requestId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!data) {
    return { error: "Request not found." };
  }

  revalidateSupportPaths();
  return { success: true };
}
