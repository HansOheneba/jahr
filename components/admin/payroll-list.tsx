"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { PayrollEmployeeSummary } from "@/lib/payroll/types";
import { displayName } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function PayrollList({
  employees,
}: {
  employees: PayrollEmployeeSummary[];
}) {
  if (employees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No employees found.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <ul className="divide-y divide-border">
        {employees.map((employee) => {
          const name = displayName(employee);
          return (
            <li
              key={employee.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <UserAvatar
                name={name}
                src={employee.avatar_url}
                className="size-9"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {employee.job_title ?? "No title"}
                  {employee.department_name
                    ? ` · ${employee.department_name}`
                    : ""}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium tabular-nums">
                  {employee.salary === null
                    ? "-"
                    : `${employee.currency ?? "GHS"} ${employee.salary.toLocaleString()}`}
                </p>
                <p className="text-xs text-muted-foreground">Monthly</p>
              </div>
              <Badge
                variant="outline"
                className="hidden rounded-md font-normal md:inline-flex"
              >
                {employee.has_package ? "Package set" : "Needs setup"}
              </Badge>
              <Link
                href={`/admin/payroll/${employee.id}`}
                className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
              >
                Edit
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
