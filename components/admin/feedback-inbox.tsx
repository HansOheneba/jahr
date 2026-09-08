"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncAction } from "@/lib/hooks/use-async-action";
import { updateSupportRequestStatus } from "@/lib/support/actions";
import {
  SUPPORT_REQUEST_STATUSES,
  isSupportRequestStatus,
  supportRequestKindLabel,
  supportRequestStatusLabel,
  type SupportRequest,
  type SupportRequestKind,
  type SupportRequestStatus,
} from "@/lib/support/types";
import { cn } from "@/lib/utils";

const STATUS_BADGE_CLASSES: Record<SupportRequestStatus, string> = {
  new: "border-transparent bg-[color-mix(in_srgb,#0070F3_12%,white)] text-[#0B4FBF]",
  in_review:
    "border-transparent bg-[color-mix(in_srgb,#F6B93B_20%,white)] text-[#8A5B00]",
  done: "border-transparent bg-success/10 text-success",
  declined: "border-transparent bg-secondary text-muted-foreground",
};

const STATUS_ITEMS = SUPPORT_REQUEST_STATUSES.map((status) => ({
  value: status.id,
  label: status.label,
}));

type KindFilter = "all" | SupportRequestKind;
type StatusFilter = "all" | SupportRequestStatus;

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "idea", label: "Ideas" },
  { id: "help", label: "Bug reports" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All statuses" },
  ...SUPPORT_REQUEST_STATUSES.map((status) => ({
    id: status.id as StatusFilter,
    label: status.label,
  })),
];

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-[color-mix(in_srgb,#0070F3_9%,white)] text-[#0B4FBF]"
          : "border-border bg-background text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded px-1 py-0.5 text-[10px] tabular-nums",
          active ? "bg-white/60" : "bg-secondary",
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function FeedbackInbox({ requests }: { requests: SupportRequest[] }) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kindCounts = useMemo(() => {
    const counts = { all: requests.length, idea: 0, help: 0 };
    for (const request of requests) {
      counts[request.kind] += 1;
    }
    return counts;
  }, [requests]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: requests.length,
      new: 0,
      in_review: 0,
      done: 0,
      declined: 0,
    };
    for (const request of requests) {
      counts[request.status] += 1;
    }
    return counts;
  }, [requests]);

  const filtered = useMemo(
    () =>
      requests.filter((request) => {
        if (kindFilter !== "all" && request.kind !== kindFilter) return false;
        if (statusFilter !== "all" && request.status !== statusFilter) {
          return false;
        }
        return true;
      }),
    [requests, kindFilter, statusFilter],
  );

  function changeStatus(requestId: string, status: SupportRequestStatus) {
    setSavingId(requestId);

    void run(async () => {
      try {
        const result = await updateSupportRequestStatus({ requestId, status });
        setError(result.error ?? null);
        if (!result.error) router.refresh();
      } finally {
        setSavingId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {KIND_FILTERS.map((filter) => (
            <FilterChip
              key={filter.id}
              active={kindFilter === filter.id}
              label={filter.label}
              count={kindCounts[filter.id]}
              onClick={() => setKindFilter(filter.id)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <FilterChip
              key={filter.id}
              active={statusFilter === filter.id}
              label={filter.label}
              count={statusCounts[filter.id]}
              onClick={() => setStatusFilter(filter.id)}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2 pt-(--card-spacing)">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {filtered.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {requests.length === 0
                ? "No feedback yet."
                : "No requests match these filters."}
            </p>
          ) : (
            filtered.map((request) => (
              <div
                key={request.id}
                className="space-y-2 rounded-md border border-border px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">
                      {request.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        supportRequestKindLabel(request.kind),
                        request.submitter?.name,
                        format(new Date(request.createdAt), "d MMM yyyy"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 rounded-md",
                      STATUS_BADGE_CLASSES[request.status],
                    )}
                  >
                    {supportRequestStatusLabel(request.status)}
                  </Badge>
                </div>

                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {request.details}
                </p>

                {request.reviewer && request.reviewedAt ? (
                  <p className="text-[11px] text-muted-foreground">
                    Updated by {request.reviewer.name} on{" "}
                    {format(new Date(request.reviewedAt), "d MMM yyyy")}
                  </p>
                ) : null}

                <Select
                  value={request.status}
                  onValueChange={(value) => {
                    if (
                      typeof value === "string" &&
                      isSupportRequestStatus(value) &&
                      value !== request.status
                    ) {
                      changeStatus(request.id, value);
                    }
                  }}
                  disabled={pending && savingId === request.id}
                  items={STATUS_ITEMS}
                >
                  <SelectTrigger size="sm" className="w-40 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} align="start">
                    {SUPPORT_REQUEST_STATUSES.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
