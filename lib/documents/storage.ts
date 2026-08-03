import type { SupabaseClient } from "@supabase/supabase-js";

export const DOCUMENTS_BUCKET = "documents";

export interface StoredDocumentUpload {
  storagePath: string;
  fileUrl: string | null;
}

function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop()?.trim() || "document";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export function employeeDocumentPath(
  employeeId: string,
  fileName: string,
): string {
  const safeName = sanitizeFileName(fileName);
  return `employees/${employeeId}/${crypto.randomUUID()}-${safeName}`;
}

export async function uploadEmployeeDocument(
  supabase: SupabaseClient,
  input: {
    employeeId: string;
    fileName: string;
    mimeType: string;
    body: Buffer | ArrayBuffer | Blob | File;
  },
): Promise<StoredDocumentUpload> {
  const storagePath = employeeDocumentPath(input.employeeId, input.fileName);

  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, input.body, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  // Private bucket - clients open files via /api/documents/[id].
  // Keep a public-style URL only as a fallback reference for tooling.
  const { data } = supabase.storage
    .from(DOCUMENTS_BUCKET)
    .getPublicUrl(storagePath);

  return {
    storagePath,
    fileUrl: data.publicUrl,
  };
}

export async function removeEmployeeDocument(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createDocumentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
