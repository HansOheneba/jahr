import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { categoryColor } from "@/lib/petty-cash/category-color";
import { TRANSACTION_TYPE_LABELS } from "@/lib/petty-cash/labels";
import { formatPettyCashMoney } from "@/lib/petty-cash/money";
import type { LedgerRow } from "@/lib/petty-cash/types";
import { cn } from "@/lib/utils";

export function RecentTransactions({ rows }: { rows: LedgerRow[] }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="text-sm font-medium">Latest transactions</h2>
        <Link
          href="/operations/petty-cash/transactions"
          aria-label="View ledger"
          className={cn(buttonVariants({ size: "icon-sm" }))}
        >
          <ArrowUpRight />
        </Link>
      </div>
      <div className="mt-2 px-2 pb-2">
        {rows.map((row) => {
          const sign = row.direction === "in" ? "+" : "\u2212";
          return (
            <Link
              key={row.id}
              href={`/operations/petty-cash/transactions/${row.id}`}
              className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors duration-150 hover:bg-muted/50"
            >
              <span className="w-14 shrink-0 text-xs text-muted-foreground">
                {shortDate(row.transactionDate)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{row.description}</span>
                <span className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    {TRANSACTION_TYPE_LABELS[row.transactionType]}
                  </span>
                  {row.categoryName ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColor(row.categoryName) }}
                      />
                      <span className="truncate">{row.categoryName}</span>
                    </span>
                  ) : null}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-sm font-medium tabular-nums",
                  row.direction === "in" && "text-[#166534]",
                )}
              >
                {sign} {formatPettyCashMoney(row.amount, row.currency)}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
      <div className="border-t border-border px-5 py-2.5 text-center">
        <Link
          href="/operations/petty-cash/transactions"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          See more
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function shortDate(value: string): string {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (value === today) return "Today";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(year, month - 1, day));
}
