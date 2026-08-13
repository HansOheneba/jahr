"use server";

import { format, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canPublishComms } from "@/lib/auth/permissions";
import {
  getAnnouncementCategory,
  isAnnouncementType,
  isMissingAnnouncementCategoryColumn,
  type AnnouncementType,
} from "@/lib/announcements/categories";
import {
  countAnnouncementAudience,
  resolveAnnouncementAudience,
} from "@/lib/announcements/resolve-audience";
import {
  removeAnnouncementAttachments,
  uploadAnnouncementAttachment,
} from "@/lib/announcements/storage";
import {
  isTipTapDocEmpty,
  tipTapJsonToPlainText,
} from "@/lib/communications/plain-text";
import {
  ALLOWED_ANNOUNCEMENT_ATTACHMENT_MIME_TYPES,
  isAnnouncementJsonContent,
  MAX_ANNOUNCEMENT_ATTACHMENT_BYTES,
  type JSONContent,
} from "@/lib/communications/types";
import { sanitizeTipTapJson } from "@/lib/communications/tiptap-links";
import { sendAnnouncementEmail } from "@/lib/email/announcements";
import type { EmailAttachment } from "@/lib/email/resend";
import type { WorkType } from "@/lib/types/employee";
import { createClient } from "@/utils/supabase/server";

const WORK_TYPES: readonly WorkType[] = ["onsite", "hybrid", "remote"];

export interface PublishAnnouncementInput {
  title: string;
  announcementType: AnnouncementType;
  bodyJson: JSONContent;
  businessUnitIds: string[];
  workTypes: WorkType[];
  files?: File[];
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
  if (!title) {
    return { error: "Add a subject." };
  }

  if (!isAnnouncementType(input.announcementType)) {
    return { error: "Choose an announcement type." };
  }

  const category = getAnnouncementCategory(input.announcementType);

  if (!isAnnouncementJsonContent(input.bodyJson)) {
    return { error: "Message content is invalid." };
  }

  // Plain clone — nested attrs from the client editor can be Flight references.
  const bodyJson = sanitizeTipTapJson(input.bodyJson);

  if (isTipTapDocEmpty(bodyJson)) {
    return { error: "Add a message body." };
  }

  const body = tipTapJsonToPlainText(bodyJson);
  const files = input.files ?? [];
  const emailAttachments: EmailAttachment[] = [];

  for (const file of files) {
    if (!ALLOWED_ANNOUNCEMENT_ATTACHMENT_MIME_TYPES.has(file.type)) {
      return { error: `Unsupported file type: ${file.name}` };
    }
    if (file.size > MAX_ANNOUNCEMENT_ATTACHMENT_BYTES) {
      return { error: `${file.name} is larger than 10 MB.` };
    }
    emailAttachments.push({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });
  }

  const businessUnitIds = normalizeIds(input.businessUnitIds);
  const workTypes = normalizeWorkTypes(input.workTypes);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const payload = {
    title,
    category,
    announcement_type: input.announcementType,
    body,
    body_json: bodyJson,
    created_by: profile.id,
    is_active: true,
    audience_business_unit_ids: businessUnitIds,
    audience_work_types: workTypes,
  };

  let { data, error } = await supabase
    .from("announcements")
    .insert(payload)
    .select("id, published_at")
    .single();

  if (error && isMissingAnnouncementCategoryColumn(error.message)) {
    const {
      category: _category,
      announcement_type: _announcementType,
      ...legacyPayload
    } = payload;
    const fallback = await supabase
      .from("announcements")
      .insert(legacyPayload)
      .select("id, published_at")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    console.error("[comms] publish failed:", error?.message);
    return { error: "Could not publish the announcement." };
  }

  const uploadedPaths: string[] = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const prepared = emailAttachments[index];
      const { storagePath } = await uploadAnnouncementAttachment(supabase, {
        announcementId: data.id,
        fileName: file.name,
        mimeType: file.type,
        body: prepared.content,
      });
      uploadedPaths.push(storagePath);

      const { error: attachmentError } = await supabase
        .from("announcement_attachments")
        .insert({
          announcement_id: data.id,
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type,
          byte_size: file.size,
        });

      if (attachmentError) {
        throw new Error(attachmentError.message);
      }
    }
  } catch (uploadError) {
    console.error("[comms] attachment upload failed:", uploadError);
    try {
      await removeAnnouncementAttachments(supabase, uploadedPaths);
    } catch {
      // best-effort cleanup
    }
    await supabase.from("announcements").delete().eq("id", data.id);
    return { error: "Could not upload attachments. Nothing was published." };
  }

  const recipients = await resolveAnnouncementAudience({
    businessUnitIds,
    workTypes,
  });

  const publishedAtLabel = format(
    parseISO(data.published_at),
    "d MMM yyyy 'at' HH:mm",
  );

  // Await sends so the server action does not finish before Resend returns.
  await Promise.all(
    recipients.map((recipient) =>
      sendAnnouncementEmail({
        to: recipient.email,
        title,
        body,
        bodyJson,
        announcementType: input.announcementType,
        announcementId: data.id,
        publishedAtLabel,
        attachments: emailAttachments,
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
