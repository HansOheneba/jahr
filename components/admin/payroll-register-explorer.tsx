"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UNASSIGNED_ENTITY_KEY,
  UNASSIGNED_ENTITY_LABEL,
} from "@/lib/payroll/entity-analysis";
import type { PayrollRegisterEntry } from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

function formatMoney(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  return `${currency} ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatGeneratedAt(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function entryHaystack(entry: PayrollRegisterEntry): string {
  return [
    entry.reference,
    entry.period_label,
    entry.employee.name,
    entry.employee.employee_number,
    entry.employee.job_title,
    entry.legal_entity_paying,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function yearFromPeriod(periodStart: string): string {
  return periodStart.slice(0, 4);
}

export function PayrollRegisterExplorer({
  entries,
}: {
  entries: PayrollRegisterEntry[];
}) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<string>("all");
  const [entity, setEntity] = useState<string>("all");

  const entities = useMemo(() => {
    const counts = new Map<string, number>();
    let unassigned = 0;
    for (const entry of entries) {
      const value = entry.legal_entity_paying?.trim();
      if (!value) {
        unassigned += 1;
        continue;
      }
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const named = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ key: label, label, count }));
    if (unassigned > 0) {
      named.push({
        key: UNASSIGNED_ENTITY_KEY,
        label: UNASSIGNED_ENTITY_LABEL,
        count: unassigned,
      });
    }
    return named;
  }, [entries]);

  const years = useMemo(() => {
    const values = new Set<string>();
    for (const entry of entries) {
      values.add(yearFromPeriod(entry.period_start));
    }
    return [...values].sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (year !== "all" && yearFromPeriod(entry.period_start) !== year) {
        return false;
      }
      if (entity === UNASSIGNED_ENTITY_KEY) {
        if (entry.legal_entity_paying?.trim()) return false;
      } else if (entity !== "all" && entry.legal_entity_paying !== entity) {
        return false;
      }
      if (!normalized) return true;
      return entryHaystack(entry).includes(normalized);
    });
  }, [entries, query, year, entity]);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
        <p className="text-sm font-medium tracking-tight">No payslips yet</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Generated payslips appear here with a permanent reference number.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Reference, name, payroll no., period"
            aria-label="Search payslips"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={year === "all"}
            onClick={() => setYear("all")}
            label="All years"
          />
          {years.map((value) => (
            <FilterChip
              key={value}
              active={year === value}
              onClick={() => setYear(value)}
              label={value}
            />
          ))}
        </div>
      </div>

      {entities.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={entity === "all"}
            onClick={() => setEntity("all")}
            label="All entities"
          />
          {entities.map((row) => (
            <FilterChip
              key={row.key}
              active={entity === row.key}
              onClick={() => setEntity(row.key)}
              label={row.label}
            />
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium tracking-tight">No matching payslips</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Try a reference like PS26-0100, an employee name, or a different year.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[7.5rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_7rem] gap-4 border-b border-border px-4 py-3 text-left text-xs text-muted-foreground lg:grid">
            <span>Reference</span>
            <span>Employee</span>
            <span>Period</span>
            <span>Net pay</span>
            <span>Generated</span>
            <span>Actions</span>
          </div>

          <ul className="divide-y divide-border">
            {filtered.map((entry) => (
              <li
                key={entry.id}
                className="grid gap-3 px-4 py-3.5 lg:grid-cols-[7.5rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_7rem] lg:items-center lg:gap-4"
              >
                <div>
                  <Badge
                    variant="outline"
                    className="rounded-md font-mono text-[11px] font-normal"
                  >
                    {entry.reference ?? "—"}
                  </Badge>
                </div>

                <div className="min-w-0">
                  <Link
                    href={`/admin/payroll/register/${entry.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {entry.employee.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.employee.employee_number ?? "No payroll no."}
                    {entry.employee.job_title
                      ? ` · ${entry.employee.job_title}`
                      : ""}
                    {entry.legal_entity_paying
                      ? ` · ${entry.legal_entity_paying}`
                      : ""}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">{entry.period_label}</p>

                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatMoney(entry.net_pay, entry.currency)}
                </p>

                <p className="text-sm text-muted-foreground">
                  {formatGeneratedAt(entry.generated_at)}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/payroll/register/${entry.id}`}
                    className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
                  >
                    View
                  </Link>
                  <a
                    href={`/api/payslips/${entry.id}/pdf`}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "secondary" }),
                    )}
                  >
                    <Download className="size-3.5" />
                    PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {entries.length} locked records
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-md border px-3 text-sm transition-colors",
        active
          ? "border-[#0070F3] bg-[color-mix(in_srgb,#0070F3_8%,white)] text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
