import { cache } from "react";
import { cookies } from "next/headers";
import {
  getAnnouncementCategory,
  isMissingAnnouncementCategoryColumn,
  normalizeAnnouncementType,
  type AnnouncementCategory,
} from "@/lib/announcements/categories";
import {
  isAnnouncementJsonContent,
  type AnnouncementAttachmentSummary,
  type JSONContent,
} from "@/lib/communications/types";
import { plainTextToTipTapDoc } from "@/lib/communications/plain-text";
import type { Announcement } from "@/lib/types/employee";
import { createClient } from "@/utils/supabase/server";

const ANNOUNCEMENT_SELECT =
  "id, title, category, announcement_type, body, body_json, published_at, audience_business_unit_ids, audience_work_types, is_active, created_by";

const ANNOUNCEMENT_SELECT_LEGACY =
  "id, title, category, body, body_json, published_at, audience_business_unit_ids, audience_work_types, is_active, created_by";

const ANNOUNCEMENT_SELECT_MINIMAL =
  "id, title, body, body_json, published_at, audience_business_unit_ids, audience_work_types, is_active, created_by";

function mapAttachments(
  rows:
    | Array<{
        id: string;
        file_name: string;
        mime_type: string;
        byte_size: number;
      }>
    | null
    | undefined,
): AnnouncementAttachmentSummary[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    byteSize: Number(row.byte_size),
  }));
}

function mapBodyJson(value: unknown, fallbackBody: string): JSONContent {
  if (isAnnouncementJsonContent(value)) {
    return value;
  }
  return plainTextToTipTapDoc(fallbackBody);
}

function mapAnnouncement(row: {
  id: string;
  title: string;
  category?: string | null;
  announcement_type?: string | null;
  body: string;
  body_json: unknown;
  published_at: string;
  audience_business_unit_ids: string[] | null;
  audience_work_types: Announcement["audience_work_types"] | null;
  is_active: boolean;
  created_by: string | null;
  announcement_attachments?: Array<{
    id: string;
    file_name: string;
    mime_type: string;
    byte_size: number;
  }> | null;
}): Announcement {
  const announcementType = normalizeAnnouncementType(
    row.announcement_type ?? row.category,
  );
  const category: AnnouncementCategory =
    getAnnouncementCategory(announcementType);

  return {
    id: row.id,
    title: row.title,
    category,
    announcement_type: announcementType,
    body: row.body,
    body_json: mapBodyJson(row.body_json, row.body),
    published_at: row.published_at,
    audience_business_unit_ids: row.audience_business_unit_ids ?? [],
    audience_work_types: row.audience_work_types ?? [],
    is_active: row.is_active,
    created_by: row.created_by,
    attachments: mapAttachments(row.announcement_attachments),
  };
}

/** Active announcements visible to the current user (RLS applies audience filters). */
export const getAnnouncementsForViewer = cache(async (
  limit = 8,
): Promise<Announcement[]> => {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const primary = await supabase
    .from("announcements")
    .select(
      `${ANNOUNCEMENT_SELECT}, announcement_attachments ( id, file_name, mime_type, byte_size )`,
    )
    .eq("is_active", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  let rows: unknown[] | null = primary.data;
  let error = primary.error;

  if (error && isMissingAnnouncementCategoryColumn(error.message)) {
    const withCategory = await supabase
      .from("announcements")
      .select(
        `${ANNOUNCEMENT_SELECT_LEGACY}, announcement_attachments ( id, file_name, mime_type, byte_size )`,
      )
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (
      withCategory.error &&
      isMissingAnnouncementCategoryColumn(withCategory.error.message)
    ) {
      const minimal = await supabase
        .from("announcements")
        .select(
          `${ANNOUNCEMENT_SELECT_MINIMAL}, announcement_attachments ( id, file_name, mime_type, byte_size )`,
        )
        .eq("is_active", true)
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
    console.error("[comms] get for viewer failed:", error.message);
    return [];
  }

  return (rows ?? []).map((row) =>
    mapAnnouncement(row as Parameters<typeof mapAnnouncement>[0]),
  );
});

/** Single announcement for the signed-in viewer (RLS applies). */
export async function getAnnouncementForViewer(
  announcementId: string,
): Promise<Announcement | null> {
  const id = announcementId.trim();
  if (!id) return null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const primary = await supabase
    .from("announcements")
    .select(
      `${ANNOUNCEMENT_SELECT}, announcement_attachments ( id, file_name, mime_type, byte_size )`,
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  let row: unknown | null = primary.data;
  let error = primary.error;

  if (error && isMissingAnnouncementCategoryColumn(error.message)) {
    const withCategory = await supabase
      .from("announcements")
      .select(
        `${ANNOUNCEMENT_SELECT_LEGACY}, announcement_attachments ( id, file_name, mime_type, byte_size )`,
      )
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (
      withCategory.error &&
      isMissingAnnouncementCategoryColumn(withCategory.error.message)
    ) {
      const minimal = await supabase
        .from("announcements")
        .select(
          `${ANNOUNCEMENT_SELECT_MINIMAL}, announcement_attachments ( id, file_name, mime_type, byte_size )`,
        )
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();
      row = minimal.data;
      error = minimal.error;
    } else {
      row = withCategory.data;
      error = withCategory.error;
    }
  }

  if (error || !row) {
    if (error) {
      console.error("[comms] get one for viewer failed:", error.message);
    }
    return null;
  }

  return mapAnnouncement(row as Parameters<typeof mapAnnouncement>[0]);
}
