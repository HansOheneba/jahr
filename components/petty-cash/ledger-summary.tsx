import { formatPettyCashMoney } from "@/lib/petty-cash/money";
import type { LedgerSummaryFigures } from "@/lib/petty-cash/summary";

export function LedgerSummary({ summary }: { summary: LedgerSummaryFigures }) {
  const money = (amount: number) => {
    if (summary.mixedCurrencies) return "Multiple currencies";
    return formatPettyCashMoney(amount, summary.currency ?? "GHS");
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Current cash</p>
          <p className="mt-2 text-3xl font-medium tracking-tight tabular-nums">
            {money(summary.currentCash)}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-6">
          <Figure label="Money in" value={money(summary.moneyIn)} />
          <Figure label="Money out" value={money(summary.moneyOut)} />
          <Figure label="Transactions" value={summary.count.toLocaleString("en-GH")} />
        </dl>
      </div>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
