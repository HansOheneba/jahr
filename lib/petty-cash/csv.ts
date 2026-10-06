import { formatPettyCashMoney } from "@/lib/petty-cash/money";
import type { LedgerRow } from "@/lib/petty-cash/types";
import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/petty-cash/labels";

function cell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function ledgerToCsv(rows: readonly LedgerRow[]): string {
  const header = [
    "Date",
    "Transaction",
    "Fund",
    "Description",
    "Category",
    "Vendor",
    "Type",
    "Money in",
    "Money out",
    "Balance",
    "Currency",
    "Status",
  ];

  const lines = rows.map((row) =>
    [
      row.transactionDate,
      row.transactionNumber,
      row.fundName,
      row.description,
      row.categoryName,
      row.vendorName,
      TRANSACTION_TYPE_LABELS[row.transactionType],
      row.direction === "in" ? row.amount.toFixed(2) : "",
      row.direction === "out" ? row.amount.toFixed(2) : "",
      row.balance == null ? "" : row.balance.toFixed(2),
      row.currency,
      TRANSACTION_STATUS_LABELS[row.status],
    ]
      .map(cell)
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

export function ledgerExportFilename(from?: string, to?: string): string {
  const start = from || "all";
  const end = to || "all";
  return `petty-cash-${start}-to-${end}.csv`;
}

export function moneyLabel(amount: number, currency: string): string {
  return formatPettyCashMoney(amount, currency);
}
