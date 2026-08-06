"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  eachDayOfInterval,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { submitLeaveRequest } from "@/lib/leave/actions";
import { HOLIDAY_COLOR, LEAVE_TYPE_COLORS } from "@/lib/leave/colors";
import { getHolidayMap } from "@/lib/leave/ghana-holidays";
import type { ScheduleLeaveEntry } from "@/lib/leave/get-schedule";
import {
  LEAVE_TYPES,
  type LeaveBalanceSummary,
  type LeaveRequestDraft,
  type LeaveTypeId,
} from "@/lib/leave/types";
import {
  WORKDAY_HOURS,
  countWorkingDays,
  formatLeaveDate,
  formatLeaveDateRange,
  formatLeaveDateKey,
  isWeekend,
  workingHoursFromDays,
} from "@/lib/leave/working-days";
import { cn } from "@/lib/utils";

interface LeaveRequestFormProps {
  balance: LeaveBalanceSummary;
  initialRequests: LeaveRequestDraft[];
  schedule: ScheduleLeaveEntry[];
  canViewTeam: boolean;
  viewerId: string;
  /** False when the viewer has no manager — leave is approved on submit. */
  requiresApproval: boolean;
}

function entryCoversDay(entry: ScheduleLeaveEntry, day: Date): boolean {
  const start = startOfDay(parseISO(entry.startDate));
  const end = startOfDay(parseISO(entry.endDate));
  return isWithinInterval(startOfDay(day), { start, end });
}

export function LeaveRequestForm({
  balance,
  initialRequests,
  schedule,
  canViewTeam,
  viewerId,
  requiresApproval,
}: LeaveRequestFormProps) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | undefined>();
  const [leaveType, setLeaveType] = useState<LeaveTypeId>("annual");
  const [notes, setNotes] = useState("");
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const requests = initialRequests;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = startOfDay(new Date());
  const selectedType =
    LEAVE_TYPES.find((type) => type.id === leaveType) ?? LEAVE_TYPES[0];

  const holidayMap = useMemo(() => {
    const year = month.getFullYear();
    return getHolidayMap([year - 1, year, year + 1]);
  }, [month]);

  const visibleSchedule = useMemo(
    () =>
      schedule.filter(
        (entry) => canViewTeam || entry.person.id === viewerId,
      ),
    [canViewTeam, schedule, viewerId],
  );

  const typesByDay = useMemo(() => {
    const map = new Map<string, LeaveTypeId[]>();
    for (const entry of visibleSchedule) {
      const days = eachDayOfInterval({
        start: parseISO(entry.startDate),
        end: parseISO(entry.endDate),
      });
      for (const day of days) {
        const key = formatLeaveDateKey(day);
        const list = map.get(key) ?? [];
        if (!list.includes(entry.type)) list.push(entry.type);
        map.set(key, list);
      }
    }
    return map;
  }, [visibleSchedule]);

  const focusDay = range?.to ?? range?.from ?? today;

  const dayGroups = useMemo(() => {
    const groups = new Map<LeaveTypeId, ScheduleLeaveEntry[]>();
    for (const entry of visibleSchedule) {
      if (!entryCoversDay(entry, focusDay)) continue;
      const list = groups.get(entry.type) ?? [];
      list.push(entry);
      groups.set(entry.type, list);
    }
    return LEAVE_TYPES.map((type) => ({
      type: type.id,
      entries: groups.get(type.id) ?? [],
    })).filter((group) => group.entries.length > 0);
  }, [focusDay, visibleSchedule]);

  const workingDays =
    range?.from && range?.to ? countWorkingDays(range.from, range.to) : 0;

  const pendingDays = requests
    .filter(
      (request) => request.status === "pending" && request.type === "annual",
    )
    .reduce((sum, request) => sum + request.workingDays, 0);

  const remainingAfterRequest =
    balance.remaining -
    pendingDays -
    (selectedType.deductsBalance ? workingDays : 0);

  const canSubmit =
    Boolean(range?.from && range?.to) &&
    workingDays > 0 &&
    (!selectedType.deductsBalance || remainingAfterRequest >= 0);

  function handleSelect(next: DateRange | undefined) {
    setError(null);
    setSuccess(null);
    setRange(next);
  }

  function clearSelection() {
    setRange(undefined);
    setNotes("");
    setError(null);
    setSuccess(null);
  }

  function submitRequest() {
    if (!range?.from || !range?.to) {
      setError("Select a start and end date on the calendar.");
      return;
    }

    if (workingDays <= 0) {
      setError("Selected range has no working days.");
      return;
    }

    if (selectedType.deductsBalance && remainingAfterRequest < 0) {
      setError(
        `Not enough annual leave. You have ${balance.remaining - pendingDays} days available.`,
      );
      return;
    }

    const startDate = formatLeaveDateKey(range.from!);
    const endDate = formatLeaveDateKey(range.to!);

    startTransition(async () => {
      const result = await submitLeaveRequest({
        type: leaveType,
        startDate,
        endDate,
        notes: notes.trim(),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(
        result.autoApproved
          ? `Leave noted for ${result.days} working day${result.days === 1 ? "" : "s"} - recorded on the calendar (no manager approval needed).`
          : `Leave request submitted for ${result.days} working day${result.days === 1 ? "" : "s"}. Your manager has been emailed and you will get another email when it is decided.`,
      );
      setRange(undefined);
      setNotes("");
      router.refresh();
    });
  }

  return (
    <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">
              Select dates
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Click a start day, then an end day. Weekends and Ghana public
              holidays are skipped in the day count.
            </p>
          </div>
          <Badge variant="outline" className="rounded-md font-normal">
            <CalendarDays />
            Calendar
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {LEAVE_TYPES.map((type) => {
              const colors = LEAVE_TYPE_COLORS[type.id];
              return (
                <span
                  key={type.id}
                  className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                  style={{
                    backgroundColor: colors.soft,
                    color: colors.text,
                  }}
                >
                  {colors.label}
                </span>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <Calendar
              mode="range"
              numberOfMonths={2}
              pagedNavigation
              month={month}
              onMonthChange={setMonth}
              selected={range}
              onSelect={handleSelect}
              disabled={{ before: today }}
              showOutsideDays={false}
              className="mx-auto w-full max-w-3xl [--cell-size:--spacing(10)] p-0 md:max-w-none md:[--cell-size:--spacing(11)]"
              modifiers={{
                weekend: (date) => isWeekend(date),
                holiday: (date) =>
                  holidayMap.has(format(date, "yyyy-MM-dd")),
              }}
              modifiersClassNames={{
                weekend: "text-muted-foreground/70",
                holiday:
                  "text-muted-foreground underline decoration-dotted decoration-muted-foreground/60",
              }}
              classNames={{
                months:
                  "relative flex w-full flex-col gap-6 md:flex-row md:gap-8",
                nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between",
                button_previous: cn(
                  buttonVariants({ variant: "outline", size: "icon-sm" }),
                  "shadow-none",
                ),
                button_next: cn(
                  buttonVariants({ variant: "outline", size: "icon-sm" }),
                  "shadow-none",
                ),
                month_caption:
                  "flex h-(--cell-size) w-full items-center justify-center px-10",
                month_grid: "w-full",
                weekdays: "flex w-full",
                weekday: "flex-1 text-xs",
                week: "mt-1 flex w-full",
                day: "aspect-square w-full",
                range_middle:
                  "rounded-none bg-[color-mix(in_srgb,var(--primary)_10%,white)]",
                range_start:
                  "bg-[color-mix(in_srgb,var(--primary)_10%,white)] after:bg-[color-mix(in_srgb,var(--primary)_10%,white)]",
                range_end:
                  "bg-[color-mix(in_srgb,var(--primary)_10%,white)] after:bg-[color-mix(in_srgb,var(--primary)_10%,white)]",
              }}
              components={{
                DayButton: ({ day, modifiers, ...props }) => {
                  const key = formatLeaveDateKey(day.date);
                  const types = typesByDay.get(key) ?? [];
                  const isHoliday = holidayMap.has(key);

                  return (
                    <CalendarDayButton
                      day={day}
                      modifiers={modifiers}
                      {...props}
                      className="flex-col gap-1"
                    >
                      <span>{day.date.getDate()}</span>
                      <span className="flex h-1.5 items-center justify-center gap-0.5">
                        {types.slice(0, 3).map((type) => (
                          <span
                            key={type}
                            className="h-1 w-2.5 rounded-sm"
                            style={{
                              backgroundColor: LEAVE_TYPE_COLORS[type].dash,
                            }}
                          />
                        ))}
                        {isHoliday && types.length === 0 ? (
                          <span
                            className="h-1 w-2.5 rounded-sm"
                            style={{ backgroundColor: HOLIDAY_COLOR.dash }}
                          />
                        ) : null}
                      </span>
                    </CalendarDayButton>
                  );
                },
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Legend swatch="bg-primary" label="Selected ends" />
            <Legend
              swatch="bg-[color-mix(in_srgb,var(--primary)_18%,white)]"
              label="In range"
            />
            <Legend
              swatch="bg-transparent underline decoration-dotted"
              label="Public holiday"
            />
            <span>Coloured dashes = leave on that day</span>
          </div>

          {canViewTeam ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-3 text-sm font-medium">
                Who’s out · {format(focusDay, "EEE d MMM")}
              </p>
              {dayGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nobody on leave for this day.
                </p>
              ) : (
                <div className="space-y-3">
                  {dayGroups.map((group) => {
                    const colors = LEAVE_TYPE_COLORS[group.type];
                    const people = uniquePeople(group.entries);
                    return (
                      <div key={group.type} className="flex gap-3">
                        <div
                          className="mt-1 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: colors.rail }}
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <p
                            className="text-sm font-medium"
                            style={{ color: colors.text }}
                          >
                            {colors.label}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {people.map((person) => (
                              <div
                                key={person.id}
                                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5"
                                style={{ backgroundColor: colors.soft }}
                              >
                                <UserAvatar
                                  name={person.name}
                                  gender={person.gender}
                                  src={person.avatarUrl}
                                  size="sm"
                                />
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: colors.text }}
                                >
                                  {person.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="grid grid-cols-3 divide-x divide-border pt-(--card-spacing)">
            <BalanceStat label="Entitlement" value={`${balance.entitlement}d`} />
            <BalanceStat
              label="Used / pending"
              value={`${balance.used}d / ${balance.pending + pendingDays}d`}
            />
            <BalanceStat
              label="Remaining"
              value={`${Math.max(balance.remaining - pendingDays, 0)}d`}
              emphasize
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Request details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leave-type">Leave type</Label>
              <Select
                value={leaveType}
                onValueChange={(value) => {
                  if (value) {
                    setLeaveType(value as LeaveTypeId);
                    setError(null);
                    setSuccess(null);
                  }
                }}
                items={LEAVE_TYPES.map((type) => ({
                  value: type.id,
                  label: type.label,
                }))}
              >
                <SelectTrigger
                  id="leave-type"
                  className="h-10 w-full rounded-md"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  {LEAVE_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-2 rounded-sm"
                          style={{
                            backgroundColor: LEAVE_TYPE_COLORS[type.id].dash,
                          }}
                        />
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedType.description}
              </p>
            </div>

            <div className="rounded-md border border-border bg-secondary/40 px-3 py-3 text-sm">
              {range?.from && range?.to ? (
                <div className="space-y-1">
                  <p className="font-medium">
                    {formatLeaveDateRange(range.from, range.to)}
                  </p>
                  <p className="text-muted-foreground">
                    {workingDays} working day{workingDays === 1 ? "" : "s"} ·{" "}
                    {workingHoursFromDays(workingDays)}h ({WORKDAY_HOURS}h / day)
                    {selectedType.deductsBalance
                      ? ` · ${remainingAfterRequest} annual left after request`
                      : " · does not deduct annual balance"}
                  </p>
                </div>
              ) : range?.from ? (
                <p className="text-muted-foreground">
                  Start: {formatLeaveDate(range.from)}. Pick an end date.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  No dates selected yet.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="leave-notes">
                {requiresApproval ? "Note for your manager" : "Notes"}
              </Label>
              <Textarea
                id="leave-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional context for the approval"
                className="min-h-24 rounded-md"
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {success ? (
              <p
                className="flex items-start gap-2 text-sm text-success"
                role="status"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                {success}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={submitRequest}
                disabled={!canSubmit || pending}
              >
                {pending ? <Spinner className="mr-1" /> : null}
                {requiresApproval ? "Submit request" : "Record leave"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearSelection}
                disabled={pending}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Your requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No leave requests yet.
              </p>
            ) : (
              requests.map((request) => {
                const colors = LEAVE_TYPE_COLORS[request.type];
                return (
                  <div
                    key={request.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5"
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: colors.dash,
                    }}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: colors.text }}
                      >
                        {colors.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.startDate), "d MMM")} –{" "}
                        {format(new Date(request.endDate), "d MMM yyyy")} ·{" "}
                        {request.workingDays}d
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md capitalize",
                        request.status === "pending" &&
                          "border-transparent bg-[color-mix(in_srgb,var(--primary)_12%,white)] text-primary",
                        request.status === "approved" &&
                          "border-transparent bg-success/10 text-success",
                        request.status === "rejected" &&
                          "border-transparent bg-destructive/10 text-destructive",
                      )}
                    >
                      {request.status}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function uniquePeople(entries: ScheduleLeaveEntry[]) {
  const map = new Map<string, ScheduleLeaveEntry["person"]>();
  for (const entry of entries) {
    map.set(entry.person.id, entry.person);
  }
  return [...map.values()];
}

function BalanceStat({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="space-y-1 px-4 first:pl-0 last:pr-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-xl font-medium tracking-tight",
          emphasize && "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm border border-border", swatch)} />
      {label}
    </span>
  );
}
