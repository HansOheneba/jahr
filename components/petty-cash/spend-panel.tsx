import { categoryColor } from "@/lib/petty-cash/category-color";
import { formatPettyCashMoney } from "@/lib/petty-cash/money";
import type { CategorySpend } from "@/lib/petty-cash/summary";

export function SpendPanel({
  expenses,
  pending,
  replenishment,
  currency,
  mixedCurrencies,
  categories,
}: {
  expenses: number;
  pending: number;
  replenishment: number;
  currency: string;
  mixedCurrencies: boolean;
  categories: CategorySpend[];
}) {
  const money = (amount: number) =>
    mixedCurrencies ? "Multiple currencies" : formatPettyCashMoney(amount, currency);
  const categoryTotal = categories.reduce((sum, category) => sum + category.total, 0);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium">This month</h2>
      <dl className="mt-3 grid grid-cols-3 gap-3 border-b border-border pb-4">
        <Figure label="Expenses" value={money(expenses)} />
        <Figure label="Pending" value={money(pending)} />
        <Figure label="Replenishment" value={money(replenishment)} />
      </dl>
      {categories.length > 0 && !mixedCurrencies ? (
        <div className="mt-5 flex flex-col items-center gap-4">
          <SpendRing total={categoryTotal} currency={currency} categories={categories} />
          <ul className="flex w-full flex-col gap-2">
            {categories.map((category) => (
              <li
                key={category.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryColor(category.name) }}
                  />
                  <span className="truncate">{category.name}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatPettyCashMoney(category.total, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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

function SpendRing({
  total,
  currency,
  categories,
}: {
  total: number;
  currency: string;
  categories: CategorySpend[];
}) {
  let cursor = 0;
  const stops = categories.map((category) => {
    const start = cursor;
    cursor += total > 0 ? category.total / total : 0;
    return `${categoryColor(category.name)} ${start * 100}% ${cursor * 100}%`;
  });

  return (
    <div
      className="relative size-32 rounded-full"
      style={{ background: `conic-gradient(${stops.join(", ")})` }}
      role="img"
      aria-label="Spending by category"
    >
      <div className="absolute inset-3 flex items-center justify-center rounded-full bg-card px-2 text-center">
        <p className="text-sm font-medium tracking-tight tabular-nums">
          {formatPettyCashMoney(total, currency)}
        </p>
      </div>
    </div>
  );
}
