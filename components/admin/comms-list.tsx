"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Copy, Megaphone, Search } from "lucide-react";
import { AttachmentList } from "@/components/communications/attachment-list";
import { MessageContent } from "@/components/communications/message-content";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { announcementDisplayLabel } from "@/lib/announcements/categories";
import { describeAnnouncementAudience } from "@/lib/announcements/audience-label";
import type { AnnouncementHistoryItem } from "@/lib/announcements/get-history";
import { cn } from "@/lib/utils";

interface CommsListProps {
  items: AnnouncementHistoryItem[];
  businessUnits: Array<{ id: string; name: string }>;
}

function EmptyState({
  title,
  description,
  showCta,
}: {
  title: string;
  description: string;
  showCta?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <Megaphone className="size-5" />
      </div>
      <h2 className="mt-4 text-sm font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {showCta ? (
        <Link href="/admin/comms/new" className={cn(buttonVariants(), "mt-5")}>
          <Megaphone />
          New announcement
        </Link>
      ) : null}
    </div>
  );
}

function AnnouncementRow({
  item,
  audience,
}: {
  item: AnnouncementHistoryItem;
  audience: string;
}) {
  const publishedAt = parseISO(item.publishedAt);

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-md font-normal">
            {announcementDisplayLabel(item.announcementType)}
          </Badge>
          <Badge variant="outline" className="rounded-md font-normal">
            {audience}
          </Badge>
        </div>

        <h2 className="mt-2 text-sm font-medium">{item.title}</h2>

        <MessageContent
          content={item.bodyJson}
          fallbackPlainText={item.body}
          clamp
          className="mt-1"
        />

        {item.attachments.length > 0 ? (
          <AttachmentList saved={item.attachments} className="mt-3" />
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 sm:w-44 sm:shrink-0 sm:flex-col sm:items-end sm:justify-start">
        <div className="sm:text-right">
          <time
            dateTime={item.publishedAt}
            className="block text-xs text-muted-foreground tabular-nums"
          >
            {format(publishedAt, "d MMM yyyy")}
          </time>
          <span className="block text-xs text-muted-foreground tabular-nums">
            {item.recipientCount} recipient
            {item.recipientCount === 1 ? "" : "s"}
          </span>
        </div>
        <Link
          href={`/admin/comms/new?from=${item.id}`}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          <Copy />
          Reuse
        </Link>
      </div>
    </li>
  );
}

export function CommsList({ items, businessUnits }: CommsListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.body.toLowerCase().includes(normalized),
    );
  }, [items, query]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="No announcements yet"
        description="Publish your first announcement to email and the dashboard feed."
        showCta
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative sm:max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search announcements"
          aria-label="Search announcements"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching announcements"
          description="Try a different search."
        />
      ) : (
        <Card className="py-0">
          <ul className="divide-y divide-border">
            {filtered.map((item) => (
              <AnnouncementRow
                key={item.id}
                item={item}
                audience={describeAnnouncementAudience(item, businessUnits)}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
