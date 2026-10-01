"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  ChartColumn,
  Layers,
  MoreHorizontal,
  Plus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DASHBOARD_COLORS } from "@/components/dashboard/shared";
import { OrganisationDeleteDialog, BusinessUnitSheet } from "@/components/admin/organisation-sheets";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { countPhrase, joinMeta } from "@/lib/organisation/format";
import type { OrganisationStructure, OrganisationUnitView } from "@/lib/organisation/types";
import { unitTint } from "@/lib/organisation/unit-tint";
import { cn } from "@/lib/utils";

const VISIBLE_DEPARTMENTS = 5;

function unitHref(unitId: string): string {
  return `/admin/organisation/${unitId}`;
}

function unitMeta(unit: OrganisationUnitView): string {
  return joinMeta([
    unit.isActive ? null : "Inactive",
    countPhrase(unit.departments.length, "department", "departments"),
    unit.employeeCount === null
      ? null
      : countPhrase(unit.employeeCount, "person", "people"),
  ]);
}

function departmentsPerUnit(structure: OrganisationStructure): string | null {
  if (structure.units.length === 0) return null;
  const value = structure.departmentCount / structure.units.length;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function UnitMenu({
  unit,
  onEdit,
  onDelete,
}: {
  unit: OrganisationUnitView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        aria-label={`Actions for ${unit.name}`}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem onClick={onEdit}>Edit business unit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(unitHref(unit.id))}>
          Manage departments
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete business unit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function wash(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, white)`;
}

function Metric({
  label,
  value,
  caption,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div
      className="flex h-full flex-col gap-3 rounded-xl border border-border p-4 transition-[border-color,background-color] duration-150 hover:border-transparent"
      style={{
        background: `linear-gradient(165deg, ${wash(accent, 14)} 0%, #ffffff 58%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-medium tracking-tight tabular-nums">{value}</p>
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-md"
          style={{ background: wash(accent, 12), color: accent }}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function DepartmentChips({ unit }: { unit: OrganisationUnitView }) {
  if (unit.departments.length === 0) {
    return <p className="text-xs text-muted-foreground">No departments yet</p>;
  }

  const visible = unit.departments.slice(0, VISIBLE_DEPARTMENTS);
  const hiddenCount = unit.departments.length - visible.length;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {visible.map((department) => (
        <li
          key={department.id}
          className="inline-flex h-6 items-center rounded-md bg-[color-mix(in_srgb,var(--primary)_7%,white)] px-2 text-xs text-foreground"
        >
          {department.name}
        </li>
      ))}
      {hiddenCount > 0 ? (
        <li className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-xs text-muted-foreground">
          +{hiddenCount} more
        </li>
      ) : null}
    </ul>
  );
}

function UnitCard({
  unit,
  onEdit,
  onDelete,
}: {
  unit: OrganisationUnitView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tint = unitTint(unit);

  return (
    <article className="group relative flex h-full flex-col rounded-xl bg-card p-5 ring-1 ring-border transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: tint.background, color: tint.color }}
          >
            <Building2 className="size-4" />
          </div>
          <h3 className="truncate text-sm font-semibold">
            <Link
              href={unitHref(unit.id)}
              className="rounded-sm outline-none after:absolute after:inset-0 after:z-0 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {unit.name}
            </Link>
          </h3>
        </div>
        <div className="relative z-10 shrink-0">
          <UnitMenu unit={unit} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      {unit.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {unit.description}
        </p>
      ) : null}

      <p className="mt-3 text-sm">{unitMeta(unit)}</p>

      <div className="mt-3">
        <DepartmentChips unit={unit} />
      </div>

      <div className="mt-auto pt-4">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          View details
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}

export function OrganisationOverview({
  structure,
}: {
  structure: OrganisationStructure;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrganisationUnitView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "unit";
    id: string;
    name: string;
  } | null>(null);

  const activeDepartments = structure.units.reduce(
    (total, unit) =>
      total + unit.departments.filter((department) => department.isActive).length,
    0,
  );
  const ratio = departmentsPerUnit(structure);

  const metrics: Array<{
    label: string;
    value: string;
    caption: string;
    icon: LucideIcon;
    accent: string;
  }> = [
    {
      label: "Business units",
      value: String(structure.units.length),
      caption: "Across the organisation",
      icon: Building2,
      accent: DASHBOARD_COLORS.people,
    },
    {
      label: "Departments",
      value: String(activeDepartments),
      caption: "Active departments",
      icon: Layers,
      accent: DASHBOARD_COLORS.leave,
    },
  ];

  if (structure.employeeCount !== null) {
    metrics.push({
      label: "Employees",
      value: String(structure.employeeCount),
      caption: "Total workforce",
      icon: Users,
      accent: DASHBOARD_COLORS.docs,
    });
  }

  if (ratio) {
    metrics.push({
      label: "Per unit",
      value: ratio,
      caption: "Departments per business unit",
      icon: ChartColumn,
      accent: DASHBOARD_COLORS.devices,
    });
  }

  function openCreate() {
    setEditingUnit(null);
    setSheetOpen(true);
  }

  function openEdit(unit: OrganisationUnitView) {
    setEditingUnit(unit);
    setSheetOpen(true);
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Organisation</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage your business units, departments and organisational structure.
          </p>
        </div>
        <Button className="shrink-0 self-start sm:self-center" onClick={openCreate}>
          <Plus />
          Add business unit
        </Button>
      </header>

      <section
        aria-label="Organisation summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Business units</h2>
          <p className="text-sm text-muted-foreground">
            Manage and explore the structure of each business unit.
          </p>
        </div>

        {structure.units.length === 0 ? (
          <p className="text-sm text-muted-foreground">No business units yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {structure.units.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onEdit={() => openEdit(unit)}
                onDelete={() =>
                  setDeleteTarget({ kind: "unit", id: unit.id, name: unit.name })
                }
              />
            ))}
          </div>
        )}
      </section>

      <BusinessUnitSheet
        open={sheetOpen}
        unit={editingUnit}
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
