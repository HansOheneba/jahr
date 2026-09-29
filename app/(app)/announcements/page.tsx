import Link from "next/link";
import { format, parseISO } from "date-fns";
import { getAnnouncementsForViewer } from "@/lib/announcements/get-for-viewer";
import { announcementTypeLabel } from "@/lib/announcements/categories";
import { MessageContent } from "@/components/communications/message-content";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncementsForViewer(50);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Announcements for you.
        </p>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          surface
          kind="announcements"
          title="No announcements yet"
          description="Published announcements appear here and in notifications."
          className="py-14"
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {announcements.map((item) => (
            <li key={item.id}>
              <Link
                href={`/announcements/${item.id}`}
                className="block rounded-xl border border-border bg-card p-5 transition-colors duration-150 ease-out hover:border-[color-mix(in_srgb,var(--primary)_25%,var(--border))]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge
                      variant="secondary"
                      className="rounded-md font-normal"
                    >
                      {announcementTypeLabel(item.announcement_type)}
                    </Badge>
                    <h2 className="mt-2 text-sm font-medium">{item.title}</h2>
                  </div>
                  <time
                    dateTime={item.published_at}
                    className="shrink-0 text-xs text-muted-foreground tabular-nums"
                  >
                    {format(parseISO(item.published_at), "d MMM")}
                  </time>
                </div>
                <div className="mt-2">
                  <MessageContent
                    content={item.body_json}
                    fallbackPlainText={item.body}
                    clamp
                    staticLinks
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
