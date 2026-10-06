export const IN_TRANSACTION_TYPES = [
  "opening_balance",
  "top_up",
  "cash_return",
  "adjustment_in",
] as const;

export const OUT_TRANSACTION_TYPES = [
  "expense",
  "cash_withdrawal",
  "adjustment_out",
] as const;

export const TRANSACTION_TYPES = [
  ...IN_TRANSACTION_TYPES,
  ...OUT_TRANSACTION_TYPES,
] as const;

export const TRANSACTION_STATUSES = [
  "draft",
  "pending_approval",
  "rejected",
  "approved",
  "posted",
  "voided",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type CashDirection = "in" | "out";

export interface BalanceTransaction {
  id: string;
  fundId: string;
  direction: CashDirection;
  amount: number;
  status: TransactionStatus;
  transactionDate: string;
  createdAt: string;
  transactionNumber: string;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function asMoney(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return 0;
  return roundMoney(amount);
}

export function isTransactionType(value: string): value is TransactionType {
  return (TRANSACTION_TYPES as readonly string[]).includes(value);
}

export function isTransactionStatus(value: string): value is TransactionStatus {
  return (TRANSACTION_STATUSES as readonly string[]).includes(value);
}

export function directionForType(type: TransactionType): CashDirection {
  return (IN_TRANSACTION_TYPES as readonly string[]).includes(type)
    ? "in"
    : "out";
}

export function signedAmount(direction: CashDirection, amount: number): number {
  const value = roundMoney(amount);
  return direction === "in" ? value : -value;
}

/** Official balance. Only posted rows count. Voided rows are excluded. */
export function postedBalance(
  transactions: readonly Pick<
    BalanceTransaction,
    "direction" | "amount" | "status"
  >[],
): number {
  return roundMoney(
    transactions.reduce((sum, transaction) => {
      if (transaction.status !== "posted") return sum;
      return sum + signedAmount(transaction.direction, transaction.amount);
    }, 0),
  );
}

export function pendingOut(
  transactions: readonly Pick<
    BalanceTransaction,
    "direction" | "amount" | "status"
  >[],
): number {
  return roundMoney(
    transactions.reduce((sum, transaction) => {
      if (
        transaction.status !== "pending_approval" ||
        transaction.direction !== "out"
      ) {
        return sum;
      }
      return sum + transaction.amount;
    }, 0),
  );
}

function compareLedger(a: BalanceTransaction, b: BalanceTransaction): number {
  if (a.transactionDate !== b.transactionDate) {
    return a.transactionDate < b.transactionDate ? -1 : 1;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? -1 : 1;
  }
  return a.transactionNumber < b.transactionNumber ? -1 : 1;
}

/** Running balance after each posted row, computed per fund from the full set. */
export function withRunningBalances<T extends BalanceTransaction>(
  rows: readonly T[],
): Array<T & { balance: number | null }> {
  const byFund = new Map<string, T[]>();
  for (const row of rows) {
    const list = byFund.get(row.fundId) ?? [];
    list.push(row);
    byFund.set(row.fundId, list);
  }

  const balances = new Map<string, number | null>();
  for (const list of byFund.values()) {
    let balance = 0;
    for (const row of [...list].sort(compareLedger)) {
      if (row.status !== "posted") {
        balances.set(row.id, null);
        continue;
      }
      balance = roundMoney(
        balance + signedAmount(row.direction, row.amount),
      );
      balances.set(row.id, balance);
    }
  }

  return rows.map((row) => ({
    ...row,
    balance: balances.get(row.id) ?? null,
  }));
}

export function recommendedReplenishment(
  targetFloat: number,
  currentBalance: number,
): number {
  return roundMoney(Math.max(0, targetFloat - currentBalance));
}

export function needsReplenishment(
  currentBalance: number,
  threshold: number,
): boolean {
  return currentBalance < threshold;
}

export function cashVariance(expected: number, actual: number): number {
  return roundMoney(actual - expected);
}

export function exceedsPettyCashLimit(amount: number, maximum: number): boolean {
  return roundMoney(amount) > roundMoney(maximum);
}

export function receiptRequiredFor(
  type: TransactionType,
  amount: number,
  threshold: number,
): boolean {
  return type === "expense" && roundMoney(amount) > roundMoney(threshold);
}

export function shouldAutoPost(input: {
  amount: number;
  exceptionRequested: boolean;
  autoApproveUpTo: number;
  maxTransactionAmount: number;
}): boolean {
  if (input.exceptionRequested) return false;
  if (exceedsPettyCashLimit(input.amount, input.maxTransactionAmount)) {
    return false;
  }
  return roundMoney(input.amount) <= roundMoney(input.autoApproveUpTo);
}

export function expenseShortfall(
  available: number,
  requested: number,
): number | null {
  const next = roundMoney(available - requested);
  if (next >= 0) return null;
  return roundMoney(requested - available);
}

export function currencyDisplay(currency: string): string {
  return currency.toUpperCase() === "GHS" ? "GH₵" : currency.toUpperCase();
}

export function formatPettyCashMoney(amount: number, currency: string): string {
  const formatted = amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currencyDisplay(currency);
  if (symbol === "GH₵") return `GH₵ ${formatted}`;
  return `${formatted} ${symbol}`;
}

export function floatFillPercent(available: number, target: number): number {
  if (target <= 0) return available > 0 ? 100 : 0;
  const ratio = Math.round((available / target) * 100);
  return Math.min(100, Math.max(0, ratio));
}
