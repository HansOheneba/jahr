"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  CircleAlert,
  Landmark,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  annualize,
  formatPayrollMoney,
  formatPayrollMoneyExact,
  formatPayrollMoneyList,
  annualizeAmounts,
  type PayrollAnalysis,
  type PayrollEntityBreakdown,
  type PayrollMoneyBucket,
} from "@/lib/payroll/entity-analysis";
import { cn } from "@/lib/utils";

const CORAL = "#FF7A59";
const TEAL = "#2EC4B6";
const AMBER = "#F6B93B";
const CHROME = "#171717";

/** Converted totals, or native amounts per currency for reconciliation. */
type CostView = "converted" | "native";

const ROW_GRID =
  "md:grid-cols-[minmax(0,1.6fr)_5.5rem_minmax(0,1fr)_minmax(0,1fr)_4.5rem]";

function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, white)`;
}

function peopleLabel(count: number): string {
  return count === 1 ? "person" : "people";
}

function MetricCard({
  label,
  value,
  native,
  hint,
  accent,
  icon: Icon,
  estimated,
}: {
  label: string;
  value: string;
  native?: string;
  hint: ReactNode;
  accent: string;
  icon: ComponentType<{ className?: string }>;
  estimated?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {estimated ? (
              <Badge
                variant="outline"
                className="rounded-sm px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
              >
                Estimated
              </Badge>
            ) : null}
          </div>
          <p className="text-2xl font-medium tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          {native ? (
            <p className="text-xs tabular-nums text-muted-foreground">
              {native}
            </p>
          ) : null}
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-md"
          style={{ background: tint(accent, 12), color: accent }}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-auto text-xs leading-snug text-muted-foreground">
        {hint}
      </div>
    </div>
  );
}

function NativeAmounts({
  buckets,
  field,
  className,
}: {
  buckets: PayrollMoneyBucket[];
  field: keyof Omit<PayrollMoneyBucket, "currency" | "headcount">;
  className?: string;
}) {
  if (buckets.length === 0) {
    return <p className={className}>-</p>;
  }

  return (
    <>
      {buckets.map((bucket) => (
        <p key={bucket.currency} className={className}>
          {formatPayrollMoneyExact(bucket[field], bucket.currency)}
        </p>
      ))}
    </>
  );
}

function EntityRow({
  entity,
  view,
  selected,
  onSelect,
}: {
  entity: PayrollEntityBreakdown;
  view: CostView;
  selected: boolean;
  onSelect: () => void;
}) {
  const converted = view === "converted";
  const annualBuckets = annualizeAmounts(entity.native);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "grid w-full gap-2 px-5 py-3.5 text-left transition-colors",
          ROW_GRID,
          "md:items-start md:gap-4",
          selected
            ? "bg-[color-mix(in_srgb,#0070F3_6%,white)]"
            : "hover:bg-muted/30",
        )}
      >
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-sm font-medium">{entity.label}</p>
          {converted ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-[width] duration-200 ease-out"
                style={{
                  width: `${entity.costSharePercent > 0 ? Math.max(entity.costSharePercent, 3) : 0}%`,
                  background: CORAL,
                }}
              />
            </div>
          ) : null}
        </div>

        <p className="text-sm tabular-nums">
          <span className="text-xs text-muted-foreground md:hidden">
            People ·{" "}
          </span>
          {entity.headcount}
        </p>

        <div className="space-y-0.5">
          <span className="text-xs text-muted-foreground md:hidden">
            Monthly
          </span>
          {converted ? (
            <>
              <p className="text-sm tabular-nums">
                {formatPayrollMoney(
                  entity.converted.monthlyEmployerCost,
                  entity.converted.currency,
                )}
              </p>
              <NativeAmounts
                buckets={entity.native}
                field="monthlyEmployerCost"
                className="text-xs tabular-nums text-muted-foreground"
              />
            </>
          ) : (
            <NativeAmounts
              buckets={entity.native}
              field="monthlyEmployerCost"
              className="text-sm tabular-nums"
            />
          )}
        </div>

        <div className="space-y-0.5">
          <span className="text-xs text-muted-foreground md:hidden">
            Annual
          </span>
          {converted ? (
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatPayrollMoney(
                annualize(entity.converted.monthlyEmployerCost),
                entity.converted.currency,
              )}
            </p>
          ) : (
            <NativeAmounts
              buckets={annualBuckets}
              field="monthlyEmployerCost"
              className="text-sm tabular-nums text-muted-foreground"
            />
          )}
        </div>

        <p className="text-sm tabular-nums text-muted-foreground md:text-right">
          {converted ? `${entity.costSharePercent}%` : ""}
        </p>
      </button>
    </li>
  );
}

function NeedsSetupRow({
  analysis,
  onShowNeedsSetup,
}: {
  analysis: PayrollAnalysis;
  onShowNeedsSetup: () => void;
}) {
  const { count, missingEntity, missingPackage, unallocatedMonthlyCost } =
    analysis.needsSetup;

  const reasons = [
    missingEntity > 0 ? `${missingEntity} with no paying entity` : null,
    missingPackage > 0 ? `${missingPackage} with no pay package` : null,
  ].filter((reason): reason is string => reason !== null);

  return (
    <li>
      <button
        type="button"
        onClick={onShowNeedsSetup}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:brightness-[0.98]"
        style={{ background: tint(AMBER, 10) }}
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white"
          style={{ color: AMBER }}
        >
          <CircleAlert className="size-4" />
        </span>
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="block text-sm font-medium">
            {count} {peopleLabel(count)} need setup
          </span>
          <span className="block text-xs text-muted-foreground">
            {reasons.join(", ")}. Not counted in the shares above
            {unallocatedMonthlyCost > 0
              ? `, holding ${formatPayrollMoney(unallocatedMonthlyCost, analysis.reportingCurrency)} a month`
              : ""}
            .
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium">
          Needs setup
          <ArrowRight className="size-4" />
        </span>
      </button>
    </li>
  );
}

export function PayrollEntityAnalysis({
  analysis,
  selectedEntity,
  onSelectEntity,
  onShowNeedsSetup,
}: {
  analysis: PayrollAnalysis;
  selectedEntity: string;
  onSelectEntity: (key: string) => void;
  onShowNeedsSetup: () => void;
}) {
  const [view, setView] = useState<CostView>("converted");

  const { converted, native, reportingCurrency, needsSetup } = analysis;
  const nativeMonthly = formatPayrollMoneyList(native, "monthlyEmployerCost");
  const nativeAnnual = formatPayrollMoneyList(
    annualizeAmounts(native),
    "monthlyEmployerCost",
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Monthly employer cost"
          value={formatPayrollMoney(
            converted.monthlyEmployerCost,
            reportingCurrency,
          )}
          native={nativeMonthly === "-" ? undefined : nativeMonthly}
          hint={`Gross ${formatPayrollMoney(converted.monthlyGross, reportingCurrency)}. Net ${formatPayrollMoney(converted.monthlyNet, reportingCurrency)}.`}
          accent={CORAL}
          icon={Wallet}
          estimated
        />
        <MetricCard
          label="Annual employer cost"
          value={formatPayrollMoney(
            annualize(converted.monthlyEmployerCost),
            reportingCurrency,
          )}
          native={nativeAnnual === "-" ? undefined : nativeAnnual}
          hint="Monthly cost, annualized. Gross plus employer contributions."
          accent={CHROME}
          icon={Landmark}
          estimated
        />
        <MetricCard
          label="People on payroll"
          value={String(analysis.totalHeadcount)}
          hint={
            needsSetup.missingPackage > 0
              ? `${analysis.withPackage} with a package, ${needsSetup.missingPackage} still need setup`
              : `${analysis.withPackage} with a package set`
          }
          accent={TEAL}
          icon={Users}
        />
        <MetricCard
          label="Paying entities"
          value={String(analysis.entitiesPaying)}
          hint={
            needsSetup.missingEntity > 0 ? (
              <button
                type="button"
                onClick={onShowNeedsSetup}
                className="inline-flex items-center gap-1 text-left underline underline-offset-2 hover:text-foreground"
              >
                {needsSetup.missingEntity}{" "}
                {peopleLabel(needsSetup.missingEntity)} have no paying entity
                <ArrowRight className="size-3" />
              </button>
            ) : (
              "Every package has a paying entity"
            )
          }
          accent={needsSetup.missingEntity > 0 ? AMBER : TEAL}
          icon={needsSetup.missingEntity > 0 ? CircleAlert : Building2}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-2.5">
            <div
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md"
              style={{ background: tint(CORAL, 12), color: CORAL }}
            >
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h2 className="text-sm font-medium">Cost by entity</h2>
              <p className="text-xs text-muted-foreground">
                {view === "converted"
                  ? `Monthly employer cost in ${reportingCurrency}, with the native amounts below.`
                  : "Exact amounts in the currency each entity pays in."}
              </p>
            </div>
          </div>

          <ToggleGroup
            value={[view]}
            onValueChange={(next) => {
              const [selected] = next;
              if (selected) setView(selected as CostView);
            }}
            variant="outline"
            spacing={0}
            aria-label="Cost display"
          >
            <ToggleGroupItem value="converted" className="px-3">
              Converted
            </ToggleGroupItem>
            <ToggleGroupItem value="native" className="px-3">
              By currency
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div
          className={cn(
            "hidden gap-4 border-b border-border px-5 py-3 text-xs text-muted-foreground md:grid",
            ROW_GRID,
          )}
        >
          <span>Entity</span>
          <span>People</span>
          <span>Monthly cost</span>
          <span>Annual cost</span>
          <span className="text-right">
            {view === "converted" ? "Share" : ""}
          </span>
        </div>

        {analysis.byEntity.length === 0 && needsSetup.count === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No priced payroll yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {analysis.byEntity.map((entity) => (
              <EntityRow
                key={entity.key}
                entity={entity}
                view={view}
                selected={selectedEntity === entity.key}
                onSelect={() =>
                  onSelectEntity(
                    selectedEntity === entity.key ? "all" : entity.key,
                  )
                }
              />
            ))}
            {needsSetup.count > 0 ? (
              <NeedsSetupRow
                analysis={analysis}
                onShowNeedsSetup={onShowNeedsSetup}
              />
            ) : null}
          </ul>
        )}

        {analysis.unconvertedCurrencies.length > 0 ? (
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            No rate on file for{" "}
            {analysis.unconvertedCurrencies.join(", ")}. Amounts in{" "}
            {analysis.unconvertedCurrencies.length === 1 ? "it" : "them"} sit
            outside the converted totals.
          </p>
        ) : null}
      </section>
    </div>
  );
}
