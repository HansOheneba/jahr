"use client";

import { Download, FileText, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  AnnouncementAttachmentSummary,
  PendingAttachment,
} from "@/lib/communications/types";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word")) return "Word";
  if (mimeType.startsWith("image/")) return "Image";
  return mimeType.split("/").pop()?.toUpperCase() ?? "File";
}

function iconTone(mimeType: string): {
  wrap: string;
  icon: typeof FileText;
} {
  if (mimeType.startsWith("image/")) {
    return { wrap: "bg-[#E8F0FE] text-[#174EA6]", icon: ImageIcon };
  }
  if (mimeType === "application/pdf") {
    return { wrap: "bg-red-50 text-red-700", icon: FileText };
  }
  if (mimeType.includes("word")) {
    return { wrap: "bg-[#E8F0FE] text-[#174EA6]", icon: FileText };
  }
  return { wrap: "bg-slate-100 text-slate-600", icon: FileText };
}

type AttachmentItem =
  | {
      kind: "pending";
      id: string;
      fileName: string;
      mimeType: string;
      byteSize: number;
    }
  | {
      kind: "saved";
      id: string;
      fileName: string;
      mimeType: string;
      byteSize: number;
      href?: string;
    };

interface AttachmentListProps {
  pending?: PendingAttachment[];
  saved?: AnnouncementAttachmentSummary[];
  onRemovePending?: (id: string) => void;
  className?: string;
}

export function AttachmentList({
  pending = [],
  saved = [],
  onRemovePending,
  className,
}: AttachmentListProps) {
  const items: AttachmentItem[] = [
    ...pending.map((file) => ({
      kind: "pending" as const,
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      byteSize: file.byteSize,
    })),
    ...saved.map((file) => ({
      kind: "saved" as const,
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      byteSize: file.byteSize,
      href: `/api/announcement-attachments/${file.id}`,
    })),
  ];

  if (items.length === 0) return null;

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {items.map((item) => {
        const tone = iconTone(item.mimeType);
        const Icon = tone.icon;

        const body = (
          <>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                tone.wrap,
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-slate-800">
                {item.fileName}
              </span>
              <span className="block text-[11px] text-slate-500 tabular-nums">
                {mimeLabel(item.mimeType)} · {formatBytes(item.byteSize)}
              </span>
            </span>
          </>
        );

        return (
          <li key={`${item.kind}-${item.id}`}>
            {item.kind === "saved" && item.href ? (
              <a
                href={item.href}
                className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-[#F8F9FA] p-2.5 transition-[background-color] duration-150 ease-out hover:bg-slate-100/80"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  {body}
                </span>
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-[background-color,color] duration-150 ease-out group-hover:bg-white group-hover:text-slate-700"
                  aria-hidden
                >
                  <Download className="size-3.5" />
                </span>
              </a>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-[#F8F9FA] p-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {body}
                </div>
                {item.kind === "pending" && onRemovePending ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.fileName}`}
                    onClick={() => onRemovePending(item.id)}
                    className="size-8 shrink-0 rounded-full text-slate-500 hover:bg-white hover:text-slate-800"
                  >
                    <X />
                  </Button>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
