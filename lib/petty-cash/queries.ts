import { cookies } from "next/headers";
import { displayName } from "@/lib/types/database";
import {
  asMoney,
  directionForType,
  isTransactionStatus,
  isTransactionType,
  needsReplenishment,
  pendingOut,
  postedBalance,
  recommendedReplenishment,
  withRunningBalances,
  type BalanceTransaction,
  type TransactionStatus,
  type TransactionType,
} from "@/lib/petty-cash/money";
import type {
  AuditEntry,
  DepartmentOption,
  LedgerRow,
  PettyCashBundle,
  PettyCashCategory,
  PettyCashFund,
  PettyCashPerson,
  PettyCashSettings,
  PettyCashVendor,
  ReceiptFile,
  ReconciliationRow,
  ReplenishmentRow,
} from "@/lib/petty-cash/types";
import { createClient } from "@/utils/supabase/server";

const DEFAULT_SETTINGS: PettyCashSettings = {
  defaultCurrency: "GHS",
  receiptRequiredAbove: 50,
  maxTransactionAmount: 500,
  allowOverLimitException: true,
  autoApproveUpTo: 100,
  allowSelfApproval: false,
  allowNegativeBalance: false,
  defaultTargetFloat: 2000,
  defaultReplenishmentThreshold: 500,
};

interface SettingsRow {
  default_currency: string;
  receipt_required_above: number | string;
  max_transaction_amount: number | string;
  allow_over_limit_exception: boolean;
  auto_approve_up_to: number | string;
  allow_self_approval: boolean;
  allow_negative_balance: boolean;
  default_target_float: number | string;
  default_replenishment_threshold: number | string;
}

interface FundRow {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  opening_balance: number | string;
  target_balance: number | string;
  replenishment_threshold: number | string;
  custodian_id: string | null;
  department_id: string | null;
  status: "active" | "suspended" | "closed";
}

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
}

interface VendorRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
}

interface PersonRow {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  job_title: string | null;
  department_id: string | null;
  status: string;
}

interface TransactionRow {
  id: string;
  fund_id: string;
  transaction_number: string;
  transaction_type: string;
  direction: "in" | "out";
  amount: number | string;
  currency: string;
  transaction_date: string;
  description: string;
  category_id: string | null;
  vendor_id: string | null;
  receipt_number: string | null;
  reference: string | null;
  notes: string | null;
  status: string;
  exception_requested: boolean;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  posted_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  rejection_reason: string | null;
  created_at: string;
}

async function supabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function personName(
  people: readonly PettyCashPerson[],
  id: string | null,
): string | null {
  if (!id) return null;
  return people.find((person) => person.id === id)?.name ?? "Former employee";
}

export async function getPettyCashBundle(): Promise<PettyCashBundle> {
  const client = await supabase();

  const [settingsResult, fundsResult, categoriesResult, vendorsResult, peopleResult, departmentsResult, transactionsResult, reconciliationsResult, custodiansResult] =
    await Promise.all([
      client.from("petty_cash_settings").select("*").maybeSingle(),
      client.from("petty_cash_funds").select("*").order("name"),
      client.from("petty_cash_categories").select("id, name, parent_id, is_active").order("name"),
      client.from("petty_cash_vendors").select("id, name, phone, email, notes, is_active").order("name"),
      client.rpc("petty_cash_people"),
      client.from("departments").select("id, name").eq("is_active", true).order("name"),
      client
        .from("petty_cash_transactions")
        .select(
          "id, fund_id, transaction_number, transaction_type, direction, amount, currency, transaction_date, description, category_id, vendor_id, receipt_number, reference, notes, status, exception_requested, created_by, approved_by, approved_at, posted_at, voided_at, void_reason, rejection_reason, created_at",
        )
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false }),
      client
        .from("petty_cash_reconciliations")
        .select("fund_id, reconciliation_date, status, variance, created_at")
        .order("reconciliation_date", { ascending: false })
        .order("created_at", { ascending: false }),
      client
        .from("petty_cash_fund_custodians")
        .select("fund_id, profile_id, created_at")
        .order("created_at"),
    ]);

  const settingsRow = settingsResult.data as SettingsRow | null;
  const settings: PettyCashSettings = settingsRow
    ? {
        defaultCurrency: settingsRow.default_currency,
        receiptRequiredAbove: asMoney(settingsRow.receipt_required_above),
        maxTransactionAmount: asMoney(settingsRow.max_transaction_amount),
        allowOverLimitException: settingsRow.allow_over_limit_exception,
        autoApproveUpTo: asMoney(settingsRow.auto_approve_up_to),
        allowSelfApproval: settingsRow.allow_self_approval,
        allowNegativeBalance: settingsRow.allow_negative_balance,
        defaultTargetFloat: asMoney(settingsRow.default_target_float),
        defaultReplenishmentThreshold: asMoney(
          settingsRow.default_replenishment_threshold,
        ),
      }
    : DEFAULT_SETTINGS;

  const people = ((peopleResult.data ?? []) as PersonRow[]).map(
    (person): PettyCashPerson => ({
      id: person.id,
      name: displayName(person),
      jobTitle: person.job_title,
      departmentId: person.department_id,
      status: person.status,
    }),
  );

  const departments = ((departmentsResult.data ?? []) as DepartmentOption[]);
  const departmentName = new Map(departments.map((department) => [department.id, department.name]));

  const categoryRows = (categoriesResult.data ?? []) as CategoryRow[];
  const categoryName = new Map(categoryRows.map((category) => [category.id, category.name]));
  const categories: PettyCashCategory[] = categoryRows.map((category) => ({
    id: category.id,
    name: category.name,
    parentId: category.parent_id,
    parentName: category.parent_id
      ? (categoryName.get(category.parent_id) ?? null)
      : null,
    isActive: category.is_active,
  }));

  const vendors = ((vendorsResult.data ?? []) as VendorRow[]).map(
    (vendor): PettyCashVendor => ({
      id: vendor.id,
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
      notes: vendor.notes,
      isActive: vendor.is_active,
    }),
  );

  const vendorName = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));
  const fundRows = (fundsResult.data ?? []) as FundRow[];
  const latestReconciliation = new Map<
    string,
    NonNullable<PettyCashFund["lastReconciliation"]>
  >();
  for (const row of (reconciliationsResult.data ?? []) as Array<{
    fund_id: string;
    reconciliation_date: string;
    status: string;
    variance: number | string;
  }>) {
    if (latestReconciliation.has(row.fund_id)) continue;
    if (row.status !== "submitted" && row.status !== "reviewed") continue;
    latestReconciliation.set(row.fund_id, {
      date: row.reconciliation_date,
      status: row.status,
      variance: asMoney(row.variance),
    });
  }
  const transactionRows = (transactionsResult.data ?? []) as TransactionRow[];

  const balanceInputs: BalanceTransaction[] = [];
  const drafts: Array<Omit<LedgerRow, "balance" | "fundName"> & { fundId: string }> = [];

  for (const row of transactionRows) {
    if (!isTransactionType(row.transaction_type) || !isTransactionStatus(row.status)) {
      continue;
    }
    const type: TransactionType = row.transaction_type;
    const status: TransactionStatus = row.status;
    const base: BalanceTransaction = {
      id: row.id,
      fundId: row.fund_id,
      direction: row.direction || directionForType(type),
      amount: asMoney(row.amount),
      status,
      transactionDate: row.transaction_date,
      createdAt: row.created_at,
      transactionNumber: row.transaction_number,
    };
    balanceInputs.push(base);
    drafts.push({
      ...base,
      currency: row.currency,
      transactionType: type,
      description: row.description,
      categoryId: row.category_id,
      categoryName: row.category_id
        ? (categoryName.get(row.category_id) ?? null)
        : null,
      vendorId: row.vendor_id,
      vendorName: row.vendor_id ? (vendorName.get(row.vendor_id) ?? null) : null,
      receiptNumber: row.receipt_number,
      reference: row.reference,
      notes: row.notes,
      exceptionRequested: row.exception_requested,
      createdBy: row.created_by,
      createdByName: personName(people, row.created_by) ?? "Unknown",
      approvedBy: row.approved_by,
      approvedByName: personName(people, row.approved_by),
      approvedAt: row.approved_at,
      postedAt: row.posted_at,
      voidedAt: row.voided_at,
      voidReason: row.void_reason,
      rejectionReason: row.rejection_reason,
    });
  }

  const withBalances = withRunningBalances(balanceInputs);
  const balanceById = new Map(withBalances.map((row) => [row.id, row.balance]));
  const fundName = new Map(fundRows.map((fund) => [fund.id, fund.name]));

  const transactions: LedgerRow[] = drafts.map((row) => ({
    ...row,
    fundName: fundName.get(row.fundId) ?? "Fund",
    balance: balanceById.get(row.id) ?? null,
  }));

  const custodiansByFund = new Map<string, Array<{ id: string; name: string }>>();
  for (const row of (custodiansResult.data ?? []) as Array<{
    fund_id: string;
    profile_id: string;
  }>) {
    const list = custodiansByFund.get(row.fund_id) ?? [];
    list.push({
      id: row.profile_id,
      name: personName(people, row.profile_id) ?? "Former employee",
    });
    custodiansByFund.set(row.fund_id, list);
  }

  const funds: PettyCashFund[] = fundRows.map((fund) => {
    const fundTransactions = transactions.filter((row) => row.fundId === fund.id);
    const availableBalance = postedBalance(fundTransactions);
    const threshold = asMoney(fund.replenishment_threshold);
    const linked = custodiansByFund.get(fund.id) ?? [];
    const primary = fund.custodian_id
      ? linked.find((person) => person.id === fund.custodian_id) ?? {
          id: fund.custodian_id,
          name: personName(people, fund.custodian_id) ?? "Former employee",
        }
      : null;
    const custodians = primary
      ? [primary, ...linked.filter((person) => person.id !== primary.id)]
      : linked;
    return {
      id: fund.id,
      name: fund.name,
      description: fund.description,
      currency: fund.currency,
      openingBalance: asMoney(fund.opening_balance),
      targetBalance: asMoney(fund.target_balance),
      replenishmentThreshold: threshold,
      custodianId: custodians[0]?.id ?? null,
      custodianName: custodians[0]?.name ?? null,
      custodians,
      departmentId: fund.department_id,
      departmentName: fund.department_id
        ? (departmentName.get(fund.department_id) ?? null)
        : null,
      status: fund.status,
      availableBalance,
      pendingOut: pendingOut(fundTransactions),
      replenishmentAmount: recommendedReplenishment(
        asMoney(fund.target_balance),
        availableBalance,
      ),
      needsReplenishment:
        fund.status === "active" &&
        needsReplenishment(availableBalance, threshold),
      lastReconciliation: latestReconciliation.get(fund.id) ?? null,
    };
  });

  return {
    settings,
    funds,
    categories,
    vendors,
    people,
    departments,
    transactions,
  };
}

export async function getTransactionExtras(transactionId: string): Promise<{
  receipts: ReceiptFile[];
  activity: AuditEntry[];
}> {
  const client = await supabase();
  const [receiptResult, auditResult, peopleResult] = await Promise.all([
    client
      .from("petty_cash_attachments")
      .select("id, file_name, file_type, file_size, created_at")
      .eq("transaction_id", transactionId)
      .order("created_at"),
    client
      .from("petty_cash_audit_logs")
      .select("id, action, performed_by, created_at, new_values")
      .eq("entity_id", transactionId)
      .order("created_at"),
    client.rpc("petty_cash_people"),
  ]);

  const people = ((peopleResult.data ?? []) as PersonRow[]).map((person) => ({
    id: person.id,
    name: displayName(person),
  }));

  const receipts = ((receiptResult.data ?? []) as Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    created_at: string;
  }>).map((receipt) => ({
    id: receipt.id,
    fileName: receipt.file_name,
    fileType: receipt.file_type,
    fileSize: receipt.file_size,
    createdAt: receipt.created_at,
  }));

  const activity = ((auditResult.data ?? []) as Array<{
    id: string;
    action: string;
    performed_by: string | null;
    created_at: string;
    new_values: { reason?: string } | null;
  }>).map((entry) => ({
    id: entry.id,
    action: entry.action,
    performedByName:
      people.find((person) => person.id === entry.performed_by)?.name ??
      "Someone",
    createdAt: entry.created_at,
    detail:
      typeof entry.new_values?.reason === "string" ? entry.new_values.reason : null,
  }));

  return { receipts, activity };
}

export async function getReconciliations(): Promise<ReconciliationRow[]> {
  const client = await supabase();
  const [result, peopleResult, fundsResult] = await Promise.all([
    client
      .from("petty_cash_reconciliations")
      .select(
        "id, fund_id, reconciliation_date, expected_balance, actual_balance, variance, reason, notes, performed_by, reviewed_by, status, created_at",
      )
      .order("reconciliation_date", { ascending: false }),
    client.rpc("petty_cash_people"),
    client.from("petty_cash_funds").select("id, name, currency"),
  ]);

  const people = ((peopleResult.data ?? []) as PersonRow[]).map((person) => ({
    id: person.id,
    name: displayName(person),
  }));
  const funds = new Map(
    ((fundsResult.data ?? []) as Array<{ id: string; name: string; currency: string }>).map(
      (fund) => [fund.id, fund],
    ),
  );

  return ((result.data ?? []) as Array<{
    id: string;
    fund_id: string;
    reconciliation_date: string;
    expected_balance: number | string;
    actual_balance: number | string;
    variance: number | string;
    reason: string | null;
    notes: string | null;
    performed_by: string;
    reviewed_by: string | null;
    status: "submitted" | "reviewed";
    created_at: string;
  }>).map((row) => {
    const fund = funds.get(row.fund_id);
    return {
      id: row.id,
      fundId: row.fund_id,
      fundName: fund?.name ?? "Fund",
      currency: fund?.currency ?? "GHS",
      reconciliationDate: row.reconciliation_date,
      expectedBalance: asMoney(row.expected_balance),
      actualBalance: asMoney(row.actual_balance),
      variance: asMoney(row.variance),
      reason: row.reason,
      notes: row.notes,
      performedBy: row.performed_by,
      performedByName:
        people.find((person) => person.id === row.performed_by)?.name ?? "Someone",
      reviewedByName: row.reviewed_by
        ? (people.find((person) => person.id === row.reviewed_by)?.name ?? null)
        : null,
      status: row.status,
      createdAt: row.created_at,
    };
  });
}

export async function getReplenishments(): Promise<ReplenishmentRow[]> {
  const client = await supabase();
  const [result, peopleResult, fundsResult] = await Promise.all([
    client
      .from("petty_cash_replenishments")
      .select(
        "id, fund_id, requested_amount, approved_amount, requested_by, approved_by, status, notes, rejection_reason, requested_at, completed_at",
      )
      .order("requested_at", { ascending: false }),
    client.rpc("petty_cash_people"),
    client.from("petty_cash_funds").select("id, name, currency"),
  ]);

  const people = ((peopleResult.data ?? []) as PersonRow[]).map((person) => ({
    id: person.id,
    name: displayName(person),
  }));
  const funds = new Map(
    ((fundsResult.data ?? []) as Array<{ id: string; name: string; currency: string }>).map(
      (fund) => [fund.id, fund],
    ),
  );

  return ((result.data ?? []) as Array<{
    id: string;
    fund_id: string;
    requested_amount: number | string;
    approved_amount: number | string | null;
    requested_by: string;
    approved_by: string | null;
    status: ReplenishmentRow["status"];
    notes: string | null;
    rejection_reason: string | null;
    requested_at: string;
    completed_at: string | null;
  }>).map((row) => {
    const fund = funds.get(row.fund_id);
    return {
      id: row.id,
      fundId: row.fund_id,
      fundName: fund?.name ?? "Fund",
      currency: fund?.currency ?? "GHS",
      requestedAmount: asMoney(row.requested_amount),
      approvedAmount:
        row.approved_amount == null ? null : asMoney(row.approved_amount),
      requestedBy: row.requested_by,
      requestedByName:
        people.find((person) => person.id === row.requested_by)?.name ?? "Someone",
      approvedByName: row.approved_by
        ? (people.find((person) => person.id === row.approved_by)?.name ?? null)
        : null,
      status: row.status,
      notes: row.notes,
      rejectionReason: row.rejection_reason,
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
    };
  });
}
