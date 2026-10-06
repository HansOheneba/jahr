import Link from "next/link";
import { redirect } from "next/navigation";
import { Banknote, CalendarCheck } from "lucide-react";
import { FundCard } from "@/components/petty-cash/fund-card";
import { RecentTransactions } from "@/components/petty-cash/recent-list";
import { SpendPanel } from "@/components/petty-cash/spend-panel";
import { CreateFundButton, EditFundButton, PettyCashToolbar } from "@/components/petty-cash/toolbar";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canManagePettyCash } from "@/lib/auth/permissions";
import { formatPettyCashDate } from "@/lib/petty-cash/labels";
import { formatPettyCashMoney, floatFillPercent, roundMoney } from "@/lib/petty-cash/money";
import { getPettyCashBundle } from "@/lib/petty-cash/queries";
import { buildOverview } from "@/lib/petty-cash/summary";
import type { PettyCashFund } from "@/lib/petty-cash/types";
import { cn } from "@/lib/utils";

export default async function PettyCashPage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/dashboard");

  const { fund: fundId = "" } = await searchParams;
  const bundle = await getPettyCashBundle();
  const canManage = canManagePettyCash(profile);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const overview = buildOverview(bundle, fundId, month);
  const currency = overview.currency ?? bundle.settings.defaultCurrency;
  const scopedFund =
    (fundId ? bundle.funds.find((fund) => fund.id === fundId) : null) ??
    (bundle.funds.length === 1 ? bundle.funds[0] : null);
  const pendingOut = overview.mixedCurrencies
    ? 0
    : roundMoney(overview.funds.reduce((sum, fund) => sum + fund.pendingOut, 0));
  const needsReplenishment = scopedFund
    ? scopedFund.needsReplenishment
    : overview.replenishmentNeeded > 0;
  const replenishmentAmount = scopedFund
    ? scopedFund.replenishmentAmount
    : overview.replenishmentNeeded;
  const defaultFundId = scopedFund?.id || bundle.funds[0]?.id || "";

  return (
    <div className="flex flex-col gap-3">
      {bundle.funds.length === 0 ? (
        <EmptyState
          kind="payroll"
          surface
          title="No petty cash funds yet"
          description="Create a fund to start recording cash."
          action={
            canManage ? (
              <CreateFundButton
                settings={bundle.settings}
                people={bundle.people}
                departments={bundle.departments}
                viewerId={profile.id}
              />
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-5">
            <section className="flex flex-col rounded-xl border border-border bg-card p-5 lg:col-span-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Petty cash</p>
                  <h1 className="mt-1 truncate text-base font-medium tracking-tight">
                    {scopedFund ? scopedFund.name : "All funds"}
                  </h1>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {heroMeta(scopedFund, overview.funds.length)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Available cash</p>
                  <p
                    className={cn(
                      "mt-1 font-medium tracking-tight tabular-nums",
                      overview.mixedCurrencies ? "text-xl" : "text-3xl",
                    )}
                  >
                    {overview.mixedCurrencies
                      ? "Multiple currencies"
                      : formatPettyCashMoney(overview.available, currency)}
                  </p>
                </div>
              </div>
              {scopedFund ? (
                <FloatLine fund={scopedFund} />
              ) : null}
              {canManage ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <PettyCashToolbar
                    canManage={canManage}
                    funds={bundle.funds}
                    categories={bundle.categories}
                    vendors={bundle.vendors}
                    settings={bundle.settings}
                    defaultFundId={defaultFundId}
                    reconcile={false}
                  />
                  {scopedFund ? (
                    <EditFundButton
                      fund={scopedFund}
                      settings={bundle.settings}
                      people={bundle.people}
                      departments={bundle.departments}
                      viewerId={profile.id}
                    />
                  ) : null}
                </div>
              ) : null}
            </section>

            <AttentionCard
              canManage={canManage}
              needsReplenishment={needsReplenishment && !overview.mixedCurrencies}
              replenishmentAmount={replenishmentAmount}
              currency={currency}
              fund={scopedFund ?? null}
            />
          </div>

          {bundle.funds.length > 1 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {bundle.funds.map((fund) => (
                <FundCard
                  key={fund.id}
                  fund={fund}
                  selected={fund.id === fundId}
                  canManage={canManage}
                  settings={bundle.settings}
                  people={bundle.people}
                  departments={bundle.departments}
                  viewerId={profile.id}
                />
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {overview.recent.length === 0 ? (
                <EmptyState
                  kind="payroll"
                  surface
                  title="No petty cash transactions yet"
                  description="Once transactions are recorded, they will appear here."
                />
              ) : (
                <RecentTransactions rows={overview.recent} />
              )}
            </div>
            <div className="lg:col-span-2">
              <SpendPanel
                expenses={overview.monthOut}
                pending={pendingOut}
                replenishment={overview.replenishmentNeeded}
                currency={currency}
                mixedCurrencies={overview.mixedCurrencies}
                categories={overview.categories}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function heroMeta(fund: PettyCashFund | null | undefined, fundCount: number): string {
  if (!fund) return fundCount === 1 ? "1 fund" : `${fundCount} funds`;
  if (fund.custodians.length === 0) return "Unassigned";
  return fund.custodians.map((person) => person.name).join(", ");
}

function FloatLine({ fund }: { fund: PettyCashFund }) {
  const fill = floatFillPercent(fund.availableBalance, fund.targetBalance);
  return (
    <div className="mt-4">
      <div
        className="h-1.5 rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill)}
        aria-label="Current balance compared with target float"
      >
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${fill}%`,
            backgroundColor: fund.needsReplenishment ? "#F6B93B" : "#2EC4B6",
          }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
        {Math.round(fill)}% of {formatPettyCashMoney(fund.targetBalance, fund.currency)} target float
      </p>
    </div>
  );
}

function AttentionCard({
  canManage,
  needsReplenishment,
  replenishmentAmount,
  currency,
  fund,
}: {
  canManage: boolean;
  needsReplenishment: boolean;
  replenishmentAmount: number;
  currency: string;
  fund: PettyCashFund | null;
}) {
  const reconcileHref = fund
    ? `/operations/petty-cash/reconciliations?fund=${fund.id}`
    : "/operations/petty-cash/reconciliations";
  const replenishHref = fund
    ? `/operations/petty-cash/replenishments?fund=${fund.id}`
    : "/operations/petty-cash/replenishments";

  return (
    <section
      className={cn(
        "flex flex-col justify-between gap-5 rounded-xl p-5 lg:col-span-2",
        needsReplenishment ? "bg-[#F6B93B] text-[#171717]" : "bg-[#1f2353] text-white",
      )}
    >
      <div>
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-md",
            needsReplenishment ? "bg-black/10" : "bg-white/15",
          )}
        >
          {needsReplenishment ? (
            <Banknote className="size-4" />
          ) : (
            <CalendarCheck className="size-4" />
          )}
        </div>
        <h2 className="mt-4 text-sm font-medium">
          {needsReplenishment ? "Replenishment required" : "Cash count"}
        </h2>
        <p className={cn("mt-1 text-sm", needsReplenishment ? "text-[#171717]/80" : "text-white/80")}>
          {needsReplenishment
            ? `Top up ${formatPettyCashMoney(replenishmentAmount, currency)} to reach the target float.`
            : reconciliationCopy(fund)}
        </p>
      </div>
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          {needsReplenishment ? (
            <Link href={replenishHref} className={cn(buttonVariants(), "bg-[#171717] text-white hover:bg-[#171717]/90")}>
              Request replenishment
            </Link>
          ) : null}
          <Link
            href={reconcileHref}
            className={cn(buttonVariants(), "bg-white text-[#171717] hover:bg-white/90")}
          >
            Reconcile
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function reconciliationCopy(fund: PettyCashFund | null): string {
  if (!fund) return "Count the cash on hand and record any variance.";
  const last = fund.lastReconciliation;
  if (!last) return "This fund has not been reconciled.";
  if (last.status === "reviewed") return `Last reviewed ${formatPettyCashDate(last.date)}.`;
  return `Waiting for review, ${formatPettyCashDate(last.date)}.`;
}
