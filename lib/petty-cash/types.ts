import type { CashDirection, TransactionStatus, TransactionType } from "@/lib/petty-cash/money";

export interface PettyCashSettings {
  defaultCurrency: string;
  receiptRequiredAbove: number;
  maxTransactionAmount: number;
  allowOverLimitException: boolean;
  autoApproveUpTo: number;
  allowSelfApproval: boolean;
  allowNegativeBalance: boolean;
  defaultTargetFloat: number;
  defaultReplenishmentThreshold: number;
}

export interface PettyCashFund {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  openingBalance: number;
  targetBalance: number;
  replenishmentThreshold: number;
  custodianId: string | null;
  custodianName: string | null;
  custodians: Array<{ id: string; name: string }>;
  departmentId: string | null;
  departmentName: string | null;
  status: "active" | "suspended" | "closed";
  availableBalance: number;
  pendingOut: number;
  replenishmentAmount: number;
  needsReplenishment: boolean;
  lastReconciliation: {
    date: string;
    status: "submitted" | "reviewed";
    variance: number;
  } | null;
}

export interface PettyCashCategory {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  isActive: boolean;
}

export interface PettyCashVendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface PettyCashPerson {
  id: string;
  name: string;
  jobTitle: string | null;
  departmentId: string | null;
  status: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface LedgerRow {
  id: string;
  fundId: string;
  fundName: string;
  currency: string;
  transactionNumber: string;
  transactionType: TransactionType;
  direction: CashDirection;
  amount: number;
  transactionDate: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  vendorId: string | null;
  vendorName: string | null;
  receiptNumber: string | null;
  reference: string | null;
  notes: string | null;
  status: TransactionStatus;
  exceptionRequested: boolean;
  createdBy: string;
  createdByName: string;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  rejectionReason: string | null;
  createdAt: string;
  balance: number | null;
}

export interface ReceiptFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  performedByName: string;
  createdAt: string;
  detail: string | null;
}

export interface ReconciliationRow {
  id: string;
  fundId: string;
  fundName: string;
  currency: string;
  reconciliationDate: string;
  expectedBalance: number;
  actualBalance: number;
  variance: number;
  reason: string | null;
  notes: string | null;
  performedBy: string;
  performedByName: string;
  reviewedByName: string | null;
  status: "submitted" | "reviewed";
  createdAt: string;
}

export interface ReplenishmentRow {
  id: string;
  fundId: string;
  fundName: string;
  currency: string;
  requestedAmount: number;
  approvedAmount: number | null;
  requestedBy: string;
  requestedByName: string;
  approvedByName: string | null;
  status: "draft" | "pending_approval" | "rejected" | "approved" | "completed";
  notes: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  completedAt: string | null;
}

export interface PettyCashBundle {
  settings: PettyCashSettings;
  funds: PettyCashFund[];
  categories: PettyCashCategory[];
  vendors: PettyCashVendor[];
  people: PettyCashPerson[];
  departments: DepartmentOption[];
  transactions: LedgerRow[];
}

export interface LedgerFilters {
  q: string;
  fundId: string;
  categoryId: string;
  vendorId: string;
  status: string;
  type: string;
  from: string;
  to: string;
}

export function emptyFilters(
  searchParams: Record<string, string | string[] | undefined>,
): LedgerFilters {
  const read = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : "";
  };

  return {
    q: read("q").trim(),
    fundId: read("fund"),
    categoryId: read("category"),
    vendorId: read("vendor"),
    status: read("status"),
    type: read("type"),
    from: read("from"),
    to: read("to"),
  };
}

export function filterLedger(
  rows: readonly LedgerRow[],
  filters: LedgerFilters,
): LedgerRow[] {
  const query = filters.q.toLowerCase();

  return rows.filter((row) => {
    if (filters.fundId && row.fundId !== filters.fundId) return false;
    if (filters.categoryId && row.categoryId !== filters.categoryId) return false;
    if (filters.vendorId && row.vendorId !== filters.vendorId) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.type && row.transactionType !== filters.type) return false;
    if (filters.from && row.transactionDate < filters.from) return false;
    if (filters.to && row.transactionDate > filters.to) return false;
    if (!query) return true;

    const haystack = [
      row.description,
      row.transactionNumber,
      row.categoryName,
      row.vendorName,
      row.notes,
      row.receiptNumber,
      row.reference,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function hasLedgerFilters(filters: LedgerFilters): boolean {
  return Boolean(
    filters.q ||
      filters.fundId ||
      filters.categoryId ||
      filters.vendorId ||
      filters.status ||
      filters.type ||
      filters.from ||
      filters.to,
  );
}
