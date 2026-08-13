import type { SupabaseClient } from "@supabase/supabase-js";

export const ANNOUNCEMENT_ATTACHMENTS_BUCKET = "announcement-attachments";

function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop()?.trim() || "attachment";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export function announcementAttachmentPath(
  announcementId: string,
  fileName: string,
): string {
  const safeName = sanitizeFileName(fileName);
  return `announcements/${announcementId}/${crypto.randomUUID()}-${safeName}`;
}

export async function uploadAnnouncementAttachment(
  supabase: SupabaseClient,
  input: {
    announcementId: string;
    fileName: string;
    mimeType: string;
    body: Buffer | ArrayBuffer | Blob | File;
  },
): Promise<{ storagePath: string }> {
  const storagePath = announcementAttachmentPath(
    input.announcementId,
    input.fileName,
  );

  const { error } = await supabase.storage
    .from(ANNOUNCEMENT_ATTACHMENTS_BUCKET)
    .upload(storagePath, input.body, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return { storagePath };
}

export async function removeAnnouncementAttachments(
  supabase: SupabaseClient,
  storagePaths: string[],
): Promise<void> {
  if (storagePaths.length === 0) return;

  const { error } = await supabase.storage
    .from(ANNOUNCEMENT_ATTACHMENTS_BUCKET)
    .remove(storagePaths);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createAnnouncementAttachmentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ANNOUNCEMENT_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
