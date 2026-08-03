import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { parseISO } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Gift,
  Laptop,
  PartyPopper,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { LEAVE_TYPES } from "@/lib/leave/types";
import {
  formatLeaveDateRange,
  workingHoursFromDays,
} from "@/lib/leave/working-days";
import { cn } from "@/lib/utils";

const LEAVE = "#2EC4B6";
const PAYROLL = "#FF7A59";
const DOCS = "#55A8FD";
const PEOPLE = "#F6B93B";
const DEVICES = "#8B7CF8";
const BLUE = "#0070F3";

export interface DashboardKpi {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  icon: "leave" | "people" | "docs" | "payroll" | "devices" | "approvals";
  accent: string;
  progress?: number;
}

export interface DashboardLeaveItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  gender: string | null;
  typeLabel: string;
  status: "pending" | "approved";
  startDate: string;
  endDate: string;
  workingDays: number;
  isSelf: boolean;
}

export interface DashboardTeamMember {
  id: string;
  name: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  gender: string | null;
  remaining: number;
  entitlement: number;
}

export interface DashboardBirthday {
  id: string;
  name: string;
  avatarUrl: string | null;
  gender: string | null;
  dateLabel: string;
}

export interface DashboardHoliday {
  name: string;
  dateLabel: string;
}

function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, white)`;
}

function KpiIcon({
  name,
  accent,
}: {
  name: DashboardKpi["icon"];
  accent: string;
}) {
  const icons: Record<DashboardKpi["icon"], ComponentType<{ className?: string }>> = {
    leave: CalendarDays,
    people: Users,
    docs: FileText,
    payroll: Wallet,
    devices: Laptop,
    approvals: CalendarDays,
  };
  const Icon = icons[name];
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-md"
      style={{ background: tint(accent, 12), color: accent }}
    >
      <Icon className="size-4" />
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
  icon: Icon,
  accent,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && accent ? (
            <div
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md"
              style={{ background: tint(accent, 10), color: accent }}
            >
              <Icon className="size-4" />
            </div>
          ) : null}
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm font-medium">{title}</h2>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function QuickLink({
  href,
  label,
  accent,
  icon: Icon,
}: {
  href: string;
  label: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:bg-secondary/40"
    >
      <div
        className="flex size-9 items-center justify-center rounded-md transition-transform duration-150 group-hover:scale-[1.03]"
        style={{ background: tint(accent, 12), color: accent }}
      >
        <Icon className="size-4" />
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export function DashboardView({
  greeting,
  firstName,
  subtitle,
  kpis,
  leaveRemaining,
  leaveEntitlement,
  leaveUsed,
  leavePending,
  upcomingLeave,
  team,
  birthdays,
  holidays,
  reportingLine,
  canApprove,
  isAdmin,
}: {
  greeting: string;
  firstName: string;
  subtitle: string;
  kpis: DashboardKpi[];
  leaveRemaining: number;
  leaveEntitlement: number;
  leaveUsed: number;
  leavePending: number;
  upcomingLeave: DashboardLeaveItem[];
  team: DashboardTeamMember[];
  birthdays: DashboardBirthday[];
  holidays: DashboardHoliday[];
  reportingLine: { label: string; name: string; detail: string };
  canApprove: boolean;
  isAdmin: boolean;
}) {
  const leavePct =
    leaveEntitlement <= 0
      ? 0
      : Math.min(100, Math.round((leaveRemaining / leaveEntitlement) * 100));

  return (
    <div className="flex w-full flex-col gap-5">
      <div
        className="relative overflow-hidden rounded-xl border border-border px-5 py-5 sm:px-6"
        style={{
          background: `linear-gradient(135deg, ${tint(BLUE, 8)} 0%, #ffffff 55%, ${tint(LEAVE, 6)} 100%)`,
        }}
      >
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-[#0B4FBF] uppercase">
              Dashboard
            </p>
            <h1 className="text-xl font-medium tracking-tight sm:text-2xl">
              {greeting}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/leave"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <CalendarDays className="size-3.5" />
              Request leave
            </Link>
            {canApprove ? (
              <Link
                href="/approvals"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "gap-1.5 border-transparent bg-white/80",
                )}
              >
                Review requests
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const inner = (
            <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-transparent">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-medium tracking-tight">
                    {kpi.value}
                  </p>
                </div>
                <KpiIcon name={kpi.icon} accent={kpi.accent} />
              </div>
              {kpi.progress !== undefined ? (
                <div className="space-y-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: `${kpi.progress}%`,
                        background: kpi.accent,
                      }}
                    />
                  </div>
                  {kpi.hint ? (
                    <p className="text-[11px] text-muted-foreground">{kpi.hint}</p>
                  ) : null}
                </div>
              ) : kpi.hint ? (
                <p className="text-xs text-muted-foreground">{kpi.hint}</p>
              ) : null}
            </div>
          );

          if (kpi.href) {
            return (
              <Link key={kpi.label} href={kpi.href} className="block h-full">
                {inner}
              </Link>
            );
          }

          return (
            <div key={kpi.label} className="h-full">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Section
            title="Your leave"
            description="Annual entitlement on a 9–5 working-day calendar."
            icon={CalendarDays}
            accent={LEAVE}
            action={
              <Link
                href="/leave"
                className="text-xs font-medium text-[#0B4FBF] hover:underline"
              >
                Open leave
              </Link>
            }
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative mx-auto flex size-28 shrink-0 items-center justify-center sm:mx-0">
                <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    pathLength={100}
                    className="text-secondary"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke={LEAVE}
                    strokeWidth="3"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray={`${leavePct} ${100 - leavePct}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-medium tracking-tight">
                    {leaveRemaining}
                  </span>
                  <span className="text-[11px] text-muted-foreground">days</span>
                </div>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Entitlement</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {leaveEntitlement} days
                  </p>
                </div>
                <div className="rounded-md border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Used</p>
                  <p className="mt-0.5 text-sm font-medium">{leaveUsed} days</p>
                </div>
                <div className="rounded-md border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {leavePending} days
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Upcoming leave"
            description="Approved and pending time off on your calendar."
            icon={PartyPopper}
            accent={LEAVE}
          >
            {upcomingLeave.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing booked ahead.{" "}
                <Link href="/leave" className="text-[#0B4FBF] hover:underline">
                  Plan time off
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcomingLeave.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
                  >
                    <UserAvatar
                      name={item.name}
                      src={item.avatarUrl}
                      gender={item.gender}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.isSelf ? "You" : item.name}
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {item.typeLabel}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatLeaveDateRange(
                          parseISO(item.startDate),
                          parseISO(item.endDate),
                        )}{" "}
                        · {item.workingDays}d /{" "}
                        {workingHoursFromDays(item.workingDays)}h
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md font-normal",
                        item.status === "approved"
                          ? "border-transparent bg-success/10 text-success"
                          : "border-transparent bg-amber-500/10 text-amber-700",
                      )}
                    >
                      {item.status === "approved" ? "Approved" : "Pending"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {team.length > 0 ? (
            <Section
              title="Team leave availability"
              description="Annual days left for people who report to you."
              icon={Users}
              accent={PEOPLE}
              action={
                canApprove ? (
                  <Link
                    href="/approvals"
                    className="text-xs font-medium text-[#0B4FBF] hover:underline"
                  >
                    Approvals
                  </Link>
                ) : null
              }
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {team.map((person) => {
                  const pct =
                    person.entitlement <= 0
                      ? 0
                      : Math.round(
                          (person.remaining / person.entitlement) * 100,
                        );
                  return (
                    <Link
                      key={person.id}
                      href={`/admin/employees/${person.id}`}
                      className="rounded-md border border-border px-3 py-3 transition-colors hover:bg-secondary/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          name={person.name}
                          src={person.avatarUrl}
                          gender={person.gender}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {person.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {person.jobTitle ?? "Team member"}
                          </p>
                        </div>
                        <p className="text-sm font-medium tabular-nums">
                          {person.remaining}
                        </p>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: LEAVE,
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Section>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Section title="Quick links" icon={ArrowRight} accent={BLUE}>
            <div className="grid gap-2">
              <QuickLink
                href="/leave"
                label="Leave"
                accent={LEAVE}
                icon={CalendarDays}
              />
              <QuickLink
                href="/documents"
                label="Documents"
                accent={DOCS}
                icon={FileText}
              />
              {canApprove ? (
                <QuickLink
                  href="/approvals"
                  label="Approve leave"
                  accent={PEOPLE}
                  icon={Users}
                />
              ) : null}
              {isAdmin ? (
                <>
                  <QuickLink
                    href="/admin/employees"
                    label="Employees"
                    accent={PEOPLE}
                    icon={Users}
                  />
                  <QuickLink
                    href="/admin/payroll"
                    label="Payroll"
                    accent={PAYROLL}
                    icon={Wallet}
                  />
                  <QuickLink
                    href="/admin/devices"
                    label="Devices"
                    accent={DEVICES}
                    icon={Laptop}
                  />
                </>
              ) : null}
              <QuickLink
                href="/settings"
                label="Settings"
                accent={BLUE}
                icon={Settings}
              />
            </div>
          </Section>

          <Section
            title="Coming up"
            description="Public holidays, birthdays, and your reporting line."
            icon={Gift}
            accent={PAYROLL}
          >
            <div className="space-y-4">
              <div className="rounded-md border border-border px-3 py-2.5">
                <p className="text-xs text-muted-foreground">
                  {reportingLine.label}
                </p>
                <p className="mt-0.5 text-sm font-medium">{reportingLine.name}</p>
                <p className="text-xs text-muted-foreground">
                  {reportingLine.detail}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Holidays
                </p>
                {holidays.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No upcoming holidays on file.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {holidays.map((holiday) => (
                      <li
                        key={`${holiday.name}-${holiday.dateLabel}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{holiday.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {holiday.dateLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Birthdays this month
                </p>
                {birthdays.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    None in your circle this month.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {birthdays.map((person) => (
                      <li
                        key={person.id}
                        className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2"
                      >
                        <UserAvatar
                          name={person.name}
                          src={person.avatarUrl}
                          gender={person.gender}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {person.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {person.dateLabel}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

export const DASHBOARD_COLORS = {
  leave: LEAVE,
  payroll: PAYROLL,
  docs: DOCS,
  people: PEOPLE,
  devices: DEVICES,
  blue: BLUE,
} as const;

export function leaveTypeLabel(type: string): string {
  return LEAVE_TYPES.find((option) => option.id === type)?.label ?? type;
}
