"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  FileText,
  Megaphone,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DEMO_NOTIFICATIONS } from "@/lib/notifications/demo";
import type {
  NotificationItem,
  NotificationKind,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread";

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}min ago`;

  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24 && startOfLocalDay(date) === startOfLocalDay(now)) {
    return `${diffHours}h ago`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (startOfLocalDay(date) === startOfLocalDay(yesterday)) {
    return `Yesterday, ${date.toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayGroup(iso: string): "Today" | "Yesterday" | "Earlier" {
  const date = new Date(iso);
  const now = new Date();
  const day = startOfLocalDay(date);
  if (day === startOfLocalDay(now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day === startOfLocalDay(yesterday)) return "Yesterday";
  return "Earlier";
}

function SystemIcon({ kind }: { kind: NotificationKind }) {
  const Icon =
    kind === "leave_request" || kind === "leave_decision"
      ? CalendarDays
      : kind === "performance_review"
        ? ClipboardList
        : kind === "document"
          ? FileText
          : kind === "announcement"
            ? Megaphone
            : Bell;

  return (
    <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#EEF2F7] text-[#667085]">
      <Icon className="size-4" strokeWidth={1.75} />
    </div>
  );
}

function NotificationRow({
  item,
  onMarkRead,
  onResolve,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onResolve: (id: string, action: "approve" | "decline") => void;
}) {
  return (
    <div
      className={cn(
        "border-b border-[#E3E8EF] px-4 py-3.5 last:border-b-0",
        item.unread && "bg-[color-mix(in_srgb,var(--accent-blue)_4%,white)]",
      )}
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          {item.actor ? (
            <UserAvatar
              name={item.actor.name}
              src={item.actor.avatarUrl}
              gender={item.actor.gender}
              className="size-9 rounded-[10px] after:rounded-[10px] [&_img]:rounded-[10px]"
            />
          ) : (
            <SystemIcon kind={item.kind} />
          )}
          {item.unread ? (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#F6B93B] ring-2 ring-white" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug text-[#171717]">
            {item.subject ? (
              <>
                <span className="font-semibold">{item.subject}</span>{" "}
              </>
            ) : null}
            <span className="text-[#344054]">{item.body}</span>
          </p>
          <p className="mt-1 text-[12px] text-[#98A2B3]">
            {formatRelativeTime(item.createdAt)}
          </p>

          {item.actions && item.actions.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {item.actions.includes("approve") ? (
                <Button
                  size="sm"
                  className="h-8 px-3.5"
                  onClick={() => {
                    onResolve(item.id, "approve");
                    onMarkRead(item.id);
                  }}
                >
                  Approve
                </Button>
              ) : null}
              {item.actions.includes("decline") ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-[#E3E8EF] bg-white px-3.5 text-[#344054] hover:bg-[#F5F7FB]"
                  onClick={() => {
                    onResolve(item.id, "decline");
                    onMarkRead(item.id);
                  }}
                >
                  Decline
                </Button>
              ) : null}
            </div>
          ) : item.href ? (
            <Link
              href={item.href}
              onClick={() => onMarkRead(item.id)}
              className="mt-2 inline-block text-[12px] font-medium text-accent-blue hover:underline"
            >
              View
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState(DEMO_NOTIFICATIONS);

  const unreadCount = items.filter((item) => item.unread).length;

  const visible = useMemo(() => {
    const list = filter === "unread" ? items.filter((i) => i.unread) : items;
    return list;
  }, [filter, items]);

  const groups = useMemo(() => {
    const order: Array<"Today" | "Yesterday" | "Earlier"> = [
      "Today",
      "Yesterday",
      "Earlier",
    ];
    const map = new Map<string, NotificationItem[]>();
    for (const item of visible) {
      const key = dayGroup(item.createdAt);
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return order
      .filter((key) => (map.get(key)?.length ?? 0) > 0)
      .map((key) => ({ key, items: map.get(key) ?? [] }));
  }, [visible]);

  function markAllRead() {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
  }

  function markRead(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, unread: false } : item,
      ),
    );
  }

  function resolve(id: string, _action: "approve" | "decline") {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, unread: false, actions: undefined }
          : item,
      ),
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative text-[#667085] hover:bg-[#EEF2F7] hover:text-[#171717]"
            aria-label="Notifications"
          />
        }
      >
        <Bell className="size-4" strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent-blue" />
        ) : null}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-1.5rem,420px)] gap-0 overflow-hidden rounded-xl p-0 shadow-[0_12px_40px_rgba(16,24,40,0.12)] ring-1 ring-[#E3E8EF]"
      >
        <div className="flex items-center justify-between border-b border-[#E3E8EF] px-4 py-3.5">
          <h2 className="text-base font-semibold tracking-tight text-[#171717]">
            Notifications
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-[#98A2B3] transition-colors hover:bg-[#EEF2F7] hover:text-[#344054]"
            aria-label="Close notifications"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-[#E3E8EF] px-4 py-2.5">
          <div className="flex items-center gap-1">
            {(
              [
                { id: "all", label: "All" },
                { id: "unread", label: "Unread" },
              ] as const
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-[#EEF2F7] text-[#171717]"
                      : "text-[#667085] hover:bg-[#F5F7FB] hover:text-[#344054]",
                  )}
                >
                  {tab.label}
                  {tab.id === "unread" && unreadCount > 0 ? (
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#667085] ring-1 ring-[#E3E8EF]">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 gap-1.5 px-2 text-[12px] text-[#667085] hover:text-[#171717] disabled:opacity-40",
            )}
          >
            <CheckCheck className="size-3.5" />
            Mark all as read
          </button>
        </div>

        <div className="max-h-[min(70vh,520px)] overflow-y-auto">
          {groups.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[#98A2B3]">
              You&apos;re all caught up.
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.key}>
                <p className="sticky top-0 z-10 bg-[#FBFCFE] px-4 py-2 text-[11px] font-medium tracking-wide text-[#98A2B3] uppercase">
                  {group.key}
                </p>
                {group.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onMarkRead={markRead}
                    onResolve={resolve}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
