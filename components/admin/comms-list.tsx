"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  LayoutGrid,
  List,
  Megaphone,
  Copy,
  Search,
} from "lucide-react";
import { AttachmentList } from "@/components/communications/attachment-list";
import { MessageContent } from "@/components/communications/message-content";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { announcementDisplayLabel } from "@/lib/announcements/categories";
import { describeAnnouncementAudience } from "@/lib/announcements/audience-label";
import type { AnnouncementHistoryItem } from "@/lib/announcements/get-history";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "published" | "drafts";
type ViewMode = "grid" | "list";

interface CommsListProps {
  items: AnnouncementHistoryItem[];
  businessUnits: Array<{ id: string; name: string }>;
}

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "drafts", label: "Drafts" },
];

function audienceTone(audience: string): "company" | "department" | "scoped" {
  if (audience === "Everyone") return "company";
  if (audience.includes("·")) return "scoped";
  return "department";
}

function formatRecipientCount(count: number): string {
  return `${count} recipient${count === 1 ? "" : "s"}`;
}

function AudiencePill({ audience }: { audience: string }) {
  const tone = audienceTone(audience);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "company" &&
          "border border-[#D2E3FC]/80 bg-[#E8F0FE] text-[#174EA6]",
        tone === "department" &&
          "border border-emerald-200/60 bg-[#E6F4EA] text-emerald-800",
        tone === "scoped" &&
          "border border-violet-200/60 bg-[#F3E8FF] text-violet-800",
      )}
    >
      {audience}
    </span>
  );
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
      <div className="flex size-12 items-center justify-center rounded-md bg-[#E8F0FE] text-[#174EA6]">
        <Megaphone className="size-5" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-600">
        {description}
      </p>
      {showCta ? (
        <Link
          href="/admin/comms/new"
          className={cn(buttonVariants(), "mt-5 gap-2")}
        >
          <Megaphone className="size-4" />
          New announcement
        </Link>
      ) : null}
    </div>
  );
}

function AnnouncementCard({
  item,
  audience,
  viewMode,
}: {
  item: AnnouncementHistoryItem;
  audience: string;
  viewMode: ViewMode;
}) {
  const publishedShort = format(parseISO(item.publishedAt), "d MMM");
  const publishedFull = format(parseISO(item.publishedAt), "d MMM yyyy");

  return (
    <li
      className={cn(
        "flex h-full flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm",
        "transition-[box-shadow] duration-200 ease-out hover:shadow-md",
        viewMode === "list" && "sm:flex-row sm:items-stretch sm:gap-6",
      )}
    >
      <div className={cn("min-w-0 flex-1", viewMode === "list" && "sm:max-w-3xl")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full border border-[#D2E3FC]/80 bg-[#E8F0FE] px-2.5 py-0.5 text-xs font-medium text-[#174EA6]">
              {announcementDisplayLabel(item.announcementType)}
            </span>
            <AudiencePill audience={audience} />
          </div>
          <time
            dateTime={item.publishedAt}
            className="shrink-0 text-xs font-medium text-[#747775] tabular-nums"
          >
            {publishedShort}
          </time>
        </div>

        <h2 className="mt-3 mb-2 line-clamp-1 text-base font-semibold text-slate-900">
          {item.title}
        </h2>

        <MessageContent
          content={item.bodyJson}
          fallbackPlainText={item.body}
          clamp
          className="mb-4 text-sm leading-relaxed text-slate-600 [&_li]:font-medium [&_ol]:pl-5 [&_ul]:pl-5"
        />

        {item.attachments.length > 0 ? (
          <AttachmentList saved={item.attachments} className="mb-1" />
        ) : null}
      </div>

      <div
        className={cn(
          "mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3",
          viewMode === "list" &&
            "sm:mt-0 sm:w-44 sm:shrink-0 sm:flex-col sm:items-end sm:justify-between sm:border-t-0 sm:border-l sm:border-slate-100 sm:pl-6 sm:pt-0",
        )}
      >
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium text-slate-500 tabular-nums">
            Sent {publishedFull}
          </p>
          <p className="text-xs font-medium text-slate-500 tabular-nums">
            {formatRecipientCount(item.recipientCount)}
          </p>
        </div>
        <Link
          href={`/admin/comms/new?from=${item.id}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5",
          )}
        >
          <Copy className="size-3.5" />
          Reuse
        </Link>
      </div>
    </li>
  );
}

export function CommsList({ items, businessUnits }: CommsListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter === "drafts") return false;

      if (!normalized) return true;

      return (
        item.title.toLowerCase().includes(normalized) ||
        item.body.toLowerCase().includes(normalized)
      );
    });
  }, [items, query, statusFilter]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="No announcements yet"
        description="Publish your first internal communique to email and the dashboard feed."
        showCta
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white/80 p-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filter announcements"
        >
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(filter.id)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-sm font-medium transition-[background-color,color] duration-150 ease-out",
                  active
                    ? "bg-[#E8F0FE] text-[#174EA6]"
                    : "bg-transparent text-slate-600 hover:bg-slate-100",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search announcements"
              aria-label="Search announcements"
              className="border-slate-200 bg-white pl-9 shadow-none"
            />
          </div>

          <div
            className="inline-flex items-center rounded-md border border-slate-200 bg-white p-1"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-md transition-[background-color,color] duration-150 ease-out",
                viewMode === "grid"
                  ? "bg-[#E8F0FE] text-[#174EA6]"
                  : "text-slate-500 hover:bg-slate-100",
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-md transition-[background-color,color] duration-150 ease-out",
                viewMode === "list"
                  ? "bg-[#E8F0FE] text-[#174EA6]"
                  : "text-slate-500 hover:bg-slate-100",
              )}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            statusFilter === "drafts"
              ? "No drafts"
              : "No matching announcements"
          }
          description={
            statusFilter === "drafts"
              ? "Drafts aren’t stored yet. Publish a communique to see it here."
              : "Try a different search or clear the filter."
          }
        />
      ) : (
        <ul
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-4",
          )}
        >
          {filtered.map((item) => (
            <AnnouncementCard
              key={item.id}
              item={item}
              audience={describeAnnouncementAudience(item, businessUnits)}
              viewMode={viewMode}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
