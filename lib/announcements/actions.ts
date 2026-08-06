"use server";

import { format, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canPublishComms } from "@/lib/auth/permissions";
import {
  countAnnouncementAudience,
  resolveAnnouncementAudience,
} from "@/lib/announcements/resolve-audience";
import { sendAnnouncementEmail } from "@/lib/email/announcements";
import type { WorkType } from "@/lib/types/employee";
import { createClient } from "@/utils/supabase/server";

const WORK_TYPES: readonly WorkType[] = ["onsite", "hybrid", "remote"];

export interface PublishAnnouncementInput {
  title: string;
  body: string;
  businessUnitIds: string[];
  workTypes: WorkType[];
}

export interface PublishAnnouncementResult {
  error?: string;
  success?: boolean;
  recipientCount?: number;
}

function normalizeWorkTypes(values: WorkType[]): WorkType[] {
  const unique = new Set<WorkType>();
  for (const value of values) {
    if (WORK_TYPES.includes(value)) {
      unique.add(value);
    }
  }
  return [...unique];
}

function normalizeIds(values: string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ];
}

export async function previewAnnouncementAudience(input: {
  businessUnitIds: string[];
  workTypes: WorkType[];
}): Promise<{ count: number; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !canPublishComms(profile)) {
    return { count: 0, error: "You do not have permission to publish." };
  }

  const count = await countAnnouncementAudience({
    businessUnitIds: normalizeIds(input.businessUnitIds),
    workTypes: normalizeWorkTypes(input.workTypes),
  });

  return { count };
}

export async function publishAnnouncement(
  input: PublishAnnouncementInput,
): Promise<PublishAnnouncementResult> {
  if (AUTH_BYPASS) {
    return { error: "Publishing is disabled in preview mode." };
  }

  const profile = await getCurrentProfile();
  if (!profile || !canPublishComms(profile)) {
    return { error: "You do not have permission to publish announcements." };
  }

  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) {
    return { error: "Add a title." };
  }
  if (!body) {
    return { error: "Add a message body." };
  }

  const businessUnitIds = normalizeIds(input.businessUnitIds);
  const workTypes = normalizeWorkTypes(input.workTypes);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title,
      body,
      created_by: profile.id,
      is_active: true,
      audience_business_unit_ids: businessUnitIds,
      audience_work_types: workTypes,
    })
    .select("id, published_at")
    .single();

  if (error || !data) {
    console.error("[comms] publish failed:", error?.message);
    return { error: "Could not publish the announcement." };
  }

  const recipients = await resolveAnnouncementAudience({
    businessUnitIds,
    workTypes,
  });

  const publishedAtLabel = format(
    parseISO(data.published_at),
    "d MMM yyyy 'at' HH:mm",
  );

  void Promise.all(
    recipients.map((recipient) =>
      sendAnnouncementEmail({
        to: recipient.email,
        title,
        body,
        publishedAtLabel,
      }),
    ),
  );

  revalidatePath("/dashboard");
  revalidatePath("/admin/comms");

  return { success: true, recipientCount: recipients.length };
}

export async function getCommsBusinessUnits(): Promise<
  Array<{ id: string; name: string }>
> {
  const profile = await getCurrentProfile();
  if (!profile || !canPublishComms(profile)) {
    return [];
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("business_units")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return data ?? [];
}
