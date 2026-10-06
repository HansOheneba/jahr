import type { CashDirection, TransactionStatus, TransactionType } from "@/lib/petty-cash/money";

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  opening_balance: "Opening balance",
  top_up: "Replenishment",
  cash_return: "Cash return",
  adjustment_in: "Adjustment in",
  expense: "Expense",
  cash_withdrawal: "Cash withdrawal",
  adjustment_out: "Adjustment out",
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  rejected: "Rejected",
  approved: "Approved",
  posted: "Posted",
  voided: "Voided",
};

export const FUND_STATUS_LABELS = {
  active: "Active",
  suspended: "Suspended",
  closed: "Closed",
} as const;

export const RECONCILIATION_REASONS = [
  { value: "missing_receipt", label: "Missing receipt" },
  { value: "cash_shortage", label: "Cash shortage" },
  { value: "cash_overage", label: "Cash overage" },
  { value: "data_entry_error", label: "Data entry error" },
  { value: "unrecorded_transaction", label: "Unrecorded transaction" },
  { value: "other", label: "Other" },
] as const;

export function directionLabel(direction: CashDirection): string {
  return direction === "in" ? "In" : "Out";
}

export function reasonLabel(value: string | null): string {
  if (!value) return "";
  return (
    RECONCILIATION_REASONS.find((reason) => reason.value === value)?.label ??
    value
  );
}

export function formatPettyCashDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
