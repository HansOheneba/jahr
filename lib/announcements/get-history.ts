import { cookies } from "next/headers";
import {
  getAnnouncementCategory,
  isMissingAnnouncementCategoryColumn,
  normalizeAnnouncementType,
  type AnnouncementCategory,
  type AnnouncementType,
} from "@/lib/announcements/categories";
import { countAnnouncementAudience } from "@/lib/announcements/resolve-audience";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canPublishComms } from "@/lib/auth/permissions";
import {
  isAnnouncementJsonContent,
  type AnnouncementAttachmentSummary,
  type JSONContent,
} from "@/lib/communications/types";
import { plainTextToTipTapDoc } from "@/lib/communications/plain-text";
import type { WorkType } from "@/lib/types/employee";
import { createClient } from "@/utils/supabase/server";

export interface AnnouncementHistoryItem {
  id: string;
  title: string;
  category: AnnouncementCategory;
  announcementType: AnnouncementType;
  body: string;
  bodyJson: JSONContent;
  publishedAt: string;
  audienceBusinessUnitIds: string[];
  audienceWorkTypes: WorkType[];
  recipientCount: number;
  attachments: AnnouncementAttachmentSummary[];
}

const HISTORY_SELECT = `
  id, title, category, announcement_type, body, body_json, published_at,
  audience_business_unit_ids, audience_work_types,
  announcement_attachments ( id, file_name, mime_type, byte_size )
`;

const HISTORY_SELECT_LEGACY = `
  id, title, category, body, body_json, published_at,
  audience_business_unit_ids, audience_work_types,
  announcement_attachments ( id, file_name, mime_type, byte_size )
`;

const HISTORY_SELECT_MINIMAL = `
  id, title, body, body_json, published_at,
  audience_business_unit_ids, audience_work_types,
  announcement_attachments ( id, file_name, mime_type, byte_size )
`;

export async function getAnnouncementHistory(
  limit = 20,
): Promise<AnnouncementHistoryItem[]> {
  const profile = await getCurrentProfile();
  if (!profile || !canPublishComms(profile)) {
    return [];
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const primary = await supabase
    .from("announcements")
    .select(HISTORY_SELECT)
    .order("published_at", { ascending: false })
    .limit(limit);

  let rows: unknown[] | null = primary.data;
  let error = primary.error;

  if (error && isMissingAnnouncementCategoryColumn(error.message)) {
    const withCategory = await supabase
      .from("announcements")
      .select(HISTORY_SELECT_LEGACY)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (
      withCategory.error &&
      isMissingAnnouncementCategoryColumn(withCategory.error.message)
    ) {
      const minimal = await supabase
        .from("announcements")
        .select(HISTORY_SELECT_MINIMAL)
        .order("published_at", { ascending: false })
        .limit(limit);
      rows = minimal.data;
      error = minimal.error;
    } else {
      rows = withCategory.data;
      error = withCategory.error;
    }
  }

  if (error) {
    console.error("[comms] get history failed:", error.message);
    return [];
  }

  const items = (rows ?? []).map((row) =>
    mapHistoryRow(row as Parameters<typeof mapHistoryRow>[0]),
  );

  return Promise.all(
    items.map(async (item) => {
      const recipientCount = await countAnnouncementAudience({
        businessUnitIds: item.audienceBusinessUnitIds,
        workTypes: item.audienceWorkTypes,
      });
      return { ...item, recipientCount };
    }),
  );
}

export async function getAnnouncementForCompose(
  announcementId: string,
): Promise<AnnouncementHistoryItem | null> {
  const profile = await getCurrentProfile();
  if (!profile || !canPublishComms(profile)) {
    return null;
  }

  const id = announcementId.trim();
  if (!id) return null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const primary = await supabase
    .from("announcements")
    .select(HISTORY_SELECT)
    .eq("id", id)
    .maybeSingle();

  let row: unknown | null = primary.data;
  let error = primary.error;

  if (error && isMissingAnnouncementCategoryColumn(error.message)) {
    const withCategory = await supabase
      .from("announcements")
      .select(HISTORY_SELECT_LEGACY)
      .eq("id", id)
      .maybeSingle();

    if (
      withCategory.error &&
      isMissingAnnouncementCategoryColumn(withCategory.error.message)
    ) {
      const minimal = await supabase
        .from("announcements")
        .select(HISTORY_SELECT_MINIMAL)
        .eq("id", id)
        .maybeSingle();
      row = minimal.data;
      error = minimal.error;
    } else {
      row = withCategory.data;
      error = withCategory.error;
    }
  }

  if (error || !row) {
    console.error("[comms] get for compose failed:", error?.message);
    return null;
  }

  return mapHistoryRow(row as Parameters<typeof mapHistoryRow>[0]);
}

function mapHistoryRow(row: {
  id: string;
  title: string;
  category?: string | null;
  announcement_type?: string | null;
  body: string;
  body_json: unknown;
  published_at: string;
  audience_business_unit_ids: string[] | null;
  audience_work_types: WorkType[] | null;
  announcement_attachments?: Array<{
    id: string;
    file_name: string;
    mime_type: string;
    byte_size: number;
  }> | null;
}): AnnouncementHistoryItem {
  const bodyJson = isAnnouncementJsonContent(row.body_json)
    ? row.body_json
    : plainTextToTipTapDoc(row.body);

  const announcementType = normalizeAnnouncementType(
    row.announcement_type ?? row.category,
  );

  return {
    id: row.id,
    title: row.title,
    category: getAnnouncementCategory(announcementType),
    announcementType,
    body: row.body,
    bodyJson,
    publishedAt: row.published_at,
    audienceBusinessUnitIds: row.audience_business_unit_ids ?? [],
    audienceWorkTypes: (row.audience_work_types ?? []) as WorkType[],
    recipientCount: 0,
    attachments: (row.announcement_attachments ?? []).map((file) => ({
      id: file.id,
      fileName: file.file_name,
      mimeType: file.mime_type,
      byteSize: Number(file.byte_size),
    })),
  };
}
