"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SupportRequestForm } from "@/components/support/support-request-form";
import { SupportRequestList } from "@/components/support/support-request-list";
import type { SupportRequest } from "@/lib/support/types";

interface SupportPageViewProps {
  requests: SupportRequest[];
}

export function SupportPageView({ requests }: SupportPageViewProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  function openSheet() {
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
  }

  function handleSubmitted() {
    closeSheet();
    router.refresh();
  }

  return (
    <>
      <div className="flex w-full flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-medium tracking-tight">
              Ideas and feedback
            </h1>
            <p className="text-sm text-muted-foreground">
              Your suggestions and bug reports.
            </p>
          </div>
          <Button type="button" onClick={openSheet}>
            <Plus className="size-4" />
            Add request
          </Button>
        </div>

        <SupportRequestList requests={requests} onAddRequest={openSheet} />
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add request</SheetTitle>
            <SheetDescription>
              Suggest an idea or report a bug in the portal.
            </SheetDescription>
          </SheetHeader>
          <SupportRequestForm
            onSubmitted={handleSubmitted}
            onCancel={closeSheet}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
