import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Megaphone } from "lucide-react";
import { getAnnouncementsForViewer } from "@/lib/announcements/get-for-viewer";
import {
  announcementCategoryLabel,
  announcementTypeLabel,
} from "@/lib/announcements/categories";
import { MessageContent } from "@/components/communications/message-content";

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncementsForViewer(50);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Internal comms for your business unit and work type. Open any item to
          read the full message, attachments, and links.
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <Megaphone className="size-5" />
          </div>
          <h2 className="mt-4 text-sm font-medium">No announcements yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            When something is published for your audience, it will show up here
            and in your notifications.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {announcements.map((item) => (
            <li key={item.id}>
              <Link
                href={`/announcements/${item.id}`}
                className="block rounded-xl border border-border bg-card p-5 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-[#174EA6]">
                      {announcementCategoryLabel(item.category)} ·{" "}
                      {announcementTypeLabel(item.announcement_type)}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-slate-900">
                      {item.title}
                    </h2>
                  </div>
                  <time
                    dateTime={item.published_at}
                    className="shrink-0 text-xs font-medium text-slate-500 tabular-nums"
                  >
                    {format(parseISO(item.published_at), "d MMM")}
                  </time>
                </div>
                <div className="mt-2">
                  <MessageContent
                    content={item.body_json}
                    fallbackPlainText={item.body}
                    clamp
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
