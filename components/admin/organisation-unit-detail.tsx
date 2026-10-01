"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Layers, MoreHorizontal, Plus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DepartmentSheet,
  OrganisationDeleteDialog,
} from "@/components/admin/organisation-sheets";
import { DASHBOARD_COLORS } from "@/components/dashboard/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { countPhrase, joinMeta } from "@/lib/organisation/format";
import type {
  OrganisationDepartmentView,
  OrganisationUnitView,
} from "@/lib/organisation/types";
import { unitTint } from "@/lib/organisation/unit-tint";
import { cn } from "@/lib/utils";

function wash(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, white)`;
}

function CompactMetric({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-border">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-medium tracking-tight tabular-nums">{value}</p>
      </div>
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-md"
        style={{ background: wash(accent, 12), color: accent }}
      >
        <Icon className="size-3.5" />
      </div>
    </div>
  );
}

function DepartmentCard({
  department,
  tint,
  onEdit,
  onDelete,
}: {
  department: OrganisationDepartmentView;
  tint: { background: string; color: string };
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl bg-card p-5 ring-1 ring-border transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: tint.background, color: tint.color }}
          >
            <Layers className="size-4" />
          </div>
          <h3 className="truncate text-sm font-semibold">{department.name}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            aria-label={`Actions for ${department.name}`}
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={onEdit}>Edit department</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              Delete department
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 space-y-1">
        {department.employeeCount !== null ? (
          <p className="text-sm">
            {countPhrase(department.employeeCount, "employee", "employees")}
          </p>
        ) : null}
        {department.isActive ? null : (
          <p className="text-xs text-muted-foreground">Inactive</p>
        )}
      </div>
    </article>
  );
}

export function OrganisationUnitDetail({ unit }: { unit: OrganisationUnitView }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<OrganisationDepartmentView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "department";
    id: string;
    name: string;
  } | null>(null);
  const tint = unitTint(unit);

  const metrics: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    accent: string;
  }> = [
    {
      label: "Departments",
      value: String(unit.departments.length),
      icon: Layers,
      accent: DASHBOARD_COLORS.leave,
    },
  ];

  if (unit.employeeCount !== null) {
    metrics.push({
      label: "Employees",
      value: String(unit.employeeCount),
      icon: Users,
      accent: DASHBOARD_COLORS.docs,
    });
  }

  function openCreate() {
    setEditingDepartment(null);
    setSheetOpen(true);
  }

  function openEdit(department: OrganisationDepartmentView) {
    setEditingDepartment(department);
    setSheetOpen(true);
  }

  const summary = joinMeta([
    unit.isActive ? null : "Inactive",
    countPhrase(unit.departments.length, "department", "departments"),
    unit.employeeCount === null
      ? null
      : countPhrase(unit.employeeCount, "employee", "employees"),
  ]);

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="space-y-5">
        <Link
          href="/admin/organisation"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Organisation
        </Link>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: tint.background, color: tint.color }}
            >
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl font-medium tracking-tight">{unit.name}</h1>
              {unit.description ? (
                <p className="text-sm text-muted-foreground">{unit.description}</p>
              ) : null}
              <p className="text-sm text-muted-foreground">{summary}</p>
            </div>
          </div>
          <Button className="shrink-0 self-start sm:self-center" onClick={openCreate}>
            <Plus />
            Add department
          </Button>
        </header>
      </div>

      <section
        aria-label="Business unit summary"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <CompactMetric key={metric.label} {...metric} />
        ))}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Departments</h2>
          <p className="text-sm text-muted-foreground">
            Manage the departments within this business unit.
          </p>
        </div>

        {unit.departments.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl bg-card px-6 py-10 text-center ring-1 ring-border">
            <div
              className="flex size-10 items-center justify-center rounded-md"
              style={{ backgroundColor: tint.background, color: tint.color }}
            >
              <Layers className="size-4" />
            </div>
            <p className="mt-3 text-sm font-medium">No departments yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add a department to start organising this business unit.
            </p>
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              <Plus />
              Add department
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {unit.departments.map((department) => (
              <DepartmentCard
                key={department.id}
                department={department}
                tint={tint}
                onEdit={() => openEdit(department)}
                onDelete={() =>
                  setDeleteTarget({
                    kind: "department",
                    id: department.id,
                    name: department.name,
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      <DepartmentSheet
        open={sheetOpen}
        businessUnitId={unit.id}
        department={editingDepartment}
        onOpenChange={setSheetOpen}
      />
      <OrganisationDeleteDialog
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
