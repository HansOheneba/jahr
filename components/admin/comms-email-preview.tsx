"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { previewAnnouncementEmail } from "@/lib/announcements/actions";
import type { AnnouncementType } from "@/lib/announcements/categories";
import { sanitizeTipTapJson } from "@/lib/communications/tiptap-links";
import type { JSONContent } from "@/lib/communications/types";

export interface CommsEmailPreviewDraft {
  title: string;
  announcementType: AnnouncementType;
  bodyJson: JSONContent;
  attachmentNames: string[];
}

/** Debounce keeps typing from firing a render request per keystroke. */
const PREVIEW_DEBOUNCE_MS = 500;

export function CommsEmailPreview({
  draft,
  disabled,
}: {
  draft: CommsEmailPreviewDraft;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The draft object is rebuilt on every parent render, so changes are tracked
  // by value and the latest draft is read from a ref inside the effect.
  const draftSignature = useMemo(() => JSON.stringify(draft), [draft]);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await previewAnnouncementEmail({
          ...draftRef.current,
          bodyJson: sanitizeTipTapJson(draftRef.current.bodyJson),
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setError(null);
        setHtml(result.html ?? null);
      });
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [open, draftSignature]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button type="button" variant="outline" disabled={disabled}>
            <Mail />
            Preview email
          </Button>
        }
      />
      <SheetContent className="w-full gap-0 sm:max-w-170">
        <SheetHeader className="border-b p-4 pr-14">
          <SheetTitle>Email preview</SheetTitle>
          <SheetDescription>
            The message as recipients will see it in their inbox.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-hidden bg-muted">
          {error ? (
            <p className="p-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : html && !pending ? (
            <iframe
              title="Email preview"
              srcDoc={html}
              // Scripts stay blocked; popups are allowed so the links in the
              // message are clickable from the preview.
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              className="size-full border-0"
            />
          ) : (
            <div className="space-y-3 p-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
