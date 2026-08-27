"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PayrollEntityAnalysis } from "@/components/admin/payroll-entity-analysis";
import { formatRatesUpdated } from "@/lib/fx/format";
import type { FxRateTable } from "@/lib/fx/types";
import {
  DEFAULT_PAY_CURRENCY,
  formatCurrencyTrigger,
  REPORTING_CURRENCIES,
  type ReportingCurrency,
} from "@/lib/payroll/currencies";
import {
  buildPayrollAnalysis,
  needsPayrollSetup,
  payFrequencyLabel,
} from "@/lib/payroll/entity-analysis";
import type { PayrollEmployeeSummary } from "@/lib/payroll/types";
import { displayName } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const ALL_FILTER = "all";
const NEEDS_SETUP_FILTER = "needs-setup";

const CURRENCY_ITEMS = REPORTING_CURRENCIES.map((code) => ({
  value: code,
  label: formatCurrencyTrigger(code),
}));

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
        active
          ? "border-[#0070F3] bg-[color-mix(in_srgb,#0070F3_8%,white)] text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {label}
      {count !== undefined ? (
        <span className="font-medium tabular-nums text-foreground">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function PayrollList({
  employees,
  rates,
  reportingCurrency: orgReportingCurrency,
}: {
  employees: PayrollEmployeeSummary[];
  rates: FxRateTable;
  /** Org default. The selector below is a view preference, not a save. */
  reportingCurrency: ReportingCurrency;
}) {
  const [filter, setFilter] = useState(ALL_FILTER);
  const [reportingCurrency, setReportingCurrency] = useState<ReportingCurrency>(
    orgReportingCurrency,
  );
  const listRef = useRef<HTMLDivElement>(null);

  const analysis = useMemo(
    () => buildPayrollAnalysis(employees, { reportingCurrency, rates }),
    [employees, reportingCurrency, rates],
  );

  const entityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const employee of employees) {
      const name = employee.legal_entity_paying?.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [employees]);

  const visible = useMemo(() => {
    if (filter === ALL_FILTER) return employees;
    if (filter === NEEDS_SETUP_FILTER) {
      return employees.filter(needsPayrollSetup);
    }
    return employees.filter(
      (row) => row.legal_entity_paying?.trim() === filter,
    );
  }, [employees, filter]);

  function showNeedsSetup() {
    setFilter(NEEDS_SETUP_FILTER);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (employees.length === 0) {
    return <p className="text-sm text-muted-foreground">No employees found.</p>;
  }

  const ratesUpdated = formatRatesUpdated(rates.updatedAt);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-end gap-1 self-end">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="reporting-currency"
            className="text-xs text-muted-foreground"
          >
            Reporting currency
          </Label>
          <Select
            value={reportingCurrency}
            onValueChange={(value) => {
              if (value) setReportingCurrency(value as ReportingCurrency);
            }}
            items={CURRENCY_ITEMS}
          >
            <SelectTrigger id="reporting-currency" size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="end">
              {CURRENCY_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {ratesUpdated
            ? `Rates last updated ${ratesUpdated}`
            : "No exchange rates on file"}
        </p>
      </div>

      <PayrollEntityAnalysis
        analysis={analysis}
        selectedEntity={filter}
        onSelectEntity={setFilter}
        onShowNeedsSetup={showNeedsSetup}
      />

      <div className="flex flex-col gap-3" ref={listRef}>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label="All"
            count={employees.length}
            active={filter === ALL_FILTER}
            onClick={() => setFilter(ALL_FILTER)}
          />
          {entityCounts.map(([name, count]) => (
            <FilterChip
              key={name}
              label={name}
              count={count}
              active={filter === name}
              onClick={() => setFilter(name)}
            />
          ))}
          {analysis.needsSetup.count > 0 ? (
            <FilterChip
              label="Needs setup"
              count={analysis.needsSetup.count}
              active={filter === NEEDS_SETUP_FILTER}
              onClick={showNeedsSetup}
            />
          ) : null}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
            <p className="text-sm font-medium tracking-tight">
              No people in this entity
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {visible.map((employee) => {
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
                        {employee.legal_entity_paying
                          ? ` · ${employee.legal_entity_paying}`
                          : ""}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-medium tabular-nums">
                        {employee.salary === null
                          ? "-"
                          : `${employee.currency ?? DEFAULT_PAY_CURRENCY} ${employee.salary.toLocaleString()}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payFrequencyLabel(employee.pay_frequency)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="hidden rounded-md font-normal md:inline-flex"
                    >
                      {employee.has_package ? "Package set" : "Needs setup"}
                    </Badge>
                    <Link
                      href={`/admin/payroll/${employee.id}`}
                      className={cn(
                        buttonVariants({ size: "sm", variant: "secondary" }),
                      )}
                    >
                      Edit
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Showing {visible.length} of {employees.length}{" "}
              {employees.length === 1 ? "person" : "people"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
