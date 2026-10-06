import type { SupabaseClient } from "@supabase/supabase-js";

export const PETTY_CASH_BUCKET = "petty-cash";

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export const RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop()?.trim() || "receipt";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export function receiptStoragePath(
  transactionId: string,
  fileName: string,
): string {
  return `receipts/${transactionId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

export async function uploadReceipt(
  supabase: SupabaseClient,
  input: {
    transactionId: string;
    fileName: string;
    mimeType: string;
    body: File;
  },
): Promise<{ storageKey: string }> {
  const storageKey = receiptStoragePath(input.transactionId, input.fileName);
  const { error } = await supabase.storage
    .from(PETTY_CASH_BUCKET)
    .upload(storageKey, input.body, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return { storageKey };
}

export async function removeReceipt(
  supabase: SupabaseClient,
  storageKey: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(PETTY_CASH_BUCKET)
    .remove([storageKey]);

  if (error) {
    throw new Error(error.message);
  }
}
