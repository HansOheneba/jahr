import {
  postedBalance,
  recommendedReplenishment,
  roundMoney,
} from "@/lib/petty-cash/money";
import type {
  LedgerFilters,
  LedgerRow,
  PettyCashBundle,
  PettyCashFund,
} from "@/lib/petty-cash/types";

export interface CategorySpend {
  name: string;
  total: number;
  count: number;
}

export interface PettyCashOverview {
  currency: string | null;
  mixedCurrencies: boolean;
  available: number;
  monthOut: number;
  pendingCount: number;
  replenishmentNeeded: number;
  funds: PettyCashFund[];
  recent: LedgerRow[];
  categories: CategorySpend[];
}

export function buildOverview(
  bundle: PettyCashBundle,
  fundId: string,
  month: string,
): PettyCashOverview {
  const scopedFunds = fundId
    ? bundle.funds.filter((fund) => fund.id === fundId)
    : bundle.funds;
  const currencies = new Set(scopedFunds.map((fund) => fund.currency));
  const mixedCurrencies = currencies.size > 1;
  const currency = currencies.size === 1 ? [...currencies][0] : null;

  const scopedIds = new Set(scopedFunds.map((fund) => fund.id));
  const transactions = bundle.transactions.filter((row) => scopedIds.has(row.fundId));
  const monthRows = transactions.filter(
    (row) => row.status === "posted" && row.transactionDate.startsWith(month),
  );

  const available = mixedCurrencies
    ? 0
    : postedBalance(transactions);
  const monthOut = mixedCurrencies
    ? 0
    : roundMoney(
        monthRows
          .filter((row) => row.direction === "out")
          .reduce((sum, row) => sum + row.amount, 0),
      );

  const pendingCount =
    transactions.filter((row) => row.status === "pending_approval").length;
  const replenishmentNeeded = mixedCurrencies
    ? 0
    : roundMoney(
        scopedFunds
          .filter((fund) => fund.needsReplenishment)
          .reduce(
            (sum, fund) =>
              sum +
              recommendedReplenishment(fund.targetBalance, fund.availableBalance),
            0,
          ),
      );

  const spend = new Map<string, CategorySpend>();
  for (const row of monthRows) {
    if (row.direction !== "out" || row.transactionType !== "expense") continue;
    const name = row.categoryName ?? "Uncategorised";
    const current = spend.get(name) ?? { name, total: 0, count: 0 };
    current.total = roundMoney(current.total + row.amount);
    current.count += 1;
    spend.set(name, current);
  }

  return {
    currency,
    mixedCurrencies,
    available,
    monthOut,
    pendingCount,
    replenishmentNeeded,
    funds: scopedFunds,
    recent: transactions.slice(0, 8),
    categories: [...spend.values()].sort((a, b) => b.total - a.total).slice(0, 6),
  };
}

export interface LedgerSummaryFigures {
  mixedCurrencies: boolean;
  currency: string | null;
  currentCash: number;
  moneyIn: number;
  moneyOut: number;
  count: number;
}

/** Current cash is the live posted balance for the selected funds.
 *  Money in and money out count posted rows in that fund scope and date range.
 *  The count is every visible row, including drafts, pending, and rejected.
 */
export function buildLedgerSummary(
  transactions: readonly LedgerRow[],
  funds: readonly Pick<PettyCashFund, "id" | "currency">[],
  visibleCount: number,
  filters: Pick<LedgerFilters, "fundId" | "from" | "to">,
): LedgerSummaryFigures {
  const scopedFunds = filters.fundId
    ? funds.filter((fund) => fund.id === filters.fundId)
    : funds;
  const currencies = new Set(scopedFunds.map((fund) => fund.currency));
  const mixedCurrencies = currencies.size > 1;
  const currency = currencies.size === 1 ? [...currencies][0] : null;
  const scoped = filters.fundId
    ? transactions.filter((row) => row.fundId === filters.fundId)
    : transactions;
  const period = scoped.filter((row) => {
    if (row.status !== "posted") return false;
    if (filters.from && row.transactionDate < filters.from) return false;
    if (filters.to && row.transactionDate > filters.to) return false;
    return true;
  });

  return {
    mixedCurrencies,
    currency,
    currentCash: postedBalance(scoped),
    moneyIn: roundMoney(
      period.reduce((sum, row) => (row.direction === "in" ? sum + row.amount : sum), 0),
    ),
    moneyOut: roundMoney(
      period.reduce((sum, row) => (row.direction === "out" ? sum + row.amount : sum), 0),
    ),
    count: visibleCount,
  };
}
