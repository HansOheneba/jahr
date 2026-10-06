"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  canAccessPettyCash,
  canManagePettyCash,
} from "@/lib/auth/permissions";
import {
  asMoney,
  directionForType,
  exceedsPettyCashLimit,
  expenseShortfall,
  formatPettyCashMoney,
  isTransactionType,
  receiptRequiredFor,
  roundMoney,
  shouldAutoPost,
  type TransactionType,
} from "@/lib/petty-cash/money";
import {
  MAX_RECEIPT_BYTES,
  RECEIPT_MIME_TYPES,
  removeReceipt,
  uploadReceipt,
} from "@/lib/petty-cash/storage";
import { createClient } from "@/utils/supabase/server";
import type { ProfileWithOrg } from "@/lib/types/database";

export interface PettyCashActionResult {
  error?: string;
  id?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function revalidatePettyCash(transactionId?: string) {
  revalidatePath("/operations/petty-cash");
  revalidatePath("/operations/petty-cash/transactions");
  revalidatePath("/operations/petty-cash/reconciliations");
  revalidatePath("/operations/petty-cash/replenishments");
  revalidatePath("/operations/petty-cash/reports");
  revalidatePath("/operations/petty-cash/settings");
  if (transactionId) {
    revalidatePath(`/operations/petty-cash/transactions/${transactionId}`);
  }
}

function readableError(message: string): string {
  const line = message.split("\n")[0] ?? message;
  const known = [
    "Insufficient petty cash",
    "Please attach a receipt",
    "cannot accept new transactions",
    "cannot approve your own",
    "exceeds the petty cash limit",
    "already has an opening balance",
    "reason is required",
    "Only ",
    "not found",
    "Voiding this",
    "Opening balance",
    "Posted transactions",
    "Replenishment is completed",
    "A reason is required",
  ];
  if (known.some((part) => line.includes(part))) return line;
  console.error("[petty-cash]", message);
  return "Unable to save this change. Try again.";
}

async function context(manage: boolean) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "You must be signed in.", profile: null, supabase: null };
  }
  const allowed = manage
    ? canManagePettyCash(profile)
    : canAccessPettyCash(profile);
  if (!allowed) {
    return {
      error: "You do not have access to petty cash.",
      profile: null,
      supabase: null,
    };
  }
  const cookieStore = await cookies();
  return { error: null, profile, supabase: createClient(cookieStore) };
}

async function replaceFundCustodians(
  supabase: NonNullable<Awaited<ReturnType<typeof context>>["supabase"]>,
  fundId: string,
  custodianIds: string[],
): Promise<string | null> {
  const { error: deleteError } = await supabase
    .from("petty_cash_fund_custodians")
    .delete()
    .eq("fund_id", fundId);
  if (deleteError) return deleteError.message;
  if (custodianIds.length === 0) return null;

  const { error: insertError } = await supabase.from("petty_cash_fund_custodians").insert(
    custodianIds.map((profileId) => ({
      fund_id: fundId,
      profile_id: profileId,
    })),
  );
  return insertError?.message ?? null;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseAmount(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = roundMoney(Number(normalized));
  if (amount <= 0) return null;
  return amount;
}

async function audit(
  supabase: NonNullable<Awaited<ReturnType<typeof context>>["supabase"]>,
  profileId: string,
  entry: {
    entityType: string;
    entityId: string;
    action: string;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
  },
) {
  const { error } = await supabase.from("petty_cash_audit_logs").insert({
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action: entry.action,
    performed_by: profileId,
    old_values: entry.oldValues ?? null,
    new_values: entry.newValues ?? null,
  });
  if (error) {
    console.error("[petty-cash audit]", error.message);
  }
}

async function loadSettings(
  supabase: NonNullable<Awaited<ReturnType<typeof context>>["supabase"]>,
) {
  const { data, error } = await supabase
    .from("petty_cash_settings")
    .select(
      "default_currency, receipt_required_above, max_transaction_amount, allow_over_limit_exception, auto_approve_up_to, allow_self_approval, allow_negative_balance",
    )
    .maybeSingle();

  if (error || !data) {
    return {
      error: "Petty cash settings are unavailable.",
      settings: null,
    };
  }

  return {
    error: null,
    settings: {
      currency: data.default_currency as string,
      receiptRequiredAbove: asMoney(data.receipt_required_above),
      maxTransactionAmount: asMoney(data.max_transaction_amount),
      allowOverLimitException: Boolean(data.allow_over_limit_exception),
      autoApproveUpTo: asMoney(data.auto_approve_up_to),
      allowSelfApproval: Boolean(data.allow_self_approval),
      allowNegativeBalance: Boolean(data.allow_negative_balance),
    },
  };
}

export async function saveFund(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to save." };

  const id = text(formData, "id");
  const name = text(formData, "name");
  const description = text(formData, "description");
  const currency = text(formData, "currency").toUpperCase() || "GHS";
  const target = parseAmount(text(formData, "targetBalance"));
  const thresholdRaw = text(formData, "replenishmentThreshold");
  const threshold = parseAmount(thresholdRaw) ?? (thresholdRaw === "0" ? 0 : null);
  const opening = parseAmount(text(formData, "openingBalance"));
  const custodianIds = [
    ...new Set(
      formData
        .getAll("custodianId")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  const departmentId = text(formData, "departmentId");
  const status = text(formData, "status") || "active";

  if (!name) return { error: "Enter a fund name." };
  if (currency.length !== 3) return { error: "Choose a currency." };
  if (target == null) return { error: "Enter a target float greater than 0." };
  if (threshold == null || threshold < 0) {
    return { error: "Enter a replenishment threshold." };
  }
  if (!["active", "suspended", "closed"].includes(status)) {
    return { error: "Choose a fund status." };
  }

  if (custodianIds.length > 0) {
    const { data: directory } = await supabase.rpc("petty_cash_people");
    const activeIds = new Set(
      ((directory ?? []) as Array<{ id: string; status: string }>)
        .filter((person) => person.status === "active")
        .map((person) => person.id),
    );
    if (custodianIds.some((personId) => !activeIds.has(personId))) {
      return { error: "Choose custodians from active employees." };
    }
  }

  const payload = {
    name,
    description: description || null,
    currency,
    target_balance: target,
    replenishment_threshold: threshold,
    custodian_id: custodianIds[0] ?? null,
    department_id: departmentId || null,
    status,
  };

  if (id) {
    const { error: updateError } = await supabase
      .from("petty_cash_funds")
      .update(payload)
      .eq("id", id);
    if (updateError) return { error: readableError(updateError.message) };
    const custodianError = await replaceFundCustodians(supabase, id, custodianIds);
    if (custodianError) return { error: readableError(custodianError) };
    await audit(supabase, profile.id, {
      entityType: "fund",
      entityId: id,
      action: "fund_updated",
      newValues: payload,
    });
    revalidatePettyCash();
    return { id };
  }

  const openingAmount = opening ?? 0;
  const { data, error: insertError } = await supabase
    .from("petty_cash_funds")
    .insert({
      ...payload,
      opening_balance: openingAmount,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    return { error: readableError(insertError?.message ?? "Unable to create the fund.") };
  }

  const fundId = data.id as string;
  const custodianError = await replaceFundCustodians(supabase, fundId, custodianIds);
  if (custodianError) {
    revalidatePettyCash();
    return { id: fundId, error: readableError(custodianError) };
  }
  await audit(supabase, profile.id, {
    entityType: "fund",
    entityId: fundId,
    action: "fund_created",
    newValues: { ...payload, opening_balance: openingAmount },
  });

  if (openingAmount > 0) {
    const { error: openingError } = await supabase.rpc("post_petty_cash_opening", {
      p_fund_id: fundId,
      p_amount: openingAmount,
      p_transaction_date: new Date().toISOString().slice(0, 10),
      p_description: "Opening balance",
    });
    if (openingError) {
      revalidatePettyCash();
      return { id: fundId, error: readableError(openingError.message) };
    }
  }

  revalidatePettyCash();
  return { id: fundId };
}

async function resolveVendor(
  supabase: NonNullable<Awaited<ReturnType<typeof context>>["supabase"]>,
  vendorId: string,
  newVendorName: string,
): Promise<{ id: string | null; error?: string }> {
  if (newVendorName) {
    const { data, error } = await supabase
      .from("petty_cash_vendors")
      .insert({ name: newVendorName })
      .select("id")
      .single();
    if (error || !data) {
      if (error?.message.includes("duplicate") || error?.message.includes("unique")) {
        return { id: null, error: "A vendor with that name already exists. Choose it from the list." };
      }
      return { id: null, error: readableError(error?.message ?? "Unable to add the vendor.") };
    }
    return { id: data.id as string };
  }
  return { id: vendorId || null };
}

async function attachReceipt(
  supabase: NonNullable<Awaited<ReturnType<typeof context>>["supabase"]>,
  profile: ProfileWithOrg,
  transactionId: string,
  formData: FormData,
): Promise<string | null> {
  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_RECEIPT_BYTES) {
    return "Receipts must be 10 MB or smaller.";
  }
  const mimeType = file.type || "application/octet-stream";
  if (!RECEIPT_MIME_TYPES.has(mimeType)) {
    return "Use a JPG, PNG, or PDF receipt.";
  }

  try {
    const uploaded = await uploadReceipt(supabase, {
      transactionId,
      fileName: file.name,
      mimeType,
      body: file,
    });
    const { error } = await supabase.from("petty_cash_attachments").insert({
      transaction_id: transactionId,
      file_name: file.name,
      file_type: mimeType,
      file_size: file.size,
      storage_key: uploaded.storageKey,
      uploaded_by: profile.id,
    });
    if (error) return readableError(error.message);
    await audit(supabase, profile.id, {
      entityType: "transaction",
      entityId: transactionId,
      action: "receipt_uploaded",
      newValues: { file_name: file.name },
    });
    return null;
  } catch (uploadError) {
    const message = uploadError instanceof Error ? uploadError.message : "Upload failed.";
    return readableError(message);
  }
}

export async function saveTransaction(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to save." };

  const intent = text(formData, "intent");
  const submitting = intent === "submit";
  const id = text(formData, "id");
  const fundId = text(formData, "fundId");
  const typeRaw = text(formData, "transactionType") || "expense";
  const amount = parseAmount(text(formData, "amount"));
  const transactionDate = text(formData, "transactionDate");
  const description = text(formData, "description");
  const categoryId = text(formData, "categoryId");
  const receiptNumber = text(formData, "receiptNumber");
  const reference = text(formData, "reference");
  const notes = text(formData, "notes");
  const exceptionRequested = text(formData, "exceptionRequested") === "true";

  if (!isTransactionType(typeRaw)) return { error: "Choose a transaction type." };
  const transactionType: TransactionType = typeRaw;
  if (!fundId) return { error: "Choose a fund." };
  if (amount == null) return { error: "Amount must be greater than 0." };
  if (!DATE_PATTERN.test(transactionDate)) return { error: "Choose a date." };
  if (!description) return { error: "Add a description." };
  if (transactionType === "expense" && !categoryId) {
    return { error: "Choose a category." };
  }

  const { data: fund, error: fundError } = await supabase
    .from("petty_cash_funds")
    .select("id, status, currency")
    .eq("id", fundId)
    .maybeSingle();

  if (fundError || !fund) return { error: "Choose a fund." };
  if (submitting && fund.status !== "active") {
    const label = fund.status === "suspended" ? "suspended" : "closed";
    return {
      error: `This fund is currently ${label} and cannot accept new transactions.`,
    };
  }

  const loaded = await loadSettings(supabase);
  if (loaded.error || !loaded.settings) return { error: loaded.error ?? "Unable to save." };
  const settings = loaded.settings;

  if (
    submitting &&
    exceedsPettyCashLimit(amount, settings.maxTransactionAmount) &&
    !exceptionRequested
  ) {
    return {
      error: `This transaction exceeds the petty cash limit of ${formatPettyCashMoney(settings.maxTransactionAmount, fund.currency)}. Request an exception or use procurement.`,
    };
  }

  if (
    submitting &&
    exceedsPettyCashLimit(amount, settings.maxTransactionAmount) &&
    exceptionRequested &&
    !settings.allowOverLimitException
  ) {
    return {
      error: `Transactions above ${formatPettyCashMoney(settings.maxTransactionAmount, fund.currency)} are not allowed.`,
    };
  }

  const vendor = await resolveVendor(
    supabase,
    text(formData, "vendorId"),
    text(formData, "newVendorName"),
  );
  if (vendor.error) return { error: vendor.error };

  const payload = {
    fund_id: fundId,
    transaction_type: transactionType,
    direction: directionForType(transactionType),
    amount,
    currency: fund.currency as string,
    transaction_date: transactionDate,
    description,
    category_id: categoryId || null,
    vendor_id: vendor.id,
    receipt_number: receiptNumber || null,
    reference: reference || null,
    notes: notes || null,
    exception_requested: exceptionRequested,
    status: "draft" as const,
  };

  let transactionId = id;
  if (transactionId) {
    const { data: existing, error: existingError } = await supabase
      .from("petty_cash_transactions")
      .select("id, status, created_by")
      .eq("id", transactionId)
      .maybeSingle();
    if (existingError || !existing) return { error: "Transaction not found." };
    if (existing.status !== "draft" && existing.status !== "rejected") {
      return { error: "Only a draft or rejected transaction can be edited." };
    }
    const { error: updateError } = await supabase
      .from("petty_cash_transactions")
      .update(payload)
      .eq("id", transactionId);
    if (updateError) return { error: readableError(updateError.message) };
    await audit(supabase, profile.id, {
      entityType: "transaction",
      entityId: transactionId,
      action: "edited",
      newValues: { description, amount },
    });
  } else {
    const { data, error: insertError } = await supabase
      .from("petty_cash_transactions")
      .insert({ ...payload, created_by: profile.id })
      .select("id")
      .single();
    if (insertError || !data) {
      return { error: readableError(insertError?.message ?? "Unable to save the transaction.") };
    }
    transactionId = data.id as string;
    await audit(supabase, profile.id, {
      entityType: "transaction",
      entityId: transactionId,
      action: "created",
      newValues: { description, amount, transaction_type: transactionType },
    });
  }

  const receiptError = await attachReceipt(supabase, profile, transactionId, formData);
  if (receiptError) {
    revalidatePettyCash(transactionId);
    return { id: transactionId, error: receiptError };
  }

  if (!submitting) {
    revalidatePettyCash(transactionId);
    return { id: transactionId };
  }

  const { count } = await supabase
    .from("petty_cash_attachments")
    .select("id", { count: "exact", head: true })
    .eq("transaction_id", transactionId);

  if (
    receiptRequiredFor(transactionType, amount, settings.receiptRequiredAbove) &&
    (count ?? 0) === 0
  ) {
    revalidatePettyCash(transactionId);
    return {
      id: transactionId,
      error: `Please attach a receipt because receipts are required for expenses above ${formatPettyCashMoney(settings.receiptRequiredAbove, fund.currency)}.`,
    };
  }

  if (
    payload.direction === "out" &&
    !settings.allowNegativeBalance
  ) {
    const { data: posted } = await supabase
      .from("petty_cash_transactions")
      .select("direction, amount, status")
      .eq("fund_id", fundId)
      .eq("status", "posted");
    const available = (posted ?? []).reduce((sum, row) => {
      const value = asMoney(row.amount);
      return sum + (row.direction === "in" ? value : -value);
    }, 0);
    const shortfall = expenseShortfall(roundMoney(available), amount);
    if (shortfall != null) {
      revalidatePettyCash(transactionId);
      return {
        id: transactionId,
        error: `Insufficient petty cash balance. Available: ${formatPettyCashMoney(roundMoney(available), fund.currency)}. Requested: ${formatPettyCashMoney(amount, fund.currency)}.`,
      };
    }
  }

  const { error: pendingError } = await supabase
    .from("petty_cash_transactions")
    .update({ status: "pending_approval" })
    .eq("id", transactionId);

  if (pendingError) {
    revalidatePettyCash(transactionId);
    return { id: transactionId, error: readableError(pendingError.message) };
  }

  await audit(supabase, profile.id, {
    entityType: "transaction",
    entityId: transactionId,
    action: "submitted",
    newValues: { status: "pending_approval", exception_requested: exceptionRequested },
  });

  if (
    shouldAutoPost({
      amount,
      exceptionRequested,
      autoApproveUpTo: settings.autoApproveUpTo,
      maxTransactionAmount: settings.maxTransactionAmount,
    })
  ) {
    const { error: postError } = await supabase.rpc("post_petty_cash_transaction", {
      p_id: transactionId,
    });
    if (postError) {
      await supabase
        .from("petty_cash_transactions")
        .update({ status: "draft" })
        .eq("id", transactionId);
      revalidatePettyCash(transactionId);
      return { id: transactionId, error: readableError(postError.message) };
    }
  }

  revalidatePettyCash(transactionId);
  return { id: transactionId };
}

export async function approveTransaction(
  transactionId: string,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(false);
  if (error || !profile || !supabase) return { error: error ?? "Unable to approve." };

  const { data: existing } = await supabase
    .from("petty_cash_transactions")
    .select("id, status, created_by")
    .eq("id", transactionId)
    .maybeSingle();

  if (!existing) return { error: "Transaction not found." };
  if (existing.status !== "pending_approval") {
    return { error: "Only a transaction waiting for approval can be approved." };
  }

  const loaded = await loadSettings(supabase);
  if (
    existing.created_by === profile.id &&
    loaded.settings &&
    !loaded.settings.allowSelfApproval
  ) {
    return { error: "You cannot approve your own transaction." };
  }

  const { error: postError } = await supabase.rpc("post_petty_cash_transaction", {
    p_id: transactionId,
  });
  if (postError) return { error: readableError(postError.message) };

  revalidatePettyCash(transactionId);
  return { id: transactionId };
}

export async function rejectTransaction(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(false);
  if (error || !profile || !supabase) return { error: error ?? "Unable to reject." };

  const transactionId = text(formData, "id");
  const reason = text(formData, "reason");
  if (!transactionId) return { error: "Transaction not found." };
  if (!reason) return { error: "Add a reason for the rejection." };

  const { data: existing } = await supabase
    .from("petty_cash_transactions")
    .select("id, status, created_by")
    .eq("id", transactionId)
    .maybeSingle();

  if (!existing || existing.status !== "pending_approval") {
    return { error: "Only a transaction waiting for approval can be rejected." };
  }
  if (existing.created_by === profile.id) {
    return { error: "You cannot reject your own transaction." };
  }

  const { error: updateError } = await supabase
    .from("petty_cash_transactions")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", transactionId);

  if (updateError) return { error: readableError(updateError.message) };

  await audit(supabase, profile.id, {
    entityType: "transaction",
    entityId: transactionId,
    action: "rejected",
    newValues: { reason },
  });
  revalidatePettyCash(transactionId);
  return { id: transactionId };
}

export async function voidTransaction(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to void." };

  const transactionId = text(formData, "id");
  const reason = text(formData, "reason");
  if (!transactionId) return { error: "Transaction not found." };

  const { error: voidError } = await supabase.rpc("void_petty_cash_transaction", {
    p_id: transactionId,
    p_reason: reason,
  });
  if (voidError) return { error: readableError(voidError.message) };

  revalidatePettyCash(transactionId);
  return { id: transactionId };
}

export async function deleteDraftTransaction(
  transactionId: string,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to delete." };

  const { data: attachments } = await supabase
    .from("petty_cash_attachments")
    .select("storage_key")
    .eq("transaction_id", transactionId);

  const { error: deleteError } = await supabase
    .from("petty_cash_transactions")
    .delete()
    .eq("id", transactionId)
    .eq("status", "draft")
    .eq("created_by", profile.id);

  if (deleteError) return { error: readableError(deleteError.message) };

  for (const attachment of attachments ?? []) {
    if (typeof attachment.storage_key === "string") {
      await removeReceipt(supabase, attachment.storage_key).catch(() => undefined);
    }
  }

  revalidatePettyCash(transactionId);
  return { id: transactionId };
}

export async function saveReconciliation(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to save." };

  const fundId = text(formData, "fundId");
  const reconciliationDate = text(formData, "reconciliationDate");
  const actual = parseAmount(text(formData, "actualBalance"));
  const actualRaw = text(formData, "actualBalance").replace(/,/g, "");
  const actualAmount =
    actualRaw === "0" || actualRaw === "0.0" || actualRaw === "0.00" ? 0 : actual;
  const reason = text(formData, "reason");
  const notes = text(formData, "notes");

  if (!fundId) return { error: "Choose a fund." };
  if (!DATE_PATTERN.test(reconciliationDate)) return { error: "Choose a date." };
  if (actualAmount == null || actualAmount < 0) {
    return { error: "Enter the physical cash count." };
  }

  const { data: posted } = await supabase
    .from("petty_cash_transactions")
    .select("direction, amount, status")
    .eq("fund_id", fundId)
    .eq("status", "posted");

  const expected = roundMoney(
    (posted ?? []).reduce((sum, row) => {
      const value = asMoney(row.amount);
      return sum + (row.direction === "in" ? value : -value);
    }, 0),
  );
  const variance = roundMoney(actualAmount - expected);
  if (variance !== 0 && !reason) {
    return { error: "Choose a reason when the cash count does not match." };
  }

  const { data, error: insertError } = await supabase
    .from("petty_cash_reconciliations")
    .insert({
      fund_id: fundId,
      reconciliation_date: reconciliationDate,
      expected_balance: expected,
      actual_balance: actualAmount,
      reason: variance === 0 ? null : reason,
      notes: notes || null,
      performed_by: profile.id,
      status: "submitted",
    })
    .select("id")
    .single();

  if (insertError || !data) {
    return { error: readableError(insertError?.message ?? "Unable to save the reconciliation.") };
  }

  await audit(supabase, profile.id, {
    entityType: "reconciliation",
    entityId: data.id as string,
    action: "reconciliation_created",
    newValues: { expected, actual: actualAmount, variance, reason },
  });
  revalidatePettyCash();
  return { id: data.id as string };
}

export async function reviewReconciliation(
  reconciliationId: string,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(false);
  if (error || !profile || !supabase) return { error: error ?? "Unable to review." };

  const { data: existing } = await supabase
    .from("petty_cash_reconciliations")
    .select("id, status, performed_by")
    .eq("id", reconciliationId)
    .maybeSingle();

  if (!existing) return { error: "Reconciliation not found." };
  if (existing.status !== "submitted") {
    return { error: "This reconciliation has already been reviewed." };
  }
  if (existing.performed_by === profile.id) {
    return { error: "Someone else should review this cash count." };
  }

  const { error: updateError } = await supabase
    .from("petty_cash_reconciliations")
    .update({ status: "reviewed", reviewed_by: profile.id })
    .eq("id", reconciliationId);

  if (updateError) return { error: readableError(updateError.message) };

  await audit(supabase, profile.id, {
    entityType: "reconciliation",
    entityId: reconciliationId,
    action: "reconciliation_reviewed",
  });
  revalidatePettyCash();
  return { id: reconciliationId };
}

export async function saveReplenishment(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to save." };

  const fundId = text(formData, "fundId");
  const amount = parseAmount(text(formData, "requestedAmount"));
  const notes = text(formData, "notes");
  if (!fundId) return { error: "Choose a fund." };
  if (amount == null) return { error: "Enter the amount to replenish." };

  const { data: fund } = await supabase
    .from("petty_cash_funds")
    .select("status")
    .eq("id", fundId)
    .maybeSingle();
  if (!fund) return { error: "Choose a fund." };
  if (fund.status !== "active") {
    return { error: "This fund cannot take a replenishment while it is inactive." };
  }

  const { data, error: insertError } = await supabase
    .from("petty_cash_replenishments")
    .insert({
      fund_id: fundId,
      requested_amount: amount,
      notes: notes || null,
      requested_by: profile.id,
      status: "pending_approval",
    })
    .select("id")
    .single();

  if (insertError || !data) {
    return { error: readableError(insertError?.message ?? "Unable to request replenishment.") };
  }

  await audit(supabase, profile.id, {
    entityType: "replenishment",
    entityId: data.id as string,
    action: "replenishment_requested",
    newValues: { amount },
  });
  revalidatePettyCash();
  return { id: data.id as string };
}

export async function decideReplenishment(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(false);
  if (error || !profile || !supabase) return { error: error ?? "Unable to update." };

  const id = text(formData, "id");
  const decision = text(formData, "decision");
  const reason = text(formData, "reason");
  const approvedRaw = text(formData, "approvedAmount");

  const { data: existing } = await supabase
    .from("petty_cash_replenishments")
    .select("id, status, requested_by, requested_amount")
    .eq("id", id)
    .maybeSingle();

  if (!existing || existing.status !== "pending_approval") {
    return { error: "Only a replenishment waiting for approval can be updated." };
  }

  if (decision === "reject") {
    if (!reason) return { error: "Add a reason for the rejection." };
    if (existing.requested_by === profile.id) {
      return { error: "You cannot reject your own replenishment." };
    }
    const { error: updateError } = await supabase
      .from("petty_cash_replenishments")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", id);
    if (updateError) return { error: readableError(updateError.message) };
    await audit(supabase, profile.id, {
      entityType: "replenishment",
      entityId: id,
      action: "replenishment_rejected",
      newValues: { reason },
    });
    revalidatePettyCash();
    return { id };
  }

  const approvedAmount = approvedRaw
    ? parseAmount(approvedRaw)
    : asMoney(existing.requested_amount);
  if (approvedAmount == null) return { error: "Enter an approved amount." };

  const { error: updateError } = await supabase
    .from("petty_cash_replenishments")
    .update({
      status: "approved",
      approved_amount: approvedAmount,
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) return { error: readableError(updateError.message) };
  await audit(supabase, profile.id, {
    entityType: "replenishment",
    entityId: id,
    action: "replenishment_approved",
    newValues: { approved_amount: approvedAmount },
  });
  revalidatePettyCash();
  return { id };
}

export async function completeReplenishment(
  replenishmentId: string,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to complete." };

  const { data, error: completeError } = await supabase.rpc(
    "complete_petty_cash_replenishment",
    { p_id: replenishmentId },
  );
  if (completeError) return { error: readableError(completeError.message) };

  revalidatePettyCash(typeof data === "string" ? data : undefined);
  return { id: replenishmentId };
}

export async function updatePettyCashSettings(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to save." };

  const currency = text(formData, "defaultCurrency").toUpperCase();
  const receiptRequiredAbove = parseAmount(text(formData, "receiptRequiredAbove"));
  const receiptRaw = text(formData, "receiptRequiredAbove").replace(/,/g, "");
  const receiptThreshold =
    receiptRaw === "0" || receiptRaw === "0.00" ? 0 : receiptRequiredAbove;
  const maxTransactionAmount = parseAmount(text(formData, "maxTransactionAmount"));
  const autoApproveUpToRaw = text(formData, "autoApproveUpTo").replace(/,/g, "");
  const autoApproveParsed = parseAmount(text(formData, "autoApproveUpTo"));
  const autoApproveUpTo =
    autoApproveUpToRaw === "0" || autoApproveUpToRaw === "0.00"
      ? 0
      : autoApproveParsed;
  const defaultTargetFloat = parseAmount(text(formData, "defaultTargetFloat"));
  const thresholdRaw = text(formData, "defaultReplenishmentThreshold").replace(/,/g, "");
  const thresholdParsed = parseAmount(text(formData, "defaultReplenishmentThreshold"));
  const defaultReplenishmentThreshold =
    thresholdRaw === "0" || thresholdRaw === "0.00" ? 0 : thresholdParsed;

  if (currency.length !== 3) return { error: "Choose a default currency." };
  if (receiptThreshold == null || receiptThreshold < 0) {
    return { error: "Enter the receipt threshold." };
  }
  if (maxTransactionAmount == null) {
    return { error: "Enter the maximum transaction amount." };
  }
  if (autoApproveUpTo == null || autoApproveUpTo < 0) {
    return { error: "Enter the auto-approve limit." };
  }
  if (defaultTargetFloat == null) return { error: "Enter the default target float." };
  if (defaultReplenishmentThreshold == null) {
    return { error: "Enter the default replenishment threshold." };
  }

  const payload = {
    default_currency: currency,
    receipt_required_above: receiptThreshold,
    max_transaction_amount: maxTransactionAmount,
    allow_over_limit_exception: text(formData, "allowOverLimitException") === "true",
    auto_approve_up_to: autoApproveUpTo,
    allow_self_approval: text(formData, "allowSelfApproval") === "true",
    allow_negative_balance: text(formData, "allowNegativeBalance") === "true",
    default_target_float: defaultTargetFloat,
    default_replenishment_threshold: defaultReplenishmentThreshold,
  };

  const { error: updateError } = await supabase
    .from("petty_cash_settings")
    .update(payload)
    .eq("id", true);

  if (updateError) return { error: readableError(updateError.message) };
  revalidatePettyCash();
  return {};
}

export async function saveCategory(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to save." };

  const name = text(formData, "name");
  const parentId = text(formData, "parentId");
  if (!name) return { error: "Enter a category name." };

  const { data, error: insertError } = await supabase
    .from("petty_cash_categories")
    .insert({ name, parent_id: parentId || null })
    .select("id")
    .single();

  if (insertError || !data) {
    return { error: readableError(insertError?.message ?? "Unable to add the category.") };
  }

  await audit(supabase, profile.id, {
    entityType: "category",
    entityId: data.id as string,
    action: "category_created",
    newValues: { name },
  });
  revalidatePettyCash();
  return { id: data.id as string };
}

export async function setCategoryActive(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to save." };

  const id = text(formData, "id");
  const isActive = text(formData, "isActive") === "true";
  const { error: updateError } = await supabase
    .from("petty_cash_categories")
    .update({ is_active: isActive })
    .eq("id", id);
  if (updateError) return { error: readableError(updateError.message) };

  await audit(supabase, profile.id, {
    entityType: "category",
    entityId: id,
    action: isActive ? "category_activated" : "category_deactivated",
  });
  revalidatePettyCash();
  return { id };
}

export async function saveVendor(
  formData: FormData,
): Promise<PettyCashActionResult> {
  const { error, profile, supabase } = await context(true);
  if (error || !profile || !supabase) return { error: error ?? "Unable to save." };

  const name = text(formData, "name");
  if (!name) return { error: "Enter a vendor name." };

  const { data, error: insertError } = await supabase
    .from("petty_cash_vendors")
    .insert({
      name,
      phone: text(formData, "phone") || null,
      email: text(formData, "email") || null,
      notes: text(formData, "notes") || null,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    if (insertError?.message.includes("unique") || insertError?.message.includes("duplicate")) {
      return { error: "A vendor with that name already exists." };
    }
    return { error: readableError(insertError?.message ?? "Unable to add the vendor.") };
  }

  await audit(supabase, profile.id, {
    entityType: "vendor",
    entityId: data.id as string,
    action: "vendor_created",
    newValues: { name },
  });
  revalidatePettyCash();
  return { id: data.id as string };
}
