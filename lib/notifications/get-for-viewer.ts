import { cache } from "react";
import { announcementTypeLabel } from "@/lib/announcements/categories";
import { getAnnouncementsForViewer } from "@/lib/announcements/get-for-viewer";
import type { NotificationItem } from "@/lib/notifications/types";

/** Live notification feed for the header bell (no demo data). */
export const getNotificationsForViewer = cache(async (
  limit = 30,
): Promise<NotificationItem[]> => {
  const announcements = await getAnnouncementsForViewer(limit);

  return announcements.map((item) => {
    const typeLabel = announcementTypeLabel(item.announcement_type);
    const preview = item.body.trim().replace(/\s+/g, " ").slice(0, 120);

    return {
      id: `announcement:${item.id}`,
      kind: "announcement" as const,
      unread: true,
      createdAt: item.published_at,
      actor: null,
      subject: item.title,
      body:
        preview.length > 0
          ? `${typeLabel}. ${preview}${
              item.body.trim().length > 120 ? "…" : ""
            }`
          : typeLabel,
      href: `/announcements/${item.id}`,
    };
  });
});
