import type { JSONContent } from "@tiptap/core";

export type { JSONContent };

export interface MentionCandidate {
  id: string;
  label: string;
  avatarUrl: string | null;
  jobTitle: string | null;
}

export interface AnnouncementAttachmentSummary {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
}

export interface PendingAttachment {
  id: string;
  file: File;
  fileName: string;
  mimeType: string;
  byteSize: number;
}

export const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const MAX_ANNOUNCEMENT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ANNOUNCEMENT_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isAnnouncementJsonContent(
  value: unknown,
): value is JSONContent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as { type: unknown }).type === "doc"
  );
}

/**
 * Deep-clone TipTap JSON into plain data.
 * Server actions can leave nested `attrs` as client references; cloning
 * avoids "Cannot access X on the server" when rendering email HTML.
 */
export function cloneTipTapJson(value: JSONContent): JSONContent {
  return JSON.parse(JSON.stringify(value)) as JSONContent;
}
