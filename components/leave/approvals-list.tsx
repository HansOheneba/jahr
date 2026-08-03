"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { respondToLeaveRequest } from "@/lib/leave/actions";
import {
  LEAVE_TYPES,
  type ApprovalQueueRecord,
  type LeaveDecisionLog,
  type TeamLeaveBalance,
} from "@/lib/leave/types";
import {
  WORKDAY_HOURS,
  formatLeaveDate,
  formatLeaveDateRange,
} from "@/lib/leave/working-days";
import { cn } from "@/lib/utils";

type TabId = "open" | "closed";

function typeLabel(type: ApprovalQueueRecord["type"]): string {
  return LEAVE_TYPES.find((option) => option.id === type)?.label ?? type;
}

function statusBadge(status: ApprovalQueueRecord["status"]) {
  if (status === "pending") {
    return {
      label: "Submitted",
      className: "border-transparent bg-[#0070F3]/10 text-[#0B4FBF]",
    };
  }
  if (status === "approved") {
    return {
      label: "Approved",
      className: "border-transparent bg-success/10 text-success",
    };
  }
  return {
    label: "Declined",
    className: "border-transparent bg-destructive/10 text-destructive",
  };
}

function matchesSearch(row: ApprovalQueueRecord, query: string): boolean {
  if (!query) return true;
  const haystack = [
    row.reference,
    row.employeeName,
    row.employeeJobTitle ?? "",
    typeLabel(row.type),
    row.notes,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function ApprovalsList({
  open,
  closed,
  teamBalances,
  logs,
}: {
  open: ApprovalQueueRecord[];
  closed: ApprovalQueueRecord[];
  teamBalances: TeamLeaveBalance[];
  logs: LeaveDecisionLog[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("open");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineNotes, setDeclineNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const rows = tab === "open" ? open : closed;
  const normalizedQuery = query.trim().toLowerCase();
  const visible = useMemo(
    () => rows.filter((row) => matchesSearch(row, normalizedQuery)),
    [rows, normalizedQuery],
  );

  function respond(requestId: string, approved: boolean, managerNotes?: string) {
    setError(null);
    setBusyId(requestId);
    startTransition(async () => {
      const result = await respondToLeaveRequest({
        requestId,
        approved,
        managerNotes,
      });
      setBusyId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      setDecliningId(null);
      setDeclineNotes("");
      setExpandedId(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {teamBalances.length > 0 ? (
        <section className="space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-medium">Team leave availability</h2>
            <p className="text-xs text-muted-foreground">
              Annual leave remaining for people who report to you ({WORKDAY_HOURS}
              h workdays).
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {teamBalances.map((person) => (
              <div
                key={person.employeeId}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3"
              >
                <UserAvatar
                  name={person.name}
                  src={person.avatarUrl}
                  gender={person.gender}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.jobTitle ?? "Team member"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">
                    {person.remaining}
                    <span className="text-xs font-normal text-muted-foreground">
                      /{person.entitlement}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {person.pending > 0
                      ? `${person.pending} pending`
                      : `${person.used} used`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1">
            {(
              [
                { id: "open", label: "Open applications", count: open.length },
                {
                  id: "closed",
                  label: "Closed applications",
                  count: closed.length,
                },
              ] as const
            ).map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setExpandedId(null);
                    setDecliningId(null);
                  }}
                  className={cn(
                    "relative -mb-px px-3 py-2 text-sm transition-colors",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                  <span className="ml-1.5 tabular-nums text-xs text-muted-foreground">
                    {item.count}
                  </span>
                  {active ? (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#0070F3]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, ref, or type"
              className="h-9 pl-9"
            />
          </div>
        </div>

        {error ? (
          <p className="border-b border-border px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="hidden grid-cols-[6.5rem_minmax(0,1.4fr)_7rem_minmax(0,1.3fr)_4rem_4.5rem_6.5rem_6.5rem_6.5rem] gap-3 border-b border-border px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase lg:grid">
          <span>Ref</span>
          <span>Employee</span>
          <span>Type</span>
          <span>Dates</span>
          <span>Days</span>
          <span>Hours</span>
          <span>Req. date</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {tab === "open"
              ? "No open leave applications."
              : "No closed applications yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((row) => {
              const badge = statusBadge(row.status);
              const isBusy = busyId === row.id;
              const isExpanded = expandedId === row.id;
              const isDeclining = decliningId === row.id;
              const dateRange = formatLeaveDateRange(
                parseISO(row.startDate),
                parseISO(row.endDate),
              );

              return (
                <li key={row.id} className="px-4 py-3.5">
                  <div className="grid gap-3 lg:grid-cols-[6.5rem_minmax(0,1.4fr)_7rem_minmax(0,1.3fr)_4rem_4.5rem_6.5rem_6.5rem_6.5rem] lg:items-center">
                    <p className="font-mono text-xs text-muted-foreground">
                      {row.reference}
                    </p>

                    <div className="min-w-0">
                      <Link
                        href={`/admin/employees/${row.employeeId}`}
                        className="truncate text-sm font-medium text-[#0B4FBF] hover:underline"
                      >
                        {row.employeeName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.employeeJobTitle ?? "Team member"}
                        {row.annualRemaining !== null
                          ? ` · ${row.annualRemaining} days left`
                          : ""}
                      </p>
                    </div>

                    <p className="text-sm">{typeLabel(row.type)}</p>

                    <div className="min-w-0">
                      <p className="text-sm">{dateRange}</p>
                      <p className="text-xs text-muted-foreground lg:hidden">
                        {row.workingDays} day
                        {row.workingDays === 1 ? "" : "s"} · {row.workingHours}h
                      </p>
                    </div>

                    <p className="hidden text-sm tabular-nums lg:block">
                      {row.workingDays}
                    </p>
                    <p className="hidden text-sm tabular-nums lg:block">
                      {row.workingHours.toFixed(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(row.submittedAt), "d MMM yyyy")}
                    </p>

                    <div>
                      <Badge
                        variant="outline"
                        className={cn("rounded-md font-normal", badge.className)}
                      >
                        {badge.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      {row.status === "pending" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "gap-1",
                            )}
                            disabled={isBusy}
                          >
                            {isBusy ? <Spinner className="size-3.5" /> : null}
                            Action
                            <ChevronDown className="size-3.5 opacity-70" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="min-w-40">
                            <DropdownMenuItem
                              onClick={() => respond(row.id, true)}
                            >
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setExpandedId(row.id);
                                setDecliningId(row.id);
                              }}
                            >
                              Decline
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setExpandedId((current) =>
                                  current === row.id ? null : row.id,
                                )
                              }
                            >
                              View details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedId((current) =>
                              current === row.id ? null : row.id,
                            )
                          }
                        >
                          Details
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-3 space-y-3 rounded-md border border-border bg-secondary/30 px-3 py-3">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Start</p>
                          <p className="text-sm font-medium">
                            {formatLeaveDate(parseISO(row.startDate))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">End</p>
                          <p className="text-sm font-medium">
                            {formatLeaveDate(parseISO(row.endDate))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Working time
                          </p>
                          <p className="text-sm font-medium">
                            {row.workingDays} day
                            {row.workingDays === 1 ? "" : "s"} ·{" "}
                            {row.workingHours}h (9–5)
                          </p>
                        </div>
                        {row.annualRemaining !== null ? (
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Annual leave left
                            </p>
                            <p className="text-sm font-medium">
                              {row.annualRemaining} of {row.annualEntitlement}
                              {row.annualPending
                                ? ` · ${row.annualPending} pending`
                                : ""}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {row.notes ? (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Employee note
                          </p>
                          <p className="mt-1 text-sm">{row.notes}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No note from the employee.
                        </p>
                      )}

                      {row.managerNotes ? (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Manager note
                          </p>
                          <p className="mt-1 text-sm">{row.managerNotes}</p>
                        </div>
                      ) : null}

                      {isDeclining ? (
                        <div className="space-y-2">
                          <Textarea
                            value={declineNotes}
                            onChange={(event) =>
                              setDeclineNotes(event.target.value)
                            }
                            placeholder="Reason for declining (optional)"
                            className="min-h-20"
                            disabled={isBusy}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={isBusy}
                              onClick={() =>
                                respond(row.id, false, declineNotes)
                              }
                            >
                              {isBusy ? <Spinner className="mr-1 size-3.5" /> : null}
                              Confirm decline
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => {
                                setDecliningId(null);
                                setDeclineNotes("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Showing {visible.length} of {rows.length}{" "}
          {rows.length === 1 ? "application" : "applications"} · {WORKDAY_HOURS}h
          per working day
        </div>
      </div>

      {logs.length > 0 ? (
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Decision log</h2>
            <p className="text-xs text-muted-foreground">
              Recent approvals and declines for your team.
            </p>
          </div>
          <ul className="divide-y divide-border">
            {logs.map((entry) => {
              const badge = statusBadge(entry.status);
              return (
                <li
                  key={entry.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm">
                      <span className="font-medium">{entry.employeeName}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {typeLabel(entry.type)} · {entry.reference}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatLeaveDateRange(
                        parseISO(entry.startDate),
                        parseISO(entry.endDate),
                      )}{" "}
                      · {entry.workingDays}d / {entry.workingHours}h
                      {entry.managerNotes
                        ? ` · “${entry.managerNotes}”`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("rounded-md font-normal", badge.className)}
                    >
                      {badge.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(entry.decidedAt), "d MMM yyyy HH:mm")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
