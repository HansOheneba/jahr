"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALL_UPLOAD_KINDS,
  EMPLOYEE_UPLOAD_KINDS,
  MAX_DOCUMENT_BYTES,
  defaultTitleForKind,
  isDocumentKind,
} from "@/lib/documents/kinds";
import {
  removeEmployeeDocument,
  uploadEmployeeDocument,
} from "@/lib/documents/storage";
import { isOrgAdmin } from "@/lib/types/database";
import type { DocumentKind } from "@/lib/types/employee";
import { createClient } from "@/utils/supabase/server";

export interface DocumentActionResult {
  error?: string;
  success?: boolean;
}

function revalidateDocumentPaths(employeeId: string) {
  revalidatePath("/documents");
  revalidatePath("/settings");
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/dashboard");
}

function allowedKindsForUploader(isAdmin: boolean): readonly DocumentKind[] {
  return isAdmin ? ALL_UPLOAD_KINDS : EMPLOYEE_UPLOAD_KINDS;
}

export async function uploadDocument(
  formData: FormData,
): Promise<DocumentActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return { error: "You must be signed in to upload documents." };
  }

  const admin = isOrgAdmin(viewer);
  const employeeIdRaw = formData.get("employeeId");
  const employeeId =
    typeof employeeIdRaw === "string" && employeeIdRaw.length > 0
      ? employeeIdRaw
      : viewer.id;

  if (employeeId !== viewer.id && !admin) {
    return { error: "Only HR can upload documents for other employees." };
  }

  const kindRaw = formData.get("kind");
  if (typeof kindRaw !== "string" || !isDocumentKind(kindRaw)) {
    return { error: "Choose a valid document type." };
  }

  const kind = kindRaw;
  const allowedKinds = allowedKindsForUploader(admin);
  if (!(allowedKinds as readonly string[]).includes(kind)) {
    return { error: "You cannot upload that document type." };
  }

  const titleRaw = formData.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim().length > 0
      ? titleRaw.trim()
      : defaultTitleForKind(kind);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return { error: "Files must be 10 MB or smaller." };
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) {
    return {
      error: "Use a PDF, Word document, or image (JPG, PNG, WebP).",
    };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let uploaded: Awaited<ReturnType<typeof uploadEmployeeDocument>>;
  try {
    uploaded = await uploadEmployeeDocument(supabase, {
      employeeId,
      fileName: file.name,
      mimeType,
      body: file,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload to storage failed.";
    return { error: message };
  }

  const { data: inserted, error } = await supabase
    .from("documents")
    .insert({
      employee_id: employeeId,
      kind,
      title,
      file_url: uploaded.fileUrl,
      file_name: file.name,
      mime_type: mimeType,
      storage_path: uploaded.storagePath,
      uploaded_by: viewer.id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    try {
      await removeEmployeeDocument(supabase, uploaded.storagePath);
    } catch {
      // Best-effort cleanup; surface the DB error below.
    }
    return { error: error?.message ?? "Could not save the document." };
  }

  await supabase.from("audit_logs").insert({
    actor_id: viewer.id,
    subject_id: employeeId,
    action: "uploaded_document",
    metadata: {
      document_id: inserted.id,
      kind,
      title,
      file_name: file.name,
      storage_path: uploaded.storagePath,
    },
  });

  revalidateDocumentPaths(employeeId);
  return { success: true };
}

export async function deleteDocument(
  documentId: string,
): Promise<DocumentActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return { error: "You must be signed in to delete documents." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("id, employee_id, storage_path, uploaded_by")
    .eq("id", documentId)
    .maybeSingle();

  if (fetchError || !document) {
    return { error: "Document not found." };
  }

  const admin = isOrgAdmin(viewer);
  const ownsDocument = document.employee_id === viewer.id;
  if (!admin && !ownsDocument) {
    return { error: "You cannot delete this document." };
  }

  // Employees may only remove their own personal uploads; HR can remove any.
  if (!admin && document.uploaded_by && document.uploaded_by !== viewer.id) {
    return { error: "Only HR can remove documents uploaded by the company." };
  }

  if (document.storage_path) {
    try {
      await removeEmployeeDocument(supabase, document.storage_path);
    } catch {
      // Continue - orphaned storage objects can be cleaned up later.
    }
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidateDocumentPaths(document.employee_id);
  return { success: true };
}
