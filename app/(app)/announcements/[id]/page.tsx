import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { AttachmentList } from "@/components/communications/attachment-list";
import { MessageContent } from "@/components/communications/message-content";
import {
  announcementCategoryLabel,
  announcementTypeLabel,
} from "@/lib/announcements/categories";
import { getAnnouncementForViewer } from "@/lib/announcements/get-for-viewer";

interface AnnouncementDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnnouncementDetailPage({
  params,
}: AnnouncementDetailPageProps) {
  const { id } = await params;
  const announcement = await getAnnouncementForViewer(id);

  if (!announcement) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-3">
        <Link
          href="/announcements"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All announcements
        </Link>
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#174EA6]">
            {announcementCategoryLabel(announcement.category)} ·{" "}
            {announcementTypeLabel(announcement.announcement_type)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1F1F1F]">
            {announcement.title}
          </h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            Published{" "}
            {format(parseISO(announcement.published_at), "d MMM yyyy · HH:mm")}
          </p>
        </div>
      </div>

      <article className="rounded-xl border border-border bg-card p-6">
        <MessageContent
          content={announcement.body_json}
          fallbackPlainText={announcement.body}
          className="text-[15px] leading-relaxed text-slate-700"
        />
        {announcement.attachments && announcement.attachments.length > 0 ? (
          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Attachments
            </p>
            <AttachmentList saved={announcement.attachments} />
          </div>
        ) : null}
      </article>
    </div>
  );
}
