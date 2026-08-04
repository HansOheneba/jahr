"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Mars, MoreHorizontal, Venus, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { DirectoryEmployee } from "@/lib/employees/get-directory";
import type { EmploymentStatus } from "@/lib/types/database";
import { displayName } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active";

function normalizeGender(value: string | null): "male" | "female" | "other" {
  if (!value) return "other";
  const normalized = value.trim().toLowerCase();
  if (normalized === "male" || normalized === "m") return "male";
  if (normalized === "female" || normalized === "f") return "female";
  return "other";
}

function statusLabel(
  status: EmploymentStatus,
  leavingReason?: string | null,
): string {
  if (status === "terminated") {
    const reason = leavingReason?.toLowerCase() ?? "";
    if (reason.includes("dismiss") || reason.includes("fir")) return "Fired";
    if (reason.includes("resign")) return "Resigned";
    if (reason.includes("contract")) return "Contract ended";
    return "Left";
  }
  if (status === "inactive") return "Inactive";
  if (status === "onboarding") return "Onboarding";
  return "Active";
}

function statusBadgeClass(status: EmploymentStatus): string {
  if (status === "active") {
    return "border-transparent bg-success/10 text-success";
  }
  if (status === "onboarding") {
    return "border-transparent bg-amber-500/10 text-amber-700";
  }
  if (status === "inactive") {
    return "border-transparent bg-secondary text-muted-foreground";
  }
  return "border-transparent bg-destructive/10 text-destructive";
}

function matchesFilter(
  employee: DirectoryEmployee,
  filter: StatusFilter,
): boolean {
  if (filter === "all") return true;
  return employee.status === "active";
}

export function EmployeesList({
  employees,
  canManagePay = false,
  variant = "employees",
}: {
  employees: DirectoryEmployee[];
  /** Org admins can open pay packages; managers cannot. */
  canManagePay?: boolean;
  /** Alumni hides the Active filter chip. */
  variant?: "employees" | "alumni";
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const isAlumni = variant === "alumni";

  const stats = useMemo(() => {
    const active = employees.filter((row) => row.status === "active").length;
    const male = employees.filter(
      (row) => normalizeGender(row.gender) === "male",
    ).length;
    const female = employees.filter(
      (row) => normalizeGender(row.gender) === "female",
    ).length;
    const gendered = male + female;
    const malePct = gendered === 0 ? 0 : Math.round((male / gendered) * 100);
    const femalePct = gendered === 0 ? 0 : 100 - malePct;

    return {
      all: employees.length,
      active,
      male,
      female,
      malePct,
      femalePct,
    };
  }, [employees]);

  const visible = useMemo(
    () =>
      isAlumni
        ? employees
        : employees.filter((row) => matchesFilter(row, filter)),
    [employees, filter, isAlumni],
  );

  if (employees.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {isAlumni
          ? "No alumni yet. Offboard an employee to move them here."
          : "No employees visible for your account."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
              filter === "all"
                ? "border-[#0070F3] bg-[color-mix(in_srgb,#0070F3_8%,white)] text-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            {isAlumni ? "Alumni" : "All"}
            <span className="tabular-nums font-medium text-foreground">
              {stats.all}
            </span>
          </button>
          {!isAlumni ? (
            <button
              type="button"
              onClick={() => setFilter("active")}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
                filter === "active"
                  ? "border-[#0070F3] bg-[color-mix(in_srgb,#0070F3_8%,white)] text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              Active
              <span className="tabular-nums font-medium text-foreground">
                {stats.active}/{stats.all}
              </span>
            </button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 sm:max-w-sm sm:justify-end">
          <div className="flex shrink-0 items-center gap-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1" title="Male">
              <Mars className="size-3.5 text-[#55A8FD]" aria-hidden />
              <span className="tabular-nums text-foreground">{stats.male}</span>
              <span className="sr-only">male</span>
            </span>
            <span className="inline-flex items-center gap-1" title="Female">
              <Venus className="size-3.5 text-[#FF7A59]" aria-hidden />
              <span className="tabular-nums text-foreground">
                {stats.female}
              </span>
              <span className="sr-only">female</span>
            </span>
          </div>
          <div className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-[#55A8FD]"
              style={{ width: `${stats.malePct}%` }}
            />
            <div
              className="bg-[#FF7A59]"
              style={{ width: `${stats.femalePct}%` }}
            />
          </div>
          <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {stats.malePct}% / {stats.femalePct}%
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_8.5rem_7rem] gap-4 border-b border-border px-4 py-3 text-left text-xs text-muted-foreground md:grid">
          <span>Full name</span>
          <span>Position</span>
          <span>Department</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No people in this group.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((employee) => {
              const name = displayName(employee);
              const href = `/admin/employees/${employee.id}`;

              return (
                <li
                  key={employee.id}
                  className="grid gap-3 px-4 py-3.5 text-left md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_8.5rem_7rem] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={name}
                      src={employee.avatar_url}
                      gender={employee.gender}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {employee.email}
                      </p>
                    </div>
                  </div>

                  <p className="truncate text-sm">
                    <span className="md:hidden text-xs text-muted-foreground">
                      Position ·{" "}
                    </span>
                    {employee.job_title ?? "-"}
                  </p>

                  <p className="truncate text-sm text-muted-foreground">
                    <span className="md:hidden text-xs">Dept · </span>
                    {employee.department_name ??
                      employee.business_unit_name ??
                      "JA Group"}
                  </p>

                  <div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-fit rounded-md font-normal",
                        statusBadgeClass(employee.status),
                      )}
                    >
                      {statusLabel(employee.status, employee.leaving_reason)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-start gap-1">
                    <Link
                      href={href}
                      aria-label={`View ${name}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon-sm" }),
                      )}
                    >
                      <Eye />
                    </Link>
                    {canManagePay ? (
                      <Link
                        href={`${href}#pay`}
                        aria-label={`Pay package for ${name}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon-sm" }),
                        )}
                      >
                        <Wallet />
                      </Link>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                          }),
                        )}
                        aria-label={`More actions for ${name}`}
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-40">
                        <DropdownMenuItem onClick={() => router.push(href)}>
                          Open profile
                        </DropdownMenuItem>
                        {canManagePay ? (
                          <DropdownMenuItem
                            onClick={() => router.push(`${href}#pay`)}
                          >
                            Edit salary
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Showing {visible.length} of {employees.length}{" "}
          {employees.length === 1 ? "result" : "results"}
        </div>
      </div>
    </div>
  );
}
